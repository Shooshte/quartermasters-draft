import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { effects, items, units } from "./schema";

describe("mana capacity schema", () => {
  it("stores unit mana with a 100 default and nonnegative constraint", () => {
    const config = getTableConfig(units);
    const mana = config.columns.find((column) => column.name === "mana");

    expect(mana?.notNull).toBe(true);
    expect(mana?.default).toBe(100);
    expect(config.checks.map((check) => check.name)).toContain("units_mana_nonnegative");
  });

  it("stores signed item and nullable effect mana modifiers", () => {
    const itemMana = getTableConfig(items).columns.find((column) => column.name === "mana");
    const effectMana = getTableConfig(effects).columns.find((column) => column.name === "mana");

    expect(itemMana?.notNull).toBe(true);
    expect(itemMana?.default).toBe(0);
    expect(effectMana?.notNull).toBe(false);
  });
});
