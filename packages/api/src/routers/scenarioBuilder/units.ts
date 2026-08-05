import { db, scenariosRows, scenariosRowsUnits, units, unitsAllowedRows, unitsItems } from "@qd/db";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, exists, notExists, type SQL } from "drizzle-orm";
import { z } from "zod";
import { gmProcedure, router } from "../../trpc";
import { throwUniqueNameConflict } from "./crud-errors";
import { toPaginatedResult } from "./pagination";
import {
  createListInputSchema,
  type EntityListLinkageFilter,
  entityListLinkageFilterSchema,
  idSchema,
} from "./shared";

const unitListInput = createListInputSchema(
  ["name", "updatedAt"],
  { sortBy: "name" },
  entityListLinkageFilterSchema,
);

const allowedRowTypeEnum = z.enum(["support", "ranged", "melee", "tank"]);

const unitInputFields = z.object({
  name: z.string().trim().min(1),
  meleeDmg: z.number(),
  health: z.number(),
  mana: z.number().finite().min(0),
  rangedDmg: z.number(),
  manaRegen: z.number(),
  spellDmg: z.number(),
  speed: z.number(),
  dodge: z.number(),
  criticalChance: z.number(),
  itemIds: z.array(idSchema),
  targetSide: z.enum(["allies", "enemies", "self"]).default("enemies"),
  targetPolicy: z
    .enum(["highest_health", "lowest_health", "highest_damage", "random", "self"])
    .default("highest_health"),
  targetRowCount: z.number().int().min(1).max(4).default(1),
  maxTargetsPerRow: z.number().int().min(1).nullable().default(1),
  targetOnlyAdjacent: z.boolean().default(false),
  allowedRowTypes: z.array(allowedRowTypeEnum).default([]),
});

function validateTargetingFields(input: z.infer<typeof unitInputFields>, ctx: z.RefinementCtx) {
  if (input.targetOnlyAdjacent && input.maxTargetsPerRow === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Target only adjacent cannot be true when targeting whole row",
      path: ["targetOnlyAdjacent"],
    });
  }
  if (input.targetOnlyAdjacent && input.maxTargetsPerRow !== null && input.maxTargetsPerRow < 2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Target only adjacent needs at least 2 targets per row",
      path: ["targetOnlyAdjacent"],
    });
  }
  if (input.targetPolicy === "self" && input.targetSide === "enemies") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Self priority cannot be used when targeting enemies",
      path: ["targetSide"],
    });
  }
}

const unitInputBaseSchema = unitInputFields.superRefine(validateTargetingFields);

type NormalizedUnitInput = z.infer<typeof unitInputBaseSchema>;
type UnitTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function normalizeUnitInput(input: z.infer<typeof unitInputBaseSchema>): NormalizedUnitInput {
  return {
    ...input,
    name: input.name.trim(),
    itemIds: [...input.itemIds],
    allowedRowTypes: [...input.allowedRowTypes],
  };
}

function buildUnitItemRows(unitId: string, itemIds: string[]) {
  return itemIds.map((itemId, index) => ({
    unitId,
    itemId,
    priority: index + 1,
  }));
}

async function insertUnitItems(tx: UnitTransaction, unitId: string, itemIds: string[]) {
  if (itemIds.length === 0) {
    return;
  }

  await tx.insert(unitsItems).values(buildUnitItemRows(unitId, itemIds));
}

async function getOrderedItemIdsForUnit(executor: Pick<UnitTransaction, "select">, unitId: string) {
  const itemLinks = await executor
    .select({ itemId: unitsItems.itemId })
    .from(unitsItems)
    .where(eq(unitsItems.unitId, unitId))
    .orderBy(asc(unitsItems.priority));

  return itemLinks.map((link) => link.itemId);
}

async function insertUnitAllowedRows(
  tx: UnitTransaction,
  unitId: string,
  rowTypes: NormalizedUnitInput["allowedRowTypes"],
) {
  if (rowTypes.length === 0) {
    return;
  }

  await tx.insert(unitsAllowedRows).values(rowTypes.map((rowType) => ({ unitId, rowType })));
}

async function getAllowedRowTypesForUnit(
  executor: Pick<UnitTransaction, "select">,
  unitId: string,
) {
  const allowedRows = await executor
    .select({ rowType: unitsAllowedRows.rowType })
    .from(unitsAllowedRows)
    .where(eq(unitsAllowedRows.unitId, unitId));

  return allowedRows.map((row) => row.rowType);
}

function buildUnitLinkageCondition(filter: EntityListLinkageFilter): SQL | undefined {
  if (filter.mode === "all") {
    return undefined;
  }

  if (filter.mode === "scenario") {
    return exists(
      db
        .select({ id: scenariosRowsUnits.id })
        .from(scenariosRowsUnits)
        .innerJoin(scenariosRows, eq(scenariosRowsUnits.rowId, scenariosRows.id))
        .where(
          and(
            eq(scenariosRowsUnits.unitId, units.id),
            eq(scenariosRows.scenarioId, filter.scenarioId),
          ),
        ),
    );
  }

  const linkedUnitSubquery = db
    .select({ id: scenariosRowsUnits.id })
    .from(scenariosRowsUnits)
    .where(eq(scenariosRowsUnits.unitId, units.id));

  return filter.mode === "linked" ? exists(linkedUnitSubquery) : notExists(linkedUnitSubquery);
}

