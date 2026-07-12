import { battleReplays, db, scenarios } from "@qd/db";
import { BattleEngine, InvalidBattleInputError } from "@qd/engine";
import { TRPCError } from "@trpc/server";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { gmProcedure, router } from "../../trpc";
import { loadBattleScenario } from "./load-scenario";

const idInput = z
  .string()
  .uuid()
  .transform((id) => id.toLowerCase());
const createInput = z
  .object({
    scenarioAId: idInput,
    scenarioBId: idInput,
    seed: z.string().trim().min(1),
  })
  .refine((input) => input.scenarioAId !== input.scenarioBId, {
    message: "Choose two different scenarios.",
    path: ["scenarioBId"],
  });

async function resolveDefinition(definition: {
  scenarioAId: string;
  scenarioBId: string;
  seed: string;
}) {
  const [scenarioA, scenarioB] = await Promise.all([
    loadBattleScenario(db, definition.scenarioAId),
    loadBattleScenario(db, definition.scenarioBId),
  ]);

  try {
    return {
      scenarios: [
        { id: scenarioA.id, name: scenarioA.name ?? scenarioA.id },
        { id: scenarioB.id, name: scenarioB.name ?? scenarioB.id },
      ] as const,
      result: new BattleEngine({
        scenarios: [scenarioA, scenarioB],
        seed: definition.seed,
      }).resolve(),
    };
  } catch (error) {
    if (error instanceof InvalidBattleInputError) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: error.message,
      });
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Battle could not be resolved.",
    });
  }
}

export const battleLabRouter = router({
  scenarioOptions: gmProcedure.query(() =>
    db
      .select({ id: scenarios.id, name: scenarios.name })
      .from(scenarios)
      .orderBy(asc(scenarios.name), asc(scenarios.id)),
  ),

  create: gmProcedure.input(createInput).mutation(async ({ input }) => {
    const definition = {
      scenarioAId: input.scenarioAId,
      scenarioBId: input.scenarioBId,
      seed: input.seed.trim(),
    };
    const resolved = await resolveDefinition(definition);
    let replay: typeof battleReplays.$inferSelect | undefined;

    try {
      [replay] = await db.insert(battleReplays).values(definition).returning();
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Replay was not saved.",
      });
    }

    if (!replay) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Replay was not saved.",
      });
    }

    return { replay, ...resolved };
  }),

  get: gmProcedure.input(z.object({ id: idInput })).query(async ({ input }) => {
    const [replay] = await db
      .select()
      .from(battleReplays)
      .where(eq(battleReplays.id, input.id))
      .limit(1);

    if (!replay) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Replay not found" });
    }

    const resolved = await resolveDefinition(replay);
    return { replay, ...resolved };
  }),
});
