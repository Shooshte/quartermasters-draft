import { TRPCError } from "@trpc/server";
import { asc, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, spells, spellsEffects } from "@qd/db";
import { gmProcedure, router } from "../../trpc";
import { listInputSchema } from "./shared";

const spellListInput = listInputSchema.extend({
  limit: z.number().int().min(1).max(500).default(20),
  sortBy: z.enum(["name", "targetPolicy", "updatedAt"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
}).default({});

const spellInputBaseSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().nullable().optional().default(null),
  targetPolicy: z.enum([
    "highest_health",
    "lowest_health",
    "highest_damage",
    "random",
  ]),
  effectIds: z.array(z.string().uuid()).min(1, "At least one linked effect is required"),
});

function normalizeSpellInput(input: z.infer<typeof spellInputBaseSchema>) {
  return {
    name: input.name.trim(),
    description: input.description?.trim() ? input.description.trim() : null,
    targetPolicy: input.targetPolicy,
    effectIds: input.effectIds,
  };
}

function buildSpellEffectRows(spellId: string, effectIds: string[]) {
  return effectIds.map((effectTemplateId, index) => ({
    spellId,
    effectTemplateId,
    sequenceOrder: index + 1,
  }));
}

async function insertSpellEffects(
  tx: typeof db,
  spellId: string,
  effectIds: string[],
) {
  await tx.insert(spellsEffects).values(buildSpellEffectRows(spellId, effectIds));
}

function maybeThrowConflict(error: unknown): never {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  ) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A spell with this name already exists.",
    });
  }

  throw error;
}

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

  create: gmProcedure
    .input(spellInputBaseSchema)
    .mutation(async ({ input }) => {
      const normalized = normalizeSpellInput(input);

      try {
        return await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(spells)
            .values({
              name: normalized.name,
              description: normalized.description,
              targetPolicy: normalized.targetPolicy,
            })
            .returning();

          if (!created) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Spell was not created.",
            });
          }

          await insertSpellEffects(tx, created.id, normalized.effectIds);

          return {
            ...created,
            effectIds: normalized.effectIds,
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
    .input(z.object({ id: z.string().uuid() }).merge(spellInputBaseSchema))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const normalized = normalizeSpellInput(rest);

      try {
        return await db.transaction(async (tx) => {
          const [updated] = await tx
            .update(spells)
            .set({
              name: normalized.name,
              description: normalized.description,
              targetPolicy: normalized.targetPolicy,
            })
            .where(eq(spells.id, id))
            .returning();

          if (!updated) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Spell not found" });
          }

          await tx.delete(spellsEffects).where(eq(spellsEffects.spellId, id));
          await insertSpellEffects(tx, id, normalized.effectIds);

          return {
            ...updated,
            effectIds: normalized.effectIds,
          };
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        maybeThrowConflict(error);
      }
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
