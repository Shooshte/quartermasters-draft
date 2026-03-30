import { TRPCError } from "@trpc/server";
import { asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, scenarios, scenariosRows, scenariosRowsUnits, units } from "@qd/db";
import { gmProcedure, router } from "../../trpc";
import { findDbError, listInputSchema } from "./shared";

const scenarioListInput = listInputSchema.extend({
  limit: z.number().int().min(1).max(500).default(20),
  sortBy: z.enum(["name", "updatedAt"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
}).default({});

const SCENARIO_ROW_TYPES = ["tank", "melee", "ranged", "support"] as const;
const scenarioRowSchema = z.object({
  rowType: z.enum(SCENARIO_ROW_TYPES),
  unitIds: z.array(z.string().uuid()),
});
const scenarioInputBaseSchema = z.object({
  name: z.string().trim().min(1),
  rows: z.array(scenarioRowSchema),
});

type ScenarioTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function normalizeScenarioRows(rows: z.infer<typeof scenarioRowSchema>[]) {
  const rowMap = new Map(
    rows.map((row) => [row.rowType, { rowType: row.rowType, unitIds: [...row.unitIds] }]),
  );

  return SCENARIO_ROW_TYPES.map((rowType) => rowMap.get(rowType) ?? { rowType, unitIds: [] });
}

function normalizeScenarioInput(input: z.infer<typeof scenarioInputBaseSchema>) {
  return {
    name: input.name.trim(),
    rows: normalizeScenarioRows(input.rows),
  };
}

function ensureFixedRows(
  rows: { rowType: string }[],
  options?: {
    code?: "BAD_REQUEST" | "INTERNAL_SERVER_ERROR";
    message?: string;
  },
) {
  const rowTypes = rows.map((row) => row.rowType);
  const isExactlyFixedRows =
    rowTypes.length === SCENARIO_ROW_TYPES.length &&
    SCENARIO_ROW_TYPES.every((rowType) => rowTypes.filter((candidate) => candidate === rowType).length === 1);

  if (!isExactlyFixedRows) {
    throw new TRPCError({
      code: options?.code ?? "BAD_REQUEST",
      message:
        options?.message ?? "Rows must include tank, melee, ranged, and support exactly once.",
    });
  }
}

async function getScenarioById(
  executor: Pick<ScenarioTransaction, "select">,
  id: string,
) {
  const [scenario] = await executor
    .select()
    .from(scenarios)
    .where(eq(scenarios.id, id));

  if (!scenario) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
  }

  const rows = await executor
    .select({ id: scenariosRows.id, rowType: scenariosRows.rowType })
    .from(scenariosRows)
    .where(eq(scenariosRows.scenarioId, id))
    .orderBy(asc(sql`${scenariosRows.rowType}::text`));

  const rowIds = rows.map((row) => row.id);
  let assignmentsWithUnits: {
    scenarios_rows_units: {
      id: string;
      rowId: string;
      unitId: string;
      slot: number;
    };
    units: { name: string };
  }[] = [];

  if (rowIds.length > 0) {
    assignmentsWithUnits = await executor
      .select({
        scenarios_rows_units: {
          id: scenariosRowsUnits.id,
          rowId: scenariosRowsUnits.rowId,
          unitId: scenariosRowsUnits.unitId,
          slot: scenariosRowsUnits.slot,
        },
        units: { name: units.name },
      })
      .from(scenariosRowsUnits)
      .innerJoin(units, eq(scenariosRowsUnits.unitId, units.id))
      .where(inArray(scenariosRowsUnits.rowId, rowIds))
      .orderBy(asc(scenariosRowsUnits.slot));
  }

  return {
    id: scenario.id,
    name: scenario.name,
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
    rows: rows.map((row) => ({
      id: row.id,
      rowType: row.rowType,
      assignments: assignmentsWithUnits
        .filter((assignment) => assignment.scenarios_rows_units.rowId === row.id)
        .map((assignment) => ({
          assignmentId: assignment.scenarios_rows_units.id,
          unitId: assignment.scenarios_rows_units.unitId,
          unitName: assignment.units.name,
          position: assignment.scenarios_rows_units.slot,
        })),
    })),
  };
}

function maybeThrowConflict(error: unknown): never {
  const dbError = findDbError(error);

  if (dbError?.code === "23505") {
    throw new TRPCError({
      code: "CONFLICT",
      message: "A scenario with this name already exists.",
    });
  }

  throw error;
}

export const scenariosRouter = router({
  list: gmProcedure.input(scenarioListInput).query(async ({ input }) => {
    const offset = (input.page - 1) * input.limit;
    const sortColumn = input.sortBy === "updatedAt" ? scenarios.updatedAt : scenarios.name;
    const sortFn = input.sortDir === "desc" ? desc : asc;

    const [items, countResult] = await Promise.all([
      db
        .select({
          id: scenarios.id,
          name: scenarios.name,
          updatedAt: scenarios.updatedAt,
          createdAt: scenarios.createdAt,
        })
        .from(scenarios)
        .orderBy(sortFn(sortColumn), asc(scenarios.id))
        .limit(input.limit)
        .offset(offset),
      db.select({ count: count() }).from(scenarios),
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
    .query(async ({ input }) => getScenarioById(db, input.id)),

  create: gmProcedure
    .input(scenarioInputBaseSchema)
    .mutation(async ({ input }) => {
      const normalized = normalizeScenarioInput(input);
      ensureFixedRows(normalized.rows);

      try {
        return await db.transaction(async (tx) => {
          const [created] = await tx
            .insert(scenarios)
            .values({ name: normalized.name })
            .returning();

          if (!created) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Scenario was not created.",
            });
          }

          const createdRows = await tx
            .insert(scenariosRows)
            .values(
              normalized.rows.map((row) => ({
                scenarioId: created.id,
                rowType: row.rowType,
              })),
            )
            .returning({ id: scenariosRows.id, rowType: scenariosRows.rowType });

          const rowIdByType = new Map(createdRows.map((row) => [row.rowType, row.id]));
          const assignmentRows = normalized.rows.flatMap((row) =>
            row.unitIds.map((unitId, index) => ({
              rowId: rowIdByType.get(row.rowType)!,
              unitId,
              slot: index + 1,
            })),
          );

          if (assignmentRows.length > 0) {
            await tx.insert(scenariosRowsUnits).values(assignmentRows);
          }

          return getScenarioById(tx, created.id);
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

        maybeThrowConflict(error);
      }
    }),

  update: gmProcedure
    .input(z.object({ id: z.string().uuid() }).merge(scenarioInputBaseSchema))
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const normalized = normalizeScenarioInput(rest);
      ensureFixedRows(normalized.rows);

      try {
        return await db.transaction(async (tx) => {
          const [updated] = await tx
            .update(scenarios)
            .set({ name: normalized.name })
            .where(eq(scenarios.id, id))
            .returning();

          if (!updated) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
          }

          const existingRows = await tx
            .select({ id: scenariosRows.id, rowType: scenariosRows.rowType })
            .from(scenariosRows)
            .where(eq(scenariosRows.scenarioId, id));

          ensureFixedRows(existingRows, {
            code: "INTERNAL_SERVER_ERROR",
            message: "Scenario data is in an unexpected state. Please contact support.",
          });

          const rowIdByType = new Map(existingRows.map((row) => [row.rowType, row.id]));
          const rowIds = existingRows.map((row) => row.id);

          await tx.delete(scenariosRowsUnits).where(inArray(scenariosRowsUnits.rowId, rowIds));

          const assignmentRows = normalized.rows.flatMap((row) =>
            row.unitIds.map((unitId, index) => ({
              rowId: rowIdByType.get(row.rowType)!,
              unitId,
              slot: index + 1,
            })),
          );

          if (assignmentRows.length > 0) {
            await tx.insert(scenariosRowsUnits).values(assignmentRows);
          }

          return getScenarioById(tx, id);
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
        .delete(scenarios)
        .where(eq(scenarios.id, input.id))
        .returning({ id: scenarios.id });
      if (deleted.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
      }
      return { success: true };
    }),
});
