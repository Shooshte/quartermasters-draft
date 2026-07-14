import { db, scenariosRows, scenariosRowsUnits, units, unitsItems } from "@qd/db";
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

const unitInputBaseSchema = z.object({
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
});

type NormalizedUnitInput = z.infer<typeof unitInputBaseSchema>;
type UnitTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function normalizeUnitInput(input: z.infer<typeof unitInputBaseSchema>): NormalizedUnitInput {
  return {
    ...input,
    name: input.name.trim(),
    itemIds: [...input.itemIds],
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

    const itemLinks = await db
      .select({ itemId: unitsItems.itemId })
      .from(unitsItems)
      .where(eq(unitsItems.unitId, input.id))
      .orderBy(asc(unitsItems.priority));

    return {
      ...unit,
      itemIds: itemLinks.map((i) => i.itemId),
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
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unit was not created.",
          });
        }

        await insertUnitItems(tx, created.id, normalized.itemIds);

        return {
          ...created,
          itemIds: await getOrderedItemIdsForUnit(tx, created.id),
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
    .input(z.object({ id: idSchema }).merge(unitInputBaseSchema))
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
            })
            .where(eq(units.id, id))
            .returning();

          if (!updated) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Unit not found" });
          }

          await tx.delete(unitsItems).where(eq(unitsItems.unitId, id));
          await insertUnitItems(tx, id, normalized.itemIds);

          return {
            ...updated,
            itemIds: await getOrderedItemIdsForUnit(tx, id),
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
