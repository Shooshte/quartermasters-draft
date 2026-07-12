import { db, scenarios, scenariosRows, scenariosRowsUnits, units } from "@qd/db";
import { TRPCError } from "@trpc/server";
import { asc, count, desc, eq, exists, inArray, notExists, type SQL } from "drizzle-orm";
import { z } from "zod";
import { gmProcedure, router } from "../../trpc";
import { throwUniqueNameConflict } from "./crud-errors";
import { toPaginatedResult } from "./pagination";
import {
  createListInputSchema,
  idSchema,
  type ScenarioListLinkageFilter,
  scenarioListLinkageFilterSchema,
} from "./shared";

const scenarioListInput = createListInputSchema(
  ["name", "updatedAt"],
  { sortBy: "name" },
  scenarioListLinkageFilterSchema,
);

const SCENARIO_ROW_TYPES = ["ranged", "support", "melee", "tank"] as const;
const scenarioRowSchema = z.object({
  rowType: z.enum(SCENARIO_ROW_TYPES),
  unitIds: z.array(idSchema),
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
    SCENARIO_ROW_TYPES.every(
      (rowType) => rowTypes.filter((candidate) => candidate === rowType).length === 1,
    );

  if (!isExactlyFixedRows) {
    throw new TRPCError({
      code: options?.code ?? "BAD_REQUEST",
      message:
        options?.message ?? "Rows must include ranged, support, melee, and tank exactly once.",
    });
  }
}

async function getScenarioById(executor: Pick<ScenarioTransaction, "select">, id: string) {
  const [scenario] = await executor.select().from(scenarios).where(eq(scenarios.id, id));

  if (!scenario) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
  }

  const rows = await executor
    .select({ id: scenariosRows.id, rowType: scenariosRows.rowType })
    .from(scenariosRows)
    .where(eq(scenariosRows.scenarioId, id));

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

  const rowsByType = new Map(rows.map((row) => [row.rowType, row]));

  return {
    id: scenario.id,
    name: scenario.name,
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
    rows: SCENARIO_ROW_TYPES.filter((rowType) => rowsByType.has(rowType)).map((rowType) => {
      // biome-ignore lint/style/noNonNullAssertion: rowType is filtered through Map.has above.
      const row = rowsByType.get(rowType)!;
      return {
        id: row.id,
        rowType: row.rowType,
        assignments: assignmentsWithUnits
          .filter((a) => a.scenarios_rows_units.rowId === row.id)
          .map((a) => ({
            assignmentId: a.scenarios_rows_units.id,
            unitId: a.scenarios_rows_units.unitId,
            unitName: a.units.name,
            position: a.scenarios_rows_units.slot,
          })),
      };
    }),
  };
}

function buildScenarioLinkageCondition(filter: ScenarioListLinkageFilter): SQL | undefined {
  if (filter.mode === "all") {
    return undefined;
  }

  const linkedScenarioSubquery = db
    .select({ id: scenariosRowsUnits.id })
    .from(scenariosRowsUnits)
    .innerJoin(scenariosRows, eq(scenariosRowsUnits.rowId, scenariosRows.id))
    .where(eq(scenariosRows.scenarioId, scenarios.id));

  return filter.mode === "linked"
    ? exists(linkedScenarioSubquery)
    : notExists(linkedScenarioSubquery);
}

export const scenariosRouter = router({
  list: gmProcedure.input(scenarioListInput).query(async ({ input }) => {
    const offset = (input.page - 1) * input.limit;
    const sortColumn = input.sortBy === "updatedAt" ? scenarios.updatedAt : scenarios.name;
    const sortFn = input.sortDir === "desc" ? desc : asc;
    const linkageCondition = buildScenarioLinkageCondition(input.linkageFilter);
    const rowsQuery = db
      .select({
        id: scenarios.id,
        name: scenarios.name,
        updatedAt: scenarios.updatedAt,
        createdAt: scenarios.createdAt,
      })
      .from(scenarios);
    const countQuery = db.select({ count: count() }).from(scenarios);

    const [items, countResult] = await Promise.all([
      (linkageCondition ? rowsQuery.where(linkageCondition) : rowsQuery)
        .orderBy(sortFn(sortColumn), asc(scenarios.id))
        .limit(input.limit)
        .offset(offset),
      linkageCondition ? countQuery.where(linkageCondition) : countQuery,
    ]);

    return toPaginatedResult(items, countResult, input.page, input.limit);
  }),

  get: gmProcedure
    .input(z.object({ id: idSchema }))
    .query(async ({ input }) => getScenarioById(db, input.id)),

  create: gmProcedure.input(scenarioInputBaseSchema).mutation(async ({ input }) => {
    const normalized = normalizeScenarioInput(input);
    ensureFixedRows(normalized.rows);

    try {
      return await db.transaction(async (tx) => {
        const [created] = await tx.insert(scenarios).values({ name: normalized.name }).returning();

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
            // biome-ignore lint/style/noNonNullAssertion: createdRows contains every validated fixed row.
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

      throwUniqueNameConflict(error, "scenario");
    }
  }),

  update: gmProcedure
    .input(z.object({ id: idSchema }).merge(scenarioInputBaseSchema))
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
              // biome-ignore lint/style/noNonNullAssertion: ensureFixedRows validates every row key.
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

        throwUniqueNameConflict(error, "scenario");
      }
    }),

  delete: gmProcedure.input(z.object({ id: idSchema })).mutation(async ({ input }) => {
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
