import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { effects } from "./schema";

describe("effects timing schema", () => {
  it("stores taunt capability as false by default", () => {
    const config = getTableConfig(effects);
    const tauntColumn = config.columns.find((column) => column.name === "is_taunt");

    expect(tauntColumn).toMatchObject({
      name: "is_taunt",
      notNull: true,
      default: false,
    });
  });

  it("stores affected-unit action timing", () => {
    const config = getTableConfig(effects);
    const columns = config.columns.map((column) => column.name);

    expect(columns).toContain("trigger_every_actions");
    expect(columns).toContain("lasts_for_actions");
    expect(columns).not.toContain("interval_ticks");
    expect(columns).not.toContain("duration_ticks");
    expect(config.checks.map((check) => check.name)).toEqual(
      expect.arrayContaining(["trigger_every_actions_positive", "lasts_for_actions_positive"]),
    );
  });
});
