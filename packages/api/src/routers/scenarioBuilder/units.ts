import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, units, unitsItems } from "@qd/db";
import { gmProcedure, router } from "../../trpc";
import { listInput } from "./shared";

export const unitsRouter = router({
  list: gmProcedure.input(listInput).query(async ({ input }) => {
    const offset = (input.page - 1) * input.limit;
    const rows = await db
      .select({ id: units.id, name: units.name, updatedAt: units.updatedAt })
      .from(units)
      .orderBy(asc(units.name))
      .limit(input.limit)
      .offset(offset);
    return { items: rows, page: input.page, limit: input.limit };
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
});
