import { describe, expect, it } from "vitest";
import {
  computeUnitStatPreviews,
  createDefaultUnitFormValues,
  isUnitFormDirty,
  normalizeUnitFormValues,
  validateUnitForm,
} from "~/components/create/unit-form";

describe("unit-form", () => {
  it("creates zeroed defaults for a new unit", () => {
    expect(createDefaultUnitFormValues()).toEqual({
      name: "",
      meleeDmg: "0",
      health: "0",
      mana: "100",
      rangedDmg: "0",
      manaRegen: "0",
      spellDmg: "0",
      speed: "0",
      dodge: "0",
      criticalChance: "0",
      itemIds: [],
      targetScope: "enemies",
      targetPriority: "highest_health",
      targetCount: 1,
      selectionShape: "individual",
    });
  });

  it("adds linked item stats once per occurrence and ignores unavailable item options", () => {
    const previews = computeUnitStatPreviews(
      {
        ...createDefaultUnitFormValues(),
        meleeDmg: "10",
        health: "95",
        speed: "1.25",
        criticalChance: "2",
        itemIds: ["sword", "missing", "sword"],
      },
      [
        {
          id: "sword",
          name: "Iron Sword",
          meleeDmg: 8,
          criticalChance: 3,
        },
      ],
    );

    expect(previews.meleeDmg).toEqual({ finalValue: 26, itemBonus: 16 });
    expect(previews.criticalChance).toEqual({ finalValue: 8, itemBonus: 6 });
    expect(previews.health).toEqual({ finalValue: 95, itemBonus: 0 });
    expect(previews.speed).toEqual({ finalValue: 1.25, itemBonus: 0 });
  });

  it("clamps final stats at zero while preserving the raw item contribution", () => {
    const previews = computeUnitStatPreviews(
      {
        ...createDefaultUnitFormValues(),
        dodge: "2",
        itemIds: ["curse"],
      },
      [{ id: "curse", name: "Cursed Boots", dodge: -5 }],
    );

    expect(previews.dodge).toEqual({ finalValue: 0, itemBonus: -5 });
  });

  it("returns no final value for a non-finite unit base stat", () => {
    const previews = computeUnitStatPreviews(
      {
        ...createDefaultUnitFormValues(),
        spellDmg: "Infinity",
        itemIds: ["staff"],
      },
      [{ id: "staff", name: "Oak Staff", spellDmg: 12 }],
    );

    expect(previews.spellDmg).toEqual({ finalValue: null, itemBonus: 12 });
  });

  it("rejects negative mana capacity", () => {
    expect(
      validateUnitForm({
        ...createDefaultUnitFormValues(),
        name: "Broken Mage",
        mana: "-1",
      }),
    ).toMatchObject({ mana: "Must be zero or greater" });
  });

  it("rejects non-finite mana capacity", () => {
    expect(
      validateUnitForm({
        ...createDefaultUnitFormValues(),
        name: "Impossible Mage",
        mana: "Infinity",
      }),
    ).toMatchObject({ mana: "Must be a valid number" });
  });

  it("normalizes decimal stats, trims names, and preserves ordered duplicate linked items", () => {
    expect(
      normalizeUnitFormValues({
        name: "  Twinblade Adept  ",
        meleeDmg: "12.5",
        health: "82.25",
        mana: "100",
        rangedDmg: "0",
        manaRegen: "-1.25",
        spellDmg: "4",
        speed: "1.35",
        dodge: "6.5",
        criticalChance: "7.25",
        itemIds: ["it-1", "it-1", "it-2"],
        targetScope: "both",
        targetPriority: "highest_health",
        targetCount: 2,
        selectionShape: "adjacent",
      }),
    ).toEqual({
      name: "Twinblade Adept",
      meleeDmg: 12.5,
      health: 82.25,
      mana: 100,
      rangedDmg: 0,
      manaRegen: -1.25,
      spellDmg: 4,
      speed: 1.35,
      dodge: 6.5,
      criticalChance: 7.25,
      itemIds: ["it-1", "it-1", "it-2"],
      targetScope: "both",
      targetPriority: "highest_health",
      targetCount: 2,
      selectionShape: "adjacent",
    });
  });

  it("requires a name and valid numeric fields", () => {
    expect(
      validateUnitForm({
        ...createDefaultUnitFormValues(),
        name: " ",
        health: "oops",
      }),
    ).toMatchObject({
      name: "Name is required",
      health: "Must be a valid number",
    });
  });

  it("allows empty linked item ids when the rest of the form is valid", () => {
    expect(
      validateUnitForm({
        ...createDefaultUnitFormValues(),
        name: "Barehand Adept",
        itemIds: [],
      }),
    ).toEqual({});
  });

  it("requires an explicit target scope", () => {
    expect(
      validateUnitForm({
        ...createDefaultUnitFormValues(),
        name: "Lost Archer",
        targetScope: "",
      }),
    ).toMatchObject({ targetScope: "Target scope is required" });
  });

  it("requires an explicit target priority", () => {
    expect(
      validateUnitForm({
        ...createDefaultUnitFormValues(),
        name: "Confused Duelist",
        targetPriority: "",
      }),
    ).toMatchObject({ targetPriority: "Target priority is required" });
  });

  it.each([0, -1])("rejects a non-positive target count of %s", (targetCount) => {
    expect(
      validateUnitForm({
        ...createDefaultUnitFormValues(),
        name: "Broken Formation",
        targetCount,
      }),
    ).toMatchObject({ targetCount: "Target count must be at least 1" });
  });

  it("normalizes targeting fields without inferring them from linked items", () => {
    expect(
      normalizeUnitFormValues({
        ...createDefaultUnitFormValues(),
        name: "  Ally Vanguard  ",
        targetScope: "both",
        targetPriority: "lowest_health",
        targetCount: 2,
        selectionShape: "adjacent",
      }),
    ).toMatchObject({
      name: "Ally Vanguard",
      targetScope: "both",
      targetPriority: "lowest_health",
      targetCount: 2,
      selectionShape: "adjacent",
    });
  });

  it("treats linked items as ordered and duplicate-aware for dirty checks", () => {
    expect(
      isUnitFormDirty(
        {
          ...createDefaultUnitFormValues(),
          name: "Barbarian",
          meleeDmg: "15.0",
          health: "100.00",
          mana: "100",
          rangedDmg: "0",
          manaRegen: "0",
          spellDmg: "0",
          speed: "1",
          dodge: "5.0",
          criticalChance: "10.00",
          itemIds: ["it-2", "it-1"],
        },
        {
          name: "Barbarian",
          meleeDmg: 15,
          health: 100,
          mana: 100,
          rangedDmg: 0,
          manaRegen: 0,
          spellDmg: 0,
          speed: 1,
          dodge: 5,
          criticalChance: 10,
          itemIds: ["it-1", "it-2"],
        },
      ),
    ).toBe(true);
  });

  it("treats a modified create form as dirty against unit defaults", () => {
    expect(
      isUnitFormDirty(
        {
          ...createDefaultUnitFormValues(),
          name: "Bronze Sentinel",
          itemIds: ["it-1"],
        },
        null,
      ),
    ).toBe(true);
  });
});
