import {
  db,
  items,
  itemsSpells,
  scenariosRows,
  scenariosRowsUnits,
  spells,
  unitsItems,
} from "@qd/db";
import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, exists, notExists, type SQL } from "drizzle-orm";
import { z } from "zod";
import { gmProcedure, router } from "../../trpc";
import {
  type EntityListLinkageFilter,
  entityListLinkageFilterSchema,
  findDbError,
  idSchema,
  listInputSchema,
} from "./shared";

const itemListInput = listInputSchema
  .extend({
    limit: z.number().int().min(1).max(500).default(20),
    sortBy: z.enum(["name", "updatedAt"]).default("name"),
    sortDir: z.enum(["asc", "desc"]).default("asc"),
    linkageFilter: entityListLinkageFilterSchema,
  })
  .prefault({});

const itemInputBaseSchema = z.object({
  name: z.string().trim().min(1),
  meleeDmg: z.number(),
  rangedDmg: z.number(),
  manaRegen: z.number(),
  spellDmg: z.number(),
  dodge: z.number(),
  criticalChance: z.number(),
  activationManaCost: z.number().min(0),
  activationHealthCost: z.number().min(0),
  spellIds: z.array(idSchema),
});

type NormalizedItemInput = z.infer<typeof itemInputBaseSchema>;
type ItemTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function normalizeItemInput(input: z.infer<typeof itemInputBaseSchema>): NormalizedItemInput {
  return {
    ...input,
    name: input.name.trim(),
    spellIds: [...new Set(input.spellIds)],
  };
}

function buildItemSpellRows(itemId: string, spellIds: string[]) {
  return spellIds.map((spellId) => ({
    itemId,
    spellId,
  }));
}

async function insertItemSpells(tx: ItemTransaction, itemId: string, spellIds: string[]) {
  if (spellIds.length === 0) {
    return;
  }

  await tx.insert(itemsSpells).values(buildItemSpellRows(itemId, spellIds));
}

async function getSortedSpellIdsForItem(executor: Pick<ItemTransaction, "select">, itemId: string) {
  const spellLinks = await executor
    .select({ spellId: itemsSpells.spellId, spellName: spells.name })
    .from(itemsSpells)
    .innerJoin(spells, eq(itemsSpells.spellId, spells.id))
    .where(eq(itemsSpells.itemId, itemId))
    .orderBy(asc(spells.name));

  return spellLinks.map((link) => link.spellId);
}

function maybeThrowConflict(error: unknown): never {
  const dbError = findDbError(error);

  if (dbError?.code === "23505") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "An item with this name already exists.",
    });
  }

  throw error;
}

function buildItemLinkageCondition(filter: EntityListLinkageFilter): SQL | undefined {
  if (filter.mode === "all") {
    return undefined;
  }

  if (filter.mode === "scenario") {
    return exists(
      db
        .select({ id: unitsItems.id })
        .from(unitsItems)
        .innerJoin(scenariosRowsUnits, eq(scenariosRowsUnits.unitId, unitsItems.unitId))
        .innerJoin(scenariosRows, eq(scenariosRowsUnits.rowId, scenariosRows.id))
        .where(
          and(eq(unitsItems.itemId, items.id), eq(scenariosRows.scenarioId, filter.scenarioId)),
        ),
    );
  }

  const linkedItemSubquery = db
    .select({ id: unitsItems.id })
    .from(unitsItems)
    .where(eq(unitsItems.itemId, items.id));

  return filter.mode === "linked" ? exists(linkedItemSubquery) : notExists(linkedItemSubquery);
}

export const itemsRouter = router({
  list: gmProcedure.input(itemListInput).query(async ({ input }) => {
    const offset = (input.page - 1) * input.limit;
    const sortColumnMap = {
      name: items.name,
      updatedAt: items.updatedAt,
    } as const;
    const sortColumn = sortColumnMap[input.sortBy];
    const sortFn = input.sortDir === "desc" ? desc : asc;
    const orderClauses =
      input.sortBy === "name" ? [sortFn(sortColumn)] : [sortFn(sortColumn), asc(items.name)];
    const linkageCondition = buildItemLinkageCondition(input.linkageFilter);
    const rowsQuery = db
      .select({
        id: items.id,
        name: items.name,
        updatedAt: items.updatedAt,
      })
      .from(items);
    const countQuery = db.select({ count: count() }).from(items);

    const [rows, countResult] = await Promise.all([
      (linkageCondition ? rowsQuery.where(linkageCondition) : rowsQuery)
        .orderBy(...orderClauses)
        .limit(input.limit)
        .offset(offset),
      linkageCondition ? countQuery.where(linkageCondition) : countQuery,
    ]);

    return {
      items: rows,
      page: input.page,
      limit: input.limit,
      totalCount: countResult[0].count,
    };
  }),

  get: gmProcedure.input(z.object({ id: idSchema })).query(async ({ input }) => {
    const [item] = await db.select().from(items).where(eq(items.id, input.id));

    if (!item) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
    }

    const spellIds = await getSortedSpellIdsForItem(db, input.id);

    return {
      ...item,
      spellIds,
    };
  }),

  create: gmProcedure.input(itemInputBaseSchema).mutation(async ({ input }) => {
    const normalized = normalizeItemInput(input);

    try {
      return await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(items)
          .values({
            name: normalized.name,
            meleeDmg: normalized.meleeDmg,
            rangedDmg: normalized.rangedDmg,
            manaRegen: normalized.manaRegen,
            spellDmg: normalized.spellDmg,
            dodge: normalized.dodge,
            criticalChance: normalized.criticalChance,
            activationManaCost: normalized.activationManaCost,
            activationHealthCost: normalized.activationHealthCost,
          })
          .returning();

        if (!created) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Item was not created.",
          });
        }

        await insertItemSpells(tx, created.id, normalized.spellIds);

        return {
          ...created,
          spellIds: await getSortedSpellIdsForItem(tx, created.id),
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
    .input(z.object({ id: idSchema }).merge(itemInputBaseSchema))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const normalized = normalizeItemInput(rest);

      try {
        return await db.transaction(async (tx) => {
          const [updated] = await tx
            .update(items)
            .set({
              name: normalized.name,
              meleeDmg: normalized.meleeDmg,
              rangedDmg: normalized.rangedDmg,
              manaRegen: normalized.manaRegen,
              spellDmg: normalized.spellDmg,
              dodge: normalized.dodge,
              criticalChance: normalized.criticalChance,
              activationManaCost: normalized.activationManaCost,
              activationHealthCost: normalized.activationHealthCost,
            })
            .where(eq(items.id, id))
            .returning();

          if (!updated) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
          }

          await tx.delete(itemsSpells).where(eq(itemsSpells.itemId, id));
          await insertItemSpells(tx, id, normalized.spellIds);

          return {
            ...updated,
            spellIds: await getSortedSpellIdsForItem(tx, id),
          };
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        maybeThrowConflict(error);
      }
    }),

  delete: gmProcedure.input(z.object({ id: idSchema })).mutation(async ({ input }) => {
    const deleted = await db
      .delete(items)
      .where(eq(items.id, input.id))
      .returning({ id: items.id });
    if (deleted.length === 0) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
    }
    return { success: true };
  }),
});
