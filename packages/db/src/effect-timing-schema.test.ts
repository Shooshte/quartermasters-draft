import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { effects } from "./schema";

describe("effects timing schema", () => {
  it("stores interval and duration values in tick columns", () => {
    const config = getTableConfig(effects);
    const columns = config.columns.map((column) => column.name);

    expect(columns).toContain("interval_ticks");
    expect(columns).toContain("duration_ticks");
    expect(columns).not.toContain("interval_ms");
    expect(columns).not.toContain("duration_ms");
    expect(config.checks.map((check) => check.name)).toContain("interval_ticks_positive");
    expect(config.checks.map((check) => check.name)).toContain("duration_ticks_positive");
  });
});
