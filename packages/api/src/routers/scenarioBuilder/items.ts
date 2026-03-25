import { TRPCError } from "@trpc/server";
import { asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, items, itemsSpells } from "@qd/db";
import { gmProcedure, router } from "../../trpc";
import { listInputSchema } from "./shared";

const itemListInput = listInputSchema.extend({
  limit: z.number().int().min(1).max(500).default(10),
  sortBy: z.enum(["name", "updatedAt"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
}).default({});

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
      input.sortBy === "name"
        ? [sortFn(sortColumn)]
        : [sortFn(sortColumn), asc(items.name)];

    const [rows, countResult] = await Promise.all([
      db
        .select({
          id: items.id,
          name: items.name,
          updatedAt: items.updatedAt,
        })
        .from(items)
        .orderBy(...orderClauses)
        .limit(input.limit)
        .offset(offset),
      db.select({ count: count() }).from(items),
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
      const [item] = await db
        .select()
        .from(items)
        .where(eq(items.id, input.id));

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      const spellLinks = await db
        .select({ spellId: itemsSpells.spellId })
        .from(itemsSpells)
        .where(eq(itemsSpells.itemId, input.id));

      return {
        ...item,
        spellIds: spellLinks.map((s) => s.spellId),
      };
    }),

  delete: gmProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
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
