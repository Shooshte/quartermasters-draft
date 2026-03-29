import { TRPCError } from "@trpc/server";
import { asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, units, unitsItems } from "@qd/db";
import { gmProcedure, router } from "../../trpc";
import { findDbError, listInputSchema } from "./shared";

const unitListInput = listInputSchema.extend({
  limit: z.number().int().min(1).max(500).default(20),
  sortBy: z.enum(["name", "updatedAt"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
}).default({});

const unitInputBaseSchema = z.object({
  name: z.string().trim().min(1),
  meleeDmg: z.number(),
  health: z.number(),
  rangedDmg: z.number(),
  manaRegen: z.number(),
  spellDmg: z.number(),
  speed: z.number(),
  dodge: z.number(),
  criticalChance: z.number(),
  itemIds: z.array(z.string().uuid()),
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

async function insertUnitItems(
  tx: UnitTransaction,
  unitId: string,
  itemIds: string[],
) {
  if (itemIds.length === 0) {
    return;
  }

  await tx.insert(unitsItems).values(buildUnitItemRows(unitId, itemIds));
}

async function getOrderedItemIdsForUnit(
  executor: Pick<UnitTransaction, "select">,
  unitId: string,
) {
  const itemLinks = await executor
    .select({ itemId: unitsItems.itemId })
    .from(unitsItems)
    .where(eq(unitsItems.unitId, unitId))
    .orderBy(asc(unitsItems.priority));

  return itemLinks.map((link) => link.itemId);
}

function maybeThrowConflict(error: unknown): never {
  const dbError = findDbError(error);

  if (dbError?.code === "23505") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A unit with this name already exists.",
    });
  }

  throw error;
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
      input.sortBy === "name"
        ? [sortFn(sortColumn)]
        : [sortFn(sortColumn), asc(units.name)];

    const [rows, countResult] = await Promise.all([
      db
        .select({
          id: units.id,
          name: units.name,
          updatedAt: units.updatedAt,
        })
        .from(units)
        .orderBy(...orderClauses)
        .limit(input.limit)
        .offset(offset),
      db.select({ count: count() }).from(units),
    ]);

    return {
      items: rows,
      page: input.page,
      limit: input.limit,
      totalCount: countResult[0].count,
    };
  }),

  get: gmProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [unit] = await db
        .select()
        .from(units)
        .where(eq(units.id, input.id));

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

  create: gmProcedure
    .input(unitInputBaseSchema)
    .mutation(async ({ input }) => {
      const normalized = normalizeUnitInput(input);

      try {
        return await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(units)
            .values({
              name: normalized.name,
              meleeDmg: normalized.meleeDmg,
              health: normalized.health,
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

        maybeThrowConflict(error);
      }
    }),

  update: gmProcedure
    .input(z.object({ id: z.string().uuid() }).merge(unitInputBaseSchema))
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

        maybeThrowConflict(error);
      }
    }),

  delete: gmProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
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
