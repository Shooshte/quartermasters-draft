import { describe, expect, it } from "vitest";
import {
  createDefaultItemFormValues,
  isItemFormDirty,
  normalizeItemFormValues,
  validateItemForm,
} from "~/components/create/item-form";

describe("item-form", () => {
  it("creates zeroed defaults for a new item", () => {
    expect(createDefaultItemFormValues()).toEqual({
      name: "",
      meleeDmg: "0",
      rangedDmg: "0",
      manaRegen: "0",
      spellDmg: "0",
      dodge: "0",
      criticalChance: "0",
      activationManaCost: "0",
      activationHealthCost: "0",
      spellIds: [],
    });
  });

  it("normalizes decimal stats, trims names, and dedupes linked spells", () => {
    expect(
      normalizeItemFormValues({
        name: "  Arcane Focus  ",
        meleeDmg: "12.5",
        rangedDmg: "0",
        manaRegen: "-1.25",
        spellDmg: "4",
        dodge: "0",
        criticalChance: "7.25",
        activationManaCost: "3",
        activationHealthCost: "0",
        spellIds: ["sp-1", "sp-1", "sp-2"],
      }),
    ).toEqual({
      name: "Arcane Focus",
      meleeDmg: 12.5,
      rangedDmg: 0,
      manaRegen: -1.25,
      spellDmg: 4,
      dodge: 0,
      criticalChance: 7.25,
      activationManaCost: 3,
      activationHealthCost: 0,
      spellIds: ["sp-1", "sp-2"],
    });
  });

  it("validates activation costs and linked spell requirements", () => {
    expect(
      validateItemForm({
        name: "Broken Relay",
        meleeDmg: "0",
        rangedDmg: "0",
        manaRegen: "0",
        spellDmg: "0",
        dodge: "0",
        criticalChance: "0",
        activationManaCost: "-1",
        activationHealthCost: "-2",
        spellIds: [],
      }),
    ).toMatchObject({
      activationManaCost: "Must be zero or greater",
      activationHealthCost: "Must be zero or greater",
      spellIds: "At least one linked spell is required",
    });
  });

  it("treats linked spells as an unordered set and numeric strings by parsed value for dirty checks", () => {
    expect(
      isItemFormDirty(
        {
          name: "Oak Staff",
          meleeDmg: "0.0",
          rangedDmg: "0",
          manaRegen: "3",
          spellDmg: "12.00",
          dodge: "0",
          criticalChance: "0",
          activationManaCost: "0",
          activationHealthCost: "0",
          spellIds: ["sp-2", "sp-1"],
        },
        {
          name: "Oak Staff",
          meleeDmg: 0,
          rangedDmg: 0,
          manaRegen: 3,
          spellDmg: 12,
          dodge: 0,
          criticalChance: 0,
          activationManaCost: 0,
          activationHealthCost: 0,
          spellIds: ["sp-1", "sp-2"],
        },
      ),
    ).toBe(false);
  });

  it("treats a modified create form as dirty against item defaults", () => {
    expect(
      isItemFormDirty(
        {
          ...createDefaultItemFormValues(),
          name: "Bronze Buckler",
          spellIds: ["sp-1"],
        },
        null,
      ),
    ).toBe(true);
  });
});
