import { describe, expect, it } from "vitest";
import {
  SCENARIO_ROW_TYPES,
  createDefaultScenarioFormValues,
  hasScenarioFormErrors,
  isScenarioFormDirty,
  normalizeScenarioFormValues,
  scenarioRecordToFormValues,
  validateScenarioForm,
} from "~/components/create/scenario-form";

describe("scenario-form", () => {
  it("creates default values with four fixed empty rows", () => {
    expect(createDefaultScenarioFormValues()).toEqual({
      name: "",
      rows: [
        { rowType: "ranged", unitIds: [] },
        { rowType: "support", unitIds: [] },
        { rowType: "melee", unitIds: [] },
        { rowType: "tank", unitIds: [] },
      ],
    });
  });

  it("normalizes the name and preserves slot order including duplicates", () => {
    expect(
      normalizeScenarioFormValues({
        name: "  Siege Breakers  ",
        rows: [
          { rowType: "tank", unitIds: [] },
          { rowType: "melee", unitIds: ["u-1", "u-1", "u-2"] },
          { rowType: "ranged", unitIds: ["u-3"] },
          { rowType: "support", unitIds: [] },
        ],
      }),
    ).toEqual({
      name: "Siege Breakers",
      rows: [
        { rowType: "ranged", unitIds: ["u-3"] },
        { rowType: "support", unitIds: [] },
        { rowType: "melee", unitIds: ["u-1", "u-1", "u-2"] },
        { rowType: "tank", unitIds: [] },
      ],
    });
  });

  it("maps a loaded scenario record into fixed row form values", () => {
    expect(
      scenarioRecordToFormValues({
        name: "Ambush at Dawn",
        rows: [
          {
            id: "r-2",
            rowType: "melee",
            assignments: [
              { assignmentId: "a-1", unitId: "u-1", unitName: "Barbarian", position: 1 },
              { assignmentId: "a-2", unitId: "u-2", unitName: "Samurai", position: 2 },
            ],
          },
          {
            id: "r-4",
            rowType: "support",
            assignments: [{ assignmentId: "a-3", unitId: "u-3", unitName: "Ranger", position: 1 }],
          },
          { id: "r-1", rowType: "tank", assignments: [] },
          { id: "r-3", rowType: "ranged", assignments: [] },
        ],
      }),
    ).toEqual({
      name: "Ambush at Dawn",
      rows: [
        { rowType: "ranged", unitIds: [] },
        { rowType: "support", unitIds: ["u-3"] },
        { rowType: "melee", unitIds: ["u-1", "u-2"] },
        { rowType: "tank", unitIds: [] },
      ],
    });
  });

  it("requires a name and exactly the fixed row types", () => {
    expect(validateScenarioForm(createDefaultScenarioFormValues())).toEqual({
      name: "Name is required",
    });

    expect(
      validateScenarioForm({
        name: "Broken",
        rows: [
          { rowType: "tank", unitIds: [] },
          { rowType: "tank", unitIds: [] },
        ],
      }),
    ).toEqual({
      rows: "Rows must include tank, melee, ranged, and support exactly once",
    });
  });

  it("reports whether the scenario form can be saved", () => {
    expect(hasScenarioFormErrors(createDefaultScenarioFormValues())).toBe(true);
    expect(
      hasScenarioFormErrors({
        name: "Frontier Watch",
        rows: SCENARIO_ROW_TYPES.map((rowType) => ({ rowType, unitIds: [] })),
      }),
    ).toBe(false);
  });

  it("tracks dirty state across names, assignments, removals, and reorders", () => {
    const original = {
      name: "Castle Siege",
      rows: [
        { id: "r-1", rowType: "tank", assignments: [] },
        {
          id: "r-2",
          rowType: "melee",
          assignments: [
            { assignmentId: "a-1", unitId: "u-1", unitName: "Barbarian", position: 1 },
            { assignmentId: "a-2", unitId: "u-2", unitName: "Samurai", position: 2 },
          ],
        },
        { id: "r-3", rowType: "ranged", assignments: [] },
        { id: "r-4", rowType: "support", assignments: [] },
      ],
    };

    const matching = scenarioRecordToFormValues(original);
    expect(isScenarioFormDirty(matching, original)).toBe(false);

    expect(
      isScenarioFormDirty(
        { ...matching, name: "Castle Siege Updated" },
        original,
      ),
    ).toBe(true);

    expect(
      isScenarioFormDirty(
        {
          ...matching,
          rows: matching.rows.map((row) =>
            row.rowType === "melee" ? { ...row, unitIds: ["u-2", "u-1"] } : row,
          ),
        },
        original,
      ),
    ).toBe(true);

    expect(
      isScenarioFormDirty(
        {
          ...matching,
          rows: matching.rows.map((row) =>
            row.rowType === "support" ? { ...row, unitIds: ["u-3"] } : row,
          ),
        },
        original,
      ),
    ).toBe(true);
  });
});
