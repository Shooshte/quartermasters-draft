import { TRPCError } from "@trpc/server";
import { asc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, scenarios, scenariosRows, scenariosRowsUnits, units } from "@qd/db";
import { gmProcedure, router } from "../../trpc";

export const scenariosRouter = router({
  list: gmProcedure.query(async () => {
    return db
      .select({ id: scenarios.id, name: scenarios.name, updatedAt: scenarios.updatedAt })
      .from(scenarios)
      .orderBy(asc(scenarios.name));
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
        .where(eq(scenariosRows.scenarioId, input.id));

      rows.sort((a, b) => a.rowType.localeCompare(b.rowType));

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
});
