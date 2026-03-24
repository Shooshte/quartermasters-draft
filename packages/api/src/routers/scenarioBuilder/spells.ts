import { TRPCError } from "@trpc/server";
import { asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, spells, spellsEffects } from "@qd/db";
import { gmProcedure, router } from "../../trpc";
import { listInputSchema } from "./shared";

const spellListInput = listInputSchema.extend({
  limit: z.number().int().min(1).max(500).default(10),
  sortBy: z.enum(["name", "targetPolicy", "updatedAt"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
}).default({});

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
      input.sortBy === "name"
        ? [sortFn(sortColumn)]
        : [sortFn(sortColumn), asc(spells.name)];

    const [items, countResult] = await Promise.all([
      db
        .select({
          id: spells.id,
          name: spells.name,
          description: spells.description,
          targetPolicy: spells.targetPolicy,
          updatedAt: spells.updatedAt,
        })
        .from(spells)
        .orderBy(...orderClauses)
        .limit(input.limit)
        .offset(offset),
      db.select({ count: count() }).from(spells),
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
      const [spell] = await db
        .select()
        .from(spells)
        .where(eq(spells.id, input.id));

      if (!spell) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Spell not found" });
      }

      const effectLinks = await db
        .select({ effectTemplateId: spellsEffects.effectTemplateId })
        .from(spellsEffects)
        .where(eq(spellsEffects.spellId, input.id))
        .orderBy(asc(spellsEffects.sequenceOrder));

      return {
        ...spell,
        effectIds: effectLinks.map((e) => e.effectTemplateId),
      };
    }),

  delete: gmProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const deleted = await db
        .delete(spells)
        .where(eq(spells.id, input.id))
        .returning({ id: spells.id });
      if (deleted.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Spell not found" });
      }
      return { success: true };
    }),
});
