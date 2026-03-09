import { TRPCError } from "@trpc/server";
import { asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, scenarios, scenariosRows, scenariosRowsUnits, units } from "@qd/db";
import { gmProcedure, router } from "../../trpc";

const scenarioListInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(500).default(10),
  sortBy: z.enum(["name", "updatedAt"]).default("name"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
}).default({});

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
        .orderBy(sortFn(sortColumn))
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
    .query(async ({ input }) => {
      const [scenario] = await db
        .select()
        .from(scenarios)
        .where(eq(scenarios.id, input.id));

      if (!scenario) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Scenario not found" });
      }

      const rows = await db
        .select({ id: scenariosRows.id, rowType: scenariosRows.rowType })
        .from(scenariosRows)
        .where(eq(scenariosRows.scenarioId, input.id))
        .orderBy(asc(sql`${scenariosRows.rowType}::text`));

      const rowIds = rows.map((r) => r.id);

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
        assignmentsWithUnits = await db
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
            .filter((a) => a.scenarios_rows_units.rowId === row.id)
            .map((a) => ({
              assignmentId: a.scenarios_rows_units.id,
              unitId: a.scenarios_rows_units.unitId,
              unitName: a.units.name,
              position: a.scenarios_rows_units.slot,
            })),
        })),
      };
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
