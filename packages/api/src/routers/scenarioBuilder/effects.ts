import { TRPCError } from "@trpc/server";
import { asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, effects } from "@qd/db";
import { gmProcedure, router } from "../../trpc";
import { listInputSchema } from "./shared";

const effectListInput = listInputSchema.extend({
  limit: z.number().int().min(1).max(500).default(10),
  sortBy: z.enum(["name", "timingType", "effectType"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
}).default({});

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
      input.sortBy === "name"
        ? [sortFn(sortColumn)]
        : [sortFn(sortColumn), asc(effects.name)];

    const [items, countResult] = await Promise.all([
      db
        .select({
          id: effects.id,
          name: effects.name,
          timingType: effects.timingType,
          effectType: effects.effectType,
          updatedAt: effects.updatedAt,
        })
        .from(effects)
        .orderBy(...orderClauses)
        .limit(input.limit)
        .offset(offset),
      db.select({ count: count() }).from(effects),
    ]);

    return {
      items,
      page: input.page,
      limit: input.limit,
      totalCount: countResult[0].count,
    };
  }),

  get: gmProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [effect] = await db
        .select()
        .from(effects)
        .where(eq(effects.id, input.id));

      if (!effect) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Effect not found" });
      }

      return effect;
    }),

  delete: gmProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const deleted = await db
        .delete(effects)
        .where(eq(effects.id, input.id))
        .returning({ id: effects.id });
      if (deleted.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Effect not found" });
      }
      return { success: true };
    }),
});
