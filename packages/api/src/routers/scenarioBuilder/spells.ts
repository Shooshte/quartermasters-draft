import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, spells, spellsEffects } from "@qd/db";
import { gmProcedure, router } from "../../trpc";

export const spellsRouter = router({
  list: gmProcedure.query(async () => {
    return db
      .select({ id: spells.id, name: spells.name, updatedAt: spells.updatedAt })
      .from(spells)
      .orderBy(asc(spells.name));
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
});
