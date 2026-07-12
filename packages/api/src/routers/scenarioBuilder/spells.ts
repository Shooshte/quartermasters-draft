import {
  db,
  itemsSpells,
  scenariosRows,
  scenariosRowsUnits,
  spells,
  spellsAllowedRows,
  spellsEffects,
  unitsItems,
} from "@qd/db";
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

const spellListInput = createListInputSchema(
  ["name", "targetPolicy", "updatedAt"],
  { sortBy: "name" },
  entityListLinkageFilterSchema,
);

const allowedRowTypeEnum = z.enum(["support", "ranged", "melee", "tank"]);

const spellInputFields = z.object({
  name: z.string().trim().min(1),
  description: z.string().nullable().optional().default(null),
  targetPolicy: z.enum(["highest_health", "lowest_health", "highest_damage", "random"]),
  effectIds: z.array(idSchema).min(1, "At least one linked effect is required"),
  targetRowCount: z.number().int().min(1).max(4).default(1),
  maxTargetsPerRow: z.number().int().min(1).nullable().default(1),
  targetOnlyAdjacent: z.boolean().default(false),
  allowedRowTypes: z.array(allowedRowTypeEnum).default([]),
});

function addTargetingRefinements<T extends z.ZodType<z.infer<typeof spellInputFields>>>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const d = data as z.infer<typeof spellInputFields>;
    if (d.targetOnlyAdjacent && d.maxTargetsPerRow === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Target only adjacent cannot be true when targeting whole row",
        path: ["targetOnlyAdjacent"],
      });
    }
    if (d.targetOnlyAdjacent && d.maxTargetsPerRow !== null && d.maxTargetsPerRow < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Target only adjacent needs at least 2 targets per row",
        path: ["targetOnlyAdjacent"],
      });
    }
  });
}

const spellInputBaseSchema = addTargetingRefinements(spellInputFields);

function normalizeSpellInput(input: z.infer<typeof spellInputBaseSchema>) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    targetPolicy: input.targetPolicy,
    effectIds: input.effectIds,
    targetRowCount: input.targetRowCount,
    maxTargetsPerRow: input.maxTargetsPerRow,
    targetOnlyAdjacent: input.targetOnlyAdjacent,
    allowedRowTypes: input.allowedRowTypes,
  };
}

function buildSpellEffectRows(spellId: string, effectIds: string[]) {
  return effectIds.map((effectTemplateId, index) => ({
    spellId,
    effectTemplateId,
    sequenceOrder: index + 1,
  }));
}

type SpellEffectsTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function insertSpellEffects(
  tx: SpellEffectsTransaction,
  spellId: string,
  effectIds: string[],
) {
  await tx.insert(spellsEffects).values(buildSpellEffectRows(spellId, effectIds));
}

async function insertSpellAllowedRows(
  tx: SpellEffectsTransaction,
  spellId: string,
  rowTypes: string[],
) {
  if (rowTypes.length === 0) return;
  await tx.insert(spellsAllowedRows).values(
    rowTypes.map((rowType) => ({
      spellId,
      rowType: rowType as "support" | "ranged" | "melee" | "tank",
    })),
  );
}

function buildSpellLinkageCondition(filter: EntityListLinkageFilter): SQL | undefined {
  if (filter.mode === "all") {
    return undefined;
  }

  if (filter.mode === "scenario") {
    return exists(
      db
        .select({ id: itemsSpells.id })
        .from(itemsSpells)
        .innerJoin(unitsItems, eq(unitsItems.itemId, itemsSpells.itemId))
        .innerJoin(scenariosRowsUnits, eq(scenariosRowsUnits.unitId, unitsItems.unitId))
        .innerJoin(scenariosRows, eq(scenariosRowsUnits.rowId, scenariosRows.id))
        .where(
          and(eq(itemsSpells.spellId, spells.id), eq(scenariosRows.scenarioId, filter.scenarioId)),
        ),
    );
  }

  const linkedSpellSubquery = db
    .select({ id: itemsSpells.id })
    .from(itemsSpells)
    .where(eq(itemsSpells.spellId, spells.id));

  return filter.mode === "linked" ? exists(linkedSpellSubquery) : notExists(linkedSpellSubquery);
}

