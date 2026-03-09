import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, items, itemsSpells } from "@qd/db";
import { gmProcedure, router } from "../../trpc";

export const itemsRouter = router({
  list: gmProcedure.query(async () => {
    return db
      .select({ id: items.id, name: items.name, updatedAt: items.updatedAt })
      .from(items)
      .orderBy(asc(items.name));
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
});
