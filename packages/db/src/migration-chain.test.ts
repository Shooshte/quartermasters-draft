import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationsDirectory = new URL("../drizzle/", import.meta.url);

describe("migration chain", () => {
  it("migrates effect timing to action counts without preserving tick values", () => {
    const migrationSql = readFileSync(
      new URL("../drizzle/0017_event_driven_effect_timing.sql", import.meta.url),
      "utf8",
    );

    expect(migrationSql).toContain(
      'ALTER TABLE "effects" RENAME COLUMN "interval_ticks" TO "trigger_every_actions"',
    );
    expect(migrationSql).toContain(
      'ALTER TABLE "effects" RENAME COLUMN "duration_ticks" TO "lasts_for_actions"',
    );
    expect(migrationSql).toContain('UPDATE "effects" SET "trigger_every_actions" = NULL;');
    expect(migrationSql).toContain('UPDATE "effects" SET "lasts_for_actions" = NULL;');
  });

  it("adds each item activation cost constraint only once", () => {
    const migrationSql = readdirSync(migrationsDirectory)
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort()
      .map((fileName) => readFileSync(new URL(fileName, migrationsDirectory), "utf8"))
      .join("\n");

    for (const constraintName of [
      "items_activation_mana_cost_nonnegative",
      "items_activation_health_cost_nonnegative",
    ]) {
      const additions = migrationSql.match(new RegExp(`ADD CONSTRAINT "${constraintName}"`, "g"));

      expect(additions, constraintName).toHaveLength(1);
    }
  });
});