export const spellsRouter = router({
  list: gmProcedure.input(spellListInput).query(async ({ input }) => {
    const offset = (input.page - 1) * input.limit;
    const sortColumnMap = {
      name: spells.name,
      targetPolicy: spells.targetPolicy,
      updatedAt: spells.updatedAt,
    } as const;
    const sortColumn = sortColumnMap[input.sortBy];
    const sortFn = input.sortDir === "desc" ? desc : asc;
    const orderClauses =
      input.sortBy === "name" ? [sortFn(sortColumn)] : [sortFn(sortColumn), asc(spells.name)];
    const linkageCondition = buildSpellLinkageCondition(input.linkageFilter);
    const rowsQuery = db
      .select({
        id: spells.id,
        name: spells.name,
        description: spells.description,
        targetPolicy: spells.targetPolicy,
        targetRowCount: spells.targetRowCount,
        maxTargetsPerRow: spells.maxTargetsPerRow,
        targetOnlyAdjacent: spells.targetOnlyAdjacent,
        updatedAt: spells.updatedAt,
      })
      .from(spells);
    const countQuery = db.select({ count: count() }).from(spells);

    const [items, countResult] = await Promise.all([
      (linkageCondition ? rowsQuery.where(linkageCondition) : rowsQuery)
        .orderBy(...orderClauses)
        .limit(input.limit)
        .offset(offset),
      linkageCondition ? countQuery.where(linkageCondition) : countQuery,
    ]);

    return toPaginatedResult(items, countResult, input.page, input.limit);
  }),

  get: gmProcedure.input(z.object({ id: idSchema })).query(async ({ input }) => {
    const [spell] = await db.select().from(spells).where(eq(spells.id, input.id));

    if (!spell) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Spell not found" });
    }

    const effectLinks = await db
      .select({ effectTemplateId: spellsEffects.effectTemplateId })
      .from(spellsEffects)
      .where(eq(spellsEffects.spellId, input.id))
      .orderBy(asc(spellsEffects.sequenceOrder));

    const allowedRows = await db
      .select({ rowType: spellsAllowedRows.rowType })
      .from(spellsAllowedRows)
      .where(eq(spellsAllowedRows.spellId, input.id));

    return {
      ...spell,
      effectIds: effectLinks.map((e) => e.effectTemplateId),
      allowedRowTypes: allowedRows.map((r) => r.rowType),
    };
  }),

  create: gmProcedure.input(spellInputBaseSchema).mutation(async ({ input }) => {
    const normalized = normalizeSpellInput(input);

    try {
      return await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(spells)
          .values({
            name: normalized.name,
            description: normalized.description,
            targetPolicy: normalized.targetPolicy,
            targetRowCount: normalized.targetRowCount,
            maxTargetsPerRow: normalized.maxTargetsPerRow,
            targetOnlyAdjacent: normalized.targetOnlyAdjacent,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Spell was not created.",
          });
        }

        await insertSpellEffects(tx, created.id, normalized.effectIds);
        await insertSpellAllowedRows(tx, created.id, normalized.allowedRowTypes);

        return {
          ...created,
          effectIds: normalized.effectIds,
          allowedRowTypes: normalized.allowedRowTypes,
        };
      });
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      throwUniqueNameConflict(error, "spell");
    }
  }),

  update: gmProcedure
    .input(addTargetingRefinements(z.object({ id: idSchema }).merge(spellInputFields)))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const normalized = normalizeSpellInput(rest);

      try {
        return await db.transaction(async (tx) => {
          const [updated] = await tx
            .update(spells)
            .set({
              name: normalized.name,
              description: normalized.description,
              targetPolicy: normalized.targetPolicy,
              targetRowCount: normalized.targetRowCount,
              maxTargetsPerRow: normalized.maxTargetsPerRow,
              targetOnlyAdjacent: normalized.targetOnlyAdjacent,
            })
            .where(eq(spells.id, id))
            .returning();

          if (!updated) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Spell not found" });
          }

          await tx.delete(spellsEffects).where(eq(spellsEffects.spellId, id));
          await insertSpellEffects(tx, id, normalized.effectIds);

          await tx.delete(spellsAllowedRows).where(eq(spellsAllowedRows.spellId, id));
          await insertSpellAllowedRows(tx, id, normalized.allowedRowTypes);

          return {
            ...updated,
            effectIds: normalized.effectIds,
            allowedRowTypes: normalized.allowedRowTypes,
          };
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throwUniqueNameConflict(error, "spell");
      }
    }),

  delete: gmProcedure.input(z.object({ id: idSchema })).mutation(async ({ input }) => {
    try {
      const deleted = await db
        .delete(spells)
        .where(eq(spells.id, input.id))
        .returning({ id: spells.id });
      if (deleted.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Spell not found" });
      }
      return { success: true };
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      throwDeleteConflict(error, "Cannot delete spell while it is linked to one or more items.", [
        "23503",
        "23514",
      ]);
    }
  }),
});
