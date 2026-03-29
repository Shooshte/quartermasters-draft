import { describe, expect, it } from "vitest";
import {
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
      rangedDmg: "0",
      manaRegen: "0",
      spellDmg: "0",
      speed: "0",
      dodge: "0",
      criticalChance: "0",
      itemIds: [],
    });
  });

  it("normalizes decimal stats, trims names, and preserves ordered duplicate linked items", () => {
    expect(
      normalizeUnitFormValues({
        name: "  Twinblade Adept  ",
        meleeDmg: "12.5",
        health: "82.25",
        rangedDmg: "0",
        manaRegen: "-1.25",
        spellDmg: "4",
        speed: "1.35",
        dodge: "6.5",
        criticalChance: "7.25",
        itemIds: ["it-1", "it-1", "it-2"],
      }),
    ).toEqual({
      name: "Twinblade Adept",
      meleeDmg: 12.5,
      health: 82.25,
      rangedDmg: 0,
      manaRegen: -1.25,
      spellDmg: 4,
      speed: 1.35,
      dodge: 6.5,
      criticalChance: 7.25,
      itemIds: ["it-1", "it-1", "it-2"],
    });
  });

  it("requires a name and valid numeric fields", () => {
    expect(
      validateUnitForm({
        name: " ",
        meleeDmg: "0",
        health: "oops",
        rangedDmg: "0",
        manaRegen: "0",
        spellDmg: "0",
        speed: "0",
        dodge: "0",
        criticalChance: "0",
        itemIds: [],
      }),
    ).toMatchObject({
      name: "Name is required",
      health: "Must be a valid number",
    });
  });

  it("allows empty linked item ids when the rest of the form is valid", () => {
    expect(
      validateUnitForm({
        name: "Barehand Adept",
        meleeDmg: "0",
        health: "0",
        rangedDmg: "0",
        manaRegen: "0",
        spellDmg: "0",
        speed: "0",
        dodge: "0",
        criticalChance: "0",
        itemIds: [],
      }),
    ).toEqual({});
  });

  it("treats linked items as ordered and duplicate-aware for dirty checks", () => {
    expect(
      isUnitFormDirty(
        {
          name: "Barbarian",
          meleeDmg: "15.0",
          health: "100.00",
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
