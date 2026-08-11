import { db, effects, itemsEffects, scenariosRows, scenariosRowsUnits, unitsItems } from "@qd/db";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, exists, notExists, type SQL } from "drizzle-orm";
import { z } from "zod";
import { gmProcedure, router } from "../../trpc";
import { throwDeleteConflict, throwUniqueNameConflict } from "./crud-errors";
import { toPaginatedResult } from "./pagination";
import {
  createListInputSchema,
  type EntityListLinkageFilter,
  entityListLinkageFilterSchema,
  idSchema,
} from "./shared";

const effectListInput = createListInputSchema(
  ["name", "timingType", "effectType"],
  { sortBy: "name" },
  entityListLinkageFilterSchema,
);

const nullableNumber = z.number().nullable().default(null);
const nullablePositiveInteger = z.number().int().positive().nullable().default(null);

const effectInputShape = {
  name: z.string().trim().min(1),
  timingType: z.enum(["instant", "interval"]),
  triggerEveryActions: nullablePositiveInteger,
  triggerCount: nullablePositiveInteger,
  effectType: z.enum(["buff", "debuff", "healing", "damage"]),
  lastsForActions: nullablePositiveInteger,
  meleeDmg: nullableNumber,
  health: nullableNumber,
  mana: z.number().finite().nullable().default(null),
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

const effectInputBaseSchema = z.object(effectInputShape).strict();

const EFFECT_STAT_FIELDS = [
  "health",
  "mana",
  "meleeDmg",
  "rangedDmg",
  "manaRegen",
  "spellDmg",
  "speed",
  "dodge",
  "criticalChance",
] as const;

type EffectTimingInput = z.infer<typeof effectInputBaseSchema>;
type EffectTimingStatusInput = Pick<
  EffectTimingInput,
  | "timingType"
  | "triggerEveryActions"
  | "triggerCount"
  | "lastsForActions"
  | "effectType"
  | (typeof EFFECT_STAT_FIELDS)[number]
>;

function needsTimingConfiguration(input: EffectTimingStatusInput): boolean {
  if (input.timingType === "interval") {
    return input.triggerEveryActions === null || input.triggerCount === null;
  }

  const hasModifier =
    (input.effectType === "buff" || input.effectType === "debuff") &&
    EFFECT_STAT_FIELDS.some((field) => input[field] !== null);
  return hasModifier && input.lastsForActions === null;
}

function withTimingConfigurationStatus<T extends EffectTimingStatusInput>(effect: T) {
  return {
    ...effect,
    needsTimingConfiguration: needsTimingConfiguration(effect),
  };
}

function validateTimingFields(input: EffectTimingInput, ctx: z.RefinementCtx) {
  if (input.timingType === "interval") {
    if (input.triggerEveryActions === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["triggerEveryActions"],
        message: "Trigger every actions is required for interval timing.",
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

  const hasModifier =
    (input.effectType === "buff" || input.effectType === "debuff") &&
    EFFECT_STAT_FIELDS.some((field) => input[field] !== null);
  if (hasModifier && input.lastsForActions === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["lastsForActions"],
      message: "Lasts for actions is required for stat buffs and debuffs.",
    });
  }
}

const effectInputSchema = effectInputBaseSchema.superRefine(validateTimingFields);

function normalizeEffectInput<T extends z.infer<typeof effectInputSchema>>(input: T): T {
  return {
    ...input,
    name: input.name.trim(),
    triggerEveryActions: input.timingType === "instant" ? null : input.triggerEveryActions,
    triggerCount: input.timingType === "instant" ? null : input.triggerCount,
  };
}

function buildEffectLinkageCondition(filter: EntityListLinkageFilter): SQL | undefined {
  if (filter.mode === "all") {
    return undefined;
  }

  if (filter.mode === "scenario") {
    return exists(
      db
        .select({ id: itemsEffects.id })
        .from(itemsEffects)
        .innerJoin(unitsItems, eq(unitsItems.itemId, itemsEffects.itemId))
        .innerJoin(scenariosRowsUnits, eq(scenariosRowsUnits.unitId, unitsItems.unitId))
        .innerJoin(scenariosRows, eq(scenariosRowsUnits.rowId, scenariosRows.id))
        .where(
          and(
            eq(itemsEffects.effectTemplateId, effects.id),
            eq(scenariosRows.scenarioId, filter.scenarioId),
          ),
        ),
    );
  }

  const linkedEffectSubquery = db
    .select({ id: itemsEffects.id })
    .from(itemsEffects)
    .where(eq(itemsEffects.effectTemplateId, effects.id));

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
        triggerEveryActions: effects.triggerEveryActions,
        triggerCount: effects.triggerCount,
        effectType: effects.effectType,
        lastsForActions: effects.lastsForActions,
        meleeDmg: effects.meleeDmg,
        health: effects.health,
        mana: effects.mana,
        rangedDmg: effects.rangedDmg,
        manaRegen: effects.manaRegen,
        spellDmg: effects.spellDmg,
        speed: effects.speed,
        dodge: effects.dodge,
        criticalChance: effects.criticalChance,
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

    return toPaginatedResult(
      items.map(withTimingConfigurationStatus),
      countResult,
      input.page,
      input.limit,
    );
  }),

  get: gmProcedure.input(z.object({ id: idSchema })).query(async ({ input }) => {
    const [effect] = await db.select().from(effects).where(eq(effects.id, input.id));

    if (!effect) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Effect not found" });
    }

    return withTimingConfigurationStatus(effect);
  }),

  create: gmProcedure.input(effectInputSchema).mutation(async ({ input }) => {
    try {
      const [created] = await db.insert(effects).values(normalizeEffectInput(input)).returning();
      if (!created) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Effect was not created." });
      }
      return withTimingConfigurationStatus(created);
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throwUniqueNameConflict(error, "effect");
    }
  }),

  update: gmProcedure
    .input(
      z
        .object({ id: idSchema })
        .merge(effectInputBaseSchema)
        .strict()
        .superRefine(validateTimingFields),
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

        return withTimingConfigurationStatus(updated);
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throwUniqueNameConflict(error, "effect");
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

      throwDeleteConflict(error, "Cannot delete effect while it is linked to one or more items.");
    }
  }),
});
