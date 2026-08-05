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
      mana: "100",
      rangedDmg: "0",
      manaRegen: "0",
      spellDmg: "0",
      speed: "0",
      dodge: "0",
      criticalChance: "0",
      itemIds: [],
      targetSide: "enemies",
      targetPolicy: "highest_health",
      targetRowCount: 1,
      maxTargetsPerRow: 1,
      targetOnlyAdjacent: false,
      allowedRowTypes: [],
    });
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
        targetSide: "enemies",
        targetPolicy: "highest_health",
        targetRowCount: 1,
        maxTargetsPerRow: 1,
        targetOnlyAdjacent: false,
        allowedRowTypes: [],
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
      targetSide: "enemies",
      targetPolicy: "highest_health",
      targetRowCount: 1,
      maxTargetsPerRow: 1,
      targetOnlyAdjacent: false,
      allowedRowTypes: [],
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

  it("requires an explicit target side", () => {
    expect(
      validateUnitForm({
        ...createDefaultUnitFormValues(),
        name: "Lost Archer",
        targetSide: "",
      }),
    ).toMatchObject({ targetSide: "Target side is required" });
  });

  it("rejects self priority when targeting enemies", () => {
    expect(
      validateUnitForm({
        ...createDefaultUnitFormValues(),
        name: "Confused Duelist",
        targetSide: "enemies",
        targetPolicy: "self",
      }),
    ).toMatchObject({ targetSide: "Self priority cannot be used when targeting enemies" });
  });

  it.each([
    {
      maxTargetsPerRow: null,
      message: "Adjacent targeting requires a limited number of targets per row",
    },
    { maxTargetsPerRow: 1, message: "Adjacent targeting requires at least 2 targets per row" },
  ])("rejects adjacent targeting when max targets per row is $maxTargetsPerRow", ({
    maxTargetsPerRow,
    message,
  }) => {
    expect(
      validateUnitForm({
        ...createDefaultUnitFormValues(),
        name: "Broken Formation",
        maxTargetsPerRow,
        targetOnlyAdjacent: true,
      }),
    ).toMatchObject({ targetOnlyAdjacent: message });
  });

  it("normalizes targeting fields without inferring them from linked items", () => {
    expect(
      normalizeUnitFormValues({
        ...createDefaultUnitFormValues(),
        name: "  Ally Vanguard  ",
        targetSide: "allies",
        targetPolicy: "lowest_health",
        targetRowCount: 2,
        maxTargetsPerRow: 3,
        targetOnlyAdjacent: true,
        allowedRowTypes: ["tank", "melee"],
      }),
    ).toMatchObject({
      name: "Ally Vanguard",
      targetSide: "allies",
      targetPolicy: "lowest_health",
      targetRowCount: 2,
      maxTargetsPerRow: 3,
      targetOnlyAdjacent: true,
      allowedRowTypes: ["tank", "melee"],
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
