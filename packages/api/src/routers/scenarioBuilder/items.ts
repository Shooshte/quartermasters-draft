import {
  db,
  items,
  itemsAllowedRows,
  itemsEffects,
  scenariosRows,
  scenariosRowsUnits,
  unitsItems,
} from "@qd/db";
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

const itemListInput = createListInputSchema(
  ["name", "updatedAt"],
  { sortBy: "name" },
  entityListLinkageFilterSchema,
);

const rowTypeSchema = z.enum(["tank", "melee", "ranged", "support"]);
const combatRowTypes = ["tank", "melee", "ranged", "support"] as const;

const itemInputFields = z.object({
  name: z.string().trim().min(1),
  meleeDmg: z.number(),
  rangedDmg: z.number(),
  mana: z.number().finite(),
  manaRegen: z.number(),
  spellDmg: z.number(),
  dodge: z.number(),
  criticalChance: z.number(),
  activationManaCost: z.number().min(0),
  activationHealthCost: z.number().min(0),
  effectIds: z.array(idSchema),
  allowedRowTypes: z.array(rowTypeSchema),
});

function rejectDuplicateAllowedRows(input: z.infer<typeof itemInputFields>, ctx: z.RefinementCtx) {
  if (new Set(input.allowedRowTypes).size !== input.allowedRowTypes.length) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Allowed row types must not contain duplicates.",
      path: ["allowedRowTypes"],
    });
  }
}

const itemInputBaseSchema = itemInputFields.superRefine(rejectDuplicateAllowedRows);

type NormalizedItemInput = z.infer<typeof itemInputBaseSchema>;
type ItemTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function normalizeItemInput(input: z.infer<typeof itemInputBaseSchema>): NormalizedItemInput {
  return {
    ...input,
    name: input.name.trim(),
    effectIds: [...input.effectIds],
    allowedRowTypes: [...input.allowedRowTypes],
  };
}

function buildItemEffectRows(itemId: string, effectIds: string[]) {
  return effectIds.map((effectTemplateId, index) => ({
    itemId,
    effectTemplateId,
    sequenceOrder: index + 1,
  }));
}

async function insertItemEffects(tx: ItemTransaction, itemId: string, effectIds: string[]) {
  if (effectIds.length === 0) {
    return;
  }

  await tx.insert(itemsEffects).values(buildItemEffectRows(itemId, effectIds));
}

async function getOrderedEffectIdsForItem(
  executor: Pick<ItemTransaction, "select">,
  itemId: string,
) {
  const effectLinks = await executor
    .select({ effectTemplateId: itemsEffects.effectTemplateId })
    .from(itemsEffects)
    .where(eq(itemsEffects.itemId, itemId))
    .orderBy(asc(itemsEffects.sequenceOrder));

  return effectLinks.map((link) => link.effectTemplateId);
}

async function insertItemAllowedRows(
  tx: ItemTransaction,
  itemId: string,
  rowTypes: NormalizedItemInput["allowedRowTypes"],
) {
  if (rowTypes.length === 0) {
    return;
  }

  await tx.insert(itemsAllowedRows).values(rowTypes.map((rowType) => ({ itemId, rowType })));
}

async function getAllowedRowTypesForItem(
  executor: Pick<ItemTransaction, "select">,
  itemId: string,
) {
  const allowedRows = await executor
    .select({ rowType: itemsAllowedRows.rowType })
    .from(itemsAllowedRows)
    .where(eq(itemsAllowedRows.itemId, itemId));

  return allowedRows
    .map((row) => row.rowType)
    .sort((left, right) => combatRowTypes.indexOf(left) - combatRowTypes.indexOf(right));
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

    return toPaginatedResult(rows, countResult, input.page, input.limit);
  }),

  get: gmProcedure.input(z.object({ id: idSchema })).query(async ({ input }) => {
    const [item] = await db.select().from(items).where(eq(items.id, input.id));

    if (!item) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
    }

    const [effectIds, allowedRowTypes] = await Promise.all([
      getOrderedEffectIdsForItem(db, input.id),
      getAllowedRowTypesForItem(db, input.id),
    ]);

    return {
      ...item,
      effectIds,
      allowedRowTypes,
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
            mana: normalized.mana,
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

        await insertItemEffects(tx, created.id, normalized.effectIds);
        await insertItemAllowedRows(tx, created.id, normalized.allowedRowTypes);

        return {
          ...created,
          effectIds: await getOrderedEffectIdsForItem(tx, created.id),
          allowedRowTypes: normalized.allowedRowTypes,
        };
      });
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }

      throwUniqueNameConflict(error, "item");
    }
  }),

  update: gmProcedure
    .input(
      z.object({ id: idSchema }).merge(itemInputFields).superRefine(rejectDuplicateAllowedRows),
    )
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
              mana: normalized.mana,
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

          await tx.delete(itemsEffects).where(eq(itemsEffects.itemId, id));
          await insertItemEffects(tx, id, normalized.effectIds);
          await tx.delete(itemsAllowedRows).where(eq(itemsAllowedRows.itemId, id));
          await insertItemAllowedRows(tx, id, normalized.allowedRowTypes);

          return {
            ...updated,
            effectIds: await getOrderedEffectIdsForItem(tx, id),
            allowedRowTypes: normalized.allowedRowTypes,
          };
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        throwUniqueNameConflict(error, "item");
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
