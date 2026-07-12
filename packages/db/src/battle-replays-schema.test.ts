import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "./schema";

describe("battleReplays schema", () => {
  it("stores a text seed and prevents identical scenarios", () => {
    expect(schema.battleReplays).toBeDefined();
    const config = getTableConfig(schema.battleReplays);
    expect(config.columns.find((column) => column.name === "seed")?.dataType).toBe("string");
    expect(config.checks.map((check) => check.name)).toContain(
      "battle_replays_distinct_scenarios",
    );
  });

  it("cascades deletion through both scenario references", () => {
    const config = getTableConfig(schema.battleReplays);
    expect(config.foreignKeys).toHaveLength(2);
    expect(config.foreignKeys.every((foreignKey) => foreignKey.onDelete === "cascade")).toBe(true);
  });
});
