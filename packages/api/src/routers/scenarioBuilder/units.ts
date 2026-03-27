import { TRPCError } from "@trpc/server";
import { asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, units, unitsItems } from "@qd/db";
import { gmProcedure, router } from "../../trpc";
import { listInputSchema } from "./shared";

const unitListInput = listInputSchema.extend({
  limit: z.number().int().min(1).max(500).default(20),
  sortBy: z.enum(["name", "updatedAt"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
}).default({});

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
