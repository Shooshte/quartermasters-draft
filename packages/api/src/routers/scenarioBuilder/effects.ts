import {
  db,
  effects,
  itemsSpells,
  scenariosRows,
  scenariosRowsUnits,
  spellsEffects,
  unitsItems,
} from "@qd/db";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, exists, notExists, type SQL } from "drizzle-orm";
import { z } from "zod";
import { gmProcedure, router } from "../../trpc";
import {
  entityListLinkageFilterSchema,
  type EntityListLinkageFilter,
  findDbError,
  idSchema,
  listInputSchema,
} from "./shared";

const effectListInput = listInputSchema
  .extend({
    limit: z.number().int().min(1).max(500).default(20),
    sortBy: z.enum(["name", "timingType", "effectType"]).default("name"),
    sortDir: z.enum(["asc", "desc"]).default("asc"),
    linkageFilter: entityListLinkageFilterSchema,
  })
  .prefault({});

const nullableNumber = z.number().nullable().default(null);
const nullablePositiveInteger = z.number().int().positive().nullable().default(null);

const effectInputShape = {
  name: z.string().trim().min(1),
  timingType: z.enum(["instant", "interval"]),
  intervalMs: nullablePositiveInteger,
  triggerCount: nullablePositiveInteger,
  effectType: z.enum(["buff", "debuff", "healing", "damage"]),
  durationMs: nullablePositiveInteger,
  meleeDmg: nullableNumber,
  health: nullableNumber,
  rangedDmg: nullableNumber,
  manaRegen: nullableNumber,
  spellDmg: nullableNumber,
  speed: nullableNumber,
  dodge: nullableNumber,
  criticalChance: nullableNumber,
  directHealing: nullableNumber,
  directMeleeDmg: nullableNumber,
  directRangedDmg: nullableNumber,
  directSpellDmg: nullableNumber,
} satisfies z.ZodRawShape;

const effectInputBaseSchema = z.object(effectInputShape);

function validateTimingFields(input: z.infer<typeof effectInputBaseSchema>, ctx: z.RefinementCtx) {
  if (input.timingType === "interval") {
    if (input.intervalMs === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["intervalMs"],
        message: "Interval ms is required for interval timing.",
      });
    }
    if (input.triggerCount === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["triggerCount"],
        message: "Trigger count is required for interval timing.",
      });
    }
  }

  if (
    input.timingType === "instant" &&
    (input.intervalMs !== null || input.triggerCount !== null)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["timingType"],
      message: "Instant timing cannot include interval fields.",
    });
  }
}

const effectInputSchema = effectInputBaseSchema.superRefine(validateTimingFields);

function normalizeEffectInput<T extends z.infer<typeof effectInputSchema>>(input: T): T {
  return {
    ...input,
    name: input.name.trim(),
    intervalMs: input.timingType === "instant" ? null : input.intervalMs,
    triggerCount: input.timingType === "instant" ? null : input.triggerCount,
  };
}

function maybeThrowConflict(error: unknown): never {
  const dbError = findDbError(error);

  if (dbError?.code === "23505") {
    throw new TRPCError({ code: "CONFLICT", message: "An effect with this name already exists." });
  }
  throw error;
}

function maybeThrowDeleteConflict(error: unknown): never {
  const dbError = findDbError(error);

  if (dbError?.code === "23503") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Cannot delete effect while it is linked to one or more spells.",
    });
  }

  throw error;
}

function buildEffectLinkageCondition(filter: EntityListLinkageFilter): SQL | undefined {
  if (filter.mode === "all") {
    return undefined;
  }

  if (filter.mode === "scenario") {
    return exists(
      db
        .select({ id: spellsEffects.id })
        .from(spellsEffects)
        .innerJoin(itemsSpells, eq(itemsSpells.spellId, spellsEffects.spellId))
        .innerJoin(unitsItems, eq(unitsItems.itemId, itemsSpells.itemId))
        .innerJoin(scenariosRowsUnits, eq(scenariosRowsUnits.unitId, unitsItems.unitId))
        .innerJoin(scenariosRows, eq(scenariosRowsUnits.rowId, scenariosRows.id))
        .where(
          and(
            eq(spellsEffects.effectTemplateId, effects.id),
            eq(scenariosRows.scenarioId, filter.scenarioId),
          ),
        ),
    );
  }

  const linkedEffectSubquery = db
    .select({ id: spellsEffects.id })
    .from(spellsEffects)
    .where(eq(spellsEffects.effectTemplateId, effects.id));

  return filter.mode === "linked" ? exists(linkedEffectSubquery) : notExists(linkedEffectSubquery);
}

export const effectsRouter = router({
  list: gmProcedure.input(effectListInput).query(async ({ input }) => {
    const offset = (input.page - 1) * input.limit;
    const sortColumnMap = {
      name: effects.name,
      timingType: effects.timingType,
      effectType: effects.effectType,
    } as const;
    const sortColumn = sortColumnMap[input.sortBy];
    const sortFn = input.sortDir === "desc" ? desc : asc;
    const orderClauses =
      input.sortBy === "name" ? [sortFn(sortColumn)] : [sortFn(sortColumn), asc(effects.name)];
    const linkageCondition = buildEffectLinkageCondition(input.linkageFilter);
    const rowsQuery = db
      .select({
        id: effects.id,
        name: effects.name,
        timingType: effects.timingType,
        effectType: effects.effectType,
        updatedAt: effects.updatedAt,
      })
      .from(effects);
    const countQuery = db.select({ count: count() }).from(effects);

    const [items, countResult] = await Promise.all([
      (linkageCondition ? rowsQuery.where(linkageCondition) : rowsQuery)
        .orderBy(...orderClauses)
        .limit(input.limit)
        .offset(offset),
      linkageCondition ? countQuery.where(linkageCondition) : countQuery,
    ]);

    return {
      items,
      page: input.page,
      limit: input.limit,
      totalCount: countResult[0].count,
    };
  }),

  get: gmProcedure.input(z.object({ id: idSchema })).query(async ({ input }) => {
    const [effect] = await db.select().from(effects).where(eq(effects.id, input.id));

    if (!effect) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Effect not found" });
    }

    return effect;
  }),

  create: gmProcedure.input(effectInputSchema).mutation(async ({ input }) => {
    try {
      const [created] = await db.insert(effects).values(normalizeEffectInput(input)).returning();
      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Effect was not created." });
      }
      return created;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      maybeThrowConflict(error);
    }
  }),

  update: gmProcedure
    .input(
      z.object({ id: idSchema }).merge(effectInputBaseSchema).superRefine(validateTimingFields),
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      try {
        const [updated] = await db
          .update(effects)
          .set(normalizeEffectInput(rest))
          .where(eq(effects.id, id))
          .returning();

        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Effect not found" });
        }

        return updated;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        maybeThrowConflict(error);
      }
    }),

  delete: gmProcedure.input(z.object({ id: idSchema })).mutation(async ({ input }) => {
    try {
      const deleted = await db
        .delete(effects)
        .where(eq(effects.id, input.id))
        .returning({ id: effects.id });
      if (deleted.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Effect not found" });
      }
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      maybeThrowDeleteConflict(error);
    }
  }),
});
