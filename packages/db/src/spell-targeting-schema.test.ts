import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { spells, targetPolicyEnum, targetScopeEnum } from "./schema";

describe("spell targeting schema", () => {
  it("defaults spell target scope to self and others", () => {
    const targetScope = getTableConfig(spells).columns.find(
      (column) => column.name === "target_scope",
    );

    expect(targetScope?.notNull).toBe(true);
    expect(targetScope?.default).toBe("self_and_others");
    expect(targetScopeEnum.enumValues).toEqual(["self", "self_and_others", "others"]);
  });

  it("supports self target priority and rejects it with others scope", () => {
    const checks = getTableConfig(spells).checks.map((check) => check.name);

    expect(targetPolicyEnum.enumValues).toContain("self");
    expect(checks).toContain("self_priority_requires_self_eligible_scope");
  });
});
