import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { itemsEffects, targetPolicyEnum, targetSideEnum, units, unitsAllowedRows } from "./schema";

describe("unit targeting schema", () => {
  it("defines explicit unit targeting defaults", () => {
    const columns = getTableConfig(units).columns;

    expect(targetSideEnum.enumValues).toEqual(["allies", "enemies", "self"]);
    expect(targetPolicyEnum.enumValues).toEqual([
      "highest_health",
      "lowest_health",
      "highest_damage",
      "random",
      "self",
    ]);
    expect(columns.find((column) => column.name === "target_side")?.default).toBe("enemies");
    expect(columns.find((column) => column.name === "target_policy")?.default).toBe(
      "highest_health",
    );
    expect(columns.find((column) => column.name === "target_row_count")?.default).toBe(1);
    expect(columns.find((column) => column.name === "max_targets_per_row")?.default).toBe(1);
    expect(columns.find((column) => column.name === "target_only_adjacent")?.default).toBe(false);
  });

  it("constrains unit targeting configuration", () => {
    const checks = getTableConfig(units).checks.map((check) => check.name);

    expect(checks).toEqual(
      expect.arrayContaining([
        "units_target_row_count_range",
        "units_max_targets_per_row_positive",
        "units_target_only_adjacent_whole_row",
        "units_target_only_adjacent_min_targets",
        "units_self_policy_requires_non_enemy_side",
      ]),
    );
  });

  it("stores explicit allowed rows uniquely per unit", () => {
    const config = getTableConfig(unitsAllowedRows);

    expect(config.indexes.map((index) => index.config.name)).toContain(
      "units_allowed_rows_unit_id_idx",
    );
    expect(config.uniqueConstraints.map((constraint) => constraint.name)).toContain(
      "units_allowed_rows_unit_id_row_type_unique",
    );
  });

  it("stores ordered item effects with indexed foreign keys", () => {
    const config = getTableConfig(itemsEffects);

    expect(config.indexes.map((index) => index.config.name)).toEqual(
      expect.arrayContaining(["items_effects_item_id_idx", "items_effects_effect_template_id_idx"]),
    );
    expect(config.checks.map((check) => check.name)).toContain(
      "items_effects_sequence_order_positive",
    );
    expect(config.uniqueConstraints.map((constraint) => constraint.name)).toContain(
      "items_effects_item_id_sequence_order_unique",
    );
  });
});
