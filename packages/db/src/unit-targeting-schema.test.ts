import { readdirSync, readFileSync } from "node:fs";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  itemsAllowedRows,
  itemsEffects,
  targetPriorityEnum,
  targetScopeEnum,
  targetSelectionShapeEnum,
  units,
} from "./schema";

const migrationFileName = readdirSync(new URL("../drizzle/", import.meta.url)).find((fileName) =>
  fileName.startsWith("0016_"),
);

if (!migrationFileName) {
  throw new Error("Expected a 0016 targeting and item placement migration");
}

const migrationSql = readFileSync(
  new URL(`../drizzle/${migrationFileName}`, import.meta.url),
  "utf8",
);

describe("unit targeting schema", () => {
  it("defines explicit unit targeting defaults", () => {
    const columns = getTableConfig(units).columns;

    expect(targetScopeEnum.enumValues).toEqual([
      "self",
      "self_allies",
      "self_enemies",
      "allies",
      "enemies",
      "both",
    ]);
    expect(targetPriorityEnum.enumValues).toEqual([
      "highest_health",
      "lowest_health",
      "highest_damage",
      "support",
      "random",
    ]);
    expect(targetSelectionShapeEnum.enumValues).toEqual(["individual", "adjacent"]);
    expect(columns.find((column) => column.name === "target_scope")?.default).toBe("enemies");
    expect(columns.find((column) => column.name === "target_priority")?.default).toBe(
      "highest_health",
    );
    expect(columns.find((column) => column.name === "target_count")?.default).toBe(1);
    expect(columns.find((column) => column.name === "selection_shape")?.default).toBe("individual");
    expect(columns.map((column) => column.name)).not.toEqual(
      expect.arrayContaining([
        "target_side",
        "target_policy",
        "target_row_count",
        "max_targets_per_row",
        "target_only_adjacent",
      ]),
    );
  });

  it("constrains unit targeting configuration", () => {
    const checks = getTableConfig(units).checks.map((check) => check.name);

    expect(checks).toContain("units_target_count_positive");
  });

  it("stores explicit allowed rows uniquely per item", () => {
    const config = getTableConfig(itemsAllowedRows);

    expect(config.indexes.map((index) => index.config.name)).toContain(
      "items_allowed_rows_item_id_idx",
    );
    expect(config.uniqueConstraints.map((constraint) => constraint.name)).toContain(
      "items_allowed_rows_item_id_row_type_unique",
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

  it("migrates legacy unit targeting values before dropping their columns", () => {
    const updatePosition = migrationSql.indexOf('UPDATE "units"');
    const firstLegacyColumnDropPosition = migrationSql.indexOf(
      'ALTER TABLE "units" DROP COLUMN "target_side"',
    );

    expect(updatePosition).toBeGreaterThan(-1);
    expect(updatePosition).toBeLessThan(firstLegacyColumnDropPosition);
    expect(migrationSql).toContain("\"target_policy\"::text = 'self'");
    expect(migrationSql).toContain('COALESCE("max_targets_per_row", 1)');
    expect(migrationSql).toContain(
      'CASE WHEN "target_only_adjacent" THEN \'adjacent\'::"target_selection_shape"',
    );
  });

  it("backfills all four rows for existing items before dropping legacy row restrictions", () => {
    const backfillPosition = migrationSql.indexOf('INSERT INTO "items_allowed_rows"');
    const legacyTableDropPosition = migrationSql.indexOf('DROP TABLE "units_allowed_rows"');

    expect(backfillPosition).toBeGreaterThan(-1);
    expect(backfillPosition).toBeLessThan(legacyTableDropPosition);
    for (const rowType of ["support", "ranged", "melee", "tank"]) {
      expect(migrationSql).toContain(`('${rowType}'::"row_type")`);
    }
  });
});
