import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationsDirectory = new URL("../drizzle/", import.meta.url);

describe("migration chain", () => {
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
