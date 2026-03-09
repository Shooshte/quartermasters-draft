import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, effects } from "@qd/db";
import { gmProcedure, router } from "../../trpc";
import { listInput } from "./shared";

export const effectsRouter = router({
  list: gmProcedure.input(listInput).query(async ({ input }) => {
    const offset = (input.page - 1) * input.limit;
    const items = await db
      .select({ id: effects.id, name: effects.name, updatedAt: effects.updatedAt })
      .from(effects)
      .orderBy(asc(effects.name))
      .limit(input.limit)
      .offset(offset);
    return { items, page: input.page, limit: input.limit };
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
});
