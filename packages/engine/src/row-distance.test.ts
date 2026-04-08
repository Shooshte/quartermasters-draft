import { describe, expect, it } from "vitest";
import { computeBasicAttackDamage, computeRowDistanceMultiplier } from "./math";
import type { RowType } from "./types";

describe("row distance damage penalty", () => {
  const cases: Array<[RowType, RowType, number]> = [
    ["tank", "tank", 100],
    ["tank", "melee", 75],
    ["tank", "ranged", 50],
    ["tank", "support", 25],
    ["melee", "tank", 75],
    ["melee", "melee", 50],
    ["melee", "ranged", 25],
    ["melee", "support", 0],
    ["ranged", "tank", 50],
    ["ranged", "melee", 25],
    ["ranged", "ranged", 0],
    ["ranged", "support", 0],
    ["support", "tank", 25],
    ["support", "melee", 0],
    ["support", "ranged", 0],
    ["support", "support", 0],
  ];

  it.each(cases)("computes %s -> %s basic attack damage", (attackerRow, targetRow, expected) => {
    expect(computeBasicAttackDamage(100, attackerRow, targetRow)).toBe(expected);
  });

  it("returns zero when distance penalty fully wipes damage and leaves spell damage unchanged", () => {
    expect(computeBasicAttackDamage(100, "melee", "support")).toBe(0);
    expect(computeRowDistanceMultiplier("support", "support")).toBe(0);
  });
});