export const unitsRouter = router({
  list: gmProcedure.input(unitListInput).query(async ({ input }) => {
    const offset = (input.page - 1) * input.limit;
    const sortColumnMap = {
      name: units.name,
      updatedAt: units.updatedAt,
    } as const;
    const sortColumn = sortColumnMap[input.sortBy];
    const sortFn = input.sortDir === "desc" ? desc : asc;
    const orderClauses =
      input.sortBy === "name" ? [sortFn(sortColumn)] : [sortFn(sortColumn), asc(units.name)];
    const linkageCondition = buildUnitLinkageCondition(input.linkageFilter);
    const rowsQuery = db
      .select({
        id: units.id,
        name: units.name,
        updatedAt: units.updatedAt,
      })
      .from(units);
    const countQuery = db.select({ count: count() }).from(units);

    const [rows, countResult] = await Promise.all([
      (linkageCondition ? rowsQuery.where(linkageCondition) : rowsQuery)
        .orderBy(...orderClauses)
        .limit(input.limit)
        .offset(offset),
      linkageCondition ? countQuery.where(linkageCondition) : countQuery,
    ]);

    return toPaginatedResult(rows, countResult, input.page, input.limit);
  }),

  get: gmProcedure.input(z.object({ id: idSchema })).query(async ({ input }) => {
    const [unit] = await db.select().from(units).where(eq(units.id, input.id));

    if (!unit) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
    }

    const [itemIds, allowedRowTypes] = await Promise.all([
      getOrderedItemIdsForUnit(db, input.id),
      getAllowedRowTypesForUnit(db, input.id),
    ]);

    return {
      ...unit,
      itemIds,
      allowedRowTypes,
    };
  }),

  create: gmProcedure.input(unitInputBaseSchema).mutation(async ({ input }) => {
    const normalized = normalizeUnitInput(input);

    try {
      return await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(units)
          .values({
            name: normalized.name,
            meleeDmg: normalized.meleeDmg,
            health: normalized.health,
            mana: normalized.mana,
            rangedDmg: normalized.rangedDmg,
            manaRegen: normalized.manaRegen,
            spellDmg: normalized.spellDmg,
            speed: normalized.speed,
            dodge: normalized.dodge,
            criticalChance: normalized.criticalChance,
            targetSide: normalized.targetSide,
            targetPolicy: normalized.targetPolicy,
            targetRowCount: normalized.targetRowCount,
            maxTargetsPerRow: normalized.maxTargetsPerRow,
            targetOnlyAdjacent: normalized.targetOnlyAdjacent,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unit was not created.",
          });
        }

        await insertUnitItems(tx, created.id, normalized.itemIds);
        await insertUnitAllowedRows(tx, created.id, normalized.allowedRowTypes);

        return {
          ...created,
          itemIds: await getOrderedItemIdsForUnit(tx, created.id),
          allowedRowTypes: normalized.allowedRowTypes,
        };
      });
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      throwUniqueNameConflict(error, "unit");
    }
  }),

  update: gmProcedure
    .input(z.object({ id: idSchema }).merge(unitInputFields).superRefine(validateTargetingFields))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const normalized = normalizeUnitInput(rest);

      try {
        return await db.transaction(async (tx) => {
          const [updated] = await tx
            .update(units)
            .set({
              name: normalized.name,
              meleeDmg: normalized.meleeDmg,
              health: normalized.health,
              mana: normalized.mana,
              rangedDmg: normalized.rangedDmg,
              manaRegen: normalized.manaRegen,
              spellDmg: normalized.spellDmg,
              speed: normalized.speed,
              dodge: normalized.dodge,
              criticalChance: normalized.criticalChance,
              targetSide: normalized.targetSide,
              targetPolicy: normalized.targetPolicy,
              targetRowCount: normalized.targetRowCount,
              maxTargetsPerRow: normalized.maxTargetsPerRow,
              targetOnlyAdjacent: normalized.targetOnlyAdjacent,
            })
            .where(eq(units.id, id))
            .returning();

          if (!updated) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
          }

          await tx.delete(unitsItems).where(eq(unitsItems.unitId, id));
          await insertUnitItems(tx, id, normalized.itemIds);

          await tx.delete(unitsAllowedRows).where(eq(unitsAllowedRows.unitId, id));
          await insertUnitAllowedRows(tx, id, normalized.allowedRowTypes);

          return {
            ...updated,
            itemIds: await getOrderedItemIdsForUnit(tx, id),
            allowedRowTypes: normalized.allowedRowTypes,
          };
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throwUniqueNameConflict(error, "unit");
      }
    }),

  delete: gmProcedure.input(z.object({ id: idSchema })).mutation(async ({ input }) => {
    const deleted = await db
      .delete(units)
      .where(eq(units.id, input.id))
      .returning({ id: units.id });
    if (deleted.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
    }
    return { success: true };
  }),
});
