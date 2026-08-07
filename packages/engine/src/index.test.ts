import { describe, expect, it } from "vitest";
import type { TargetPriority, TargetScope, TargetSelectionShape, UnitInput } from "./index";

describe("engine public type exports", () => {
  it("makes targeting contracts available to TypeScript consumers", () => {
    const consumerTargetScope: TargetScope = "enemies";
    const consumerTargetPriority: TargetPriority = "highest_health";
    const consumerSelectionShape: TargetSelectionShape = "individual";

    expect([consumerTargetScope, consumerTargetPriority, consumerSelectionShape]).toEqual([
      "enemies",
      "highest_health",
      "individual",
    ]);
  });

  it("excludes legacy targeting properties from the public unit input contract", () => {
    const legacyUnit = {
      name: "Legacy",
      stats: {
        health: 100,
        mana: 100,
        meleeDmg: 0,
        rangedDmg: 0,
        manaRegen: 0,
        spellDmg: 0,
        speed: 0,
        dodge: 0,
        criticalChance: 0,
      },
      // @ts-expect-error targetSide has been removed from UnitInput.
      targetSide: "enemies",
    } satisfies UnitInput;

    expect(legacyUnit.targetSide).toBe("enemies");
  });
});
