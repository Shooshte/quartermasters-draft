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
      mana: "0",
      manaRegen: "0",
      spellDmg: "0",
      dodge: "0",
      criticalChance: "0",
      activationManaCost: "0",
      activationHealthCost: "0",
      effectIds: [],
    });
  });

  it("accepts signed mana capacity modifiers", () => {
    expect(
      normalizeItemFormValues({
        ...createDefaultItemFormValues(),
        name: "Draining Focus",
        mana: "-25",
      }).mana,
    ).toBe(-25);
  });

  it("normalizes decimal stats, trims names, and preserves ordered duplicate effects", () => {
    expect(
      normalizeItemFormValues({
        name: "  Arcane Focus  ",
        meleeDmg: "12.5",
        rangedDmg: "0",
        mana: "0",
        manaRegen: "-1.25",
        spellDmg: "4",
        dodge: "0",
        criticalChance: "7.25",
        activationManaCost: "3",
        activationHealthCost: "0",
        effectIds: ["eff-2", "eff-1", "eff-2"],
      }),
    ).toEqual({
      name: "Arcane Focus",
      meleeDmg: 12.5,
      rangedDmg: 0,
      mana: 0,
      manaRegen: -1.25,
      spellDmg: 4,
      dodge: 0,
      criticalChance: 7.25,
      activationManaCost: 3,
      activationHealthCost: 0,
      effectIds: ["eff-2", "eff-1", "eff-2"],
    });
  });

  it("validates activation costs without requiring linked effects", () => {
    expect(
      validateItemForm({
        name: "Broken Relay",
        meleeDmg: "0",
        rangedDmg: "0",
        mana: "0",
        manaRegen: "0",
        spellDmg: "0",
        dodge: "0",
        criticalChance: "0",
        activationManaCost: "-1",
        activationHealthCost: "-2",
        effectIds: [],
      }),
    ).toMatchObject({
      activationManaCost: "Must be zero or greater",
      activationHealthCost: "Must be zero or greater",
    });
  });

  it("allows empty linked effect ids when the rest of the form is valid", () => {
    expect(
      validateItemForm({
        name: "Effect-less Relic",
        meleeDmg: "0",
        rangedDmg: "0",
        mana: "0",
        manaRegen: "0",
        spellDmg: "0",
        dodge: "0",
        criticalChance: "0",
        activationManaCost: "0",
        activationHealthCost: "0",
        effectIds: [],
      }),
    ).toEqual({});
  });

  it("treats reordered linked effects as dirty while comparing numeric strings by parsed value", () => {
    expect(
      isItemFormDirty(
        {
          name: "Oak Staff",
          meleeDmg: "0.0",
          rangedDmg: "0",
          mana: "0",
          manaRegen: "3",
          spellDmg: "12.00",
          dodge: "0",
          criticalChance: "0",
          activationManaCost: "0",
          activationHealthCost: "0",
          effectIds: ["eff-2", "eff-1"],
        },
        {
          name: "Oak Staff",
          meleeDmg: 0,
          rangedDmg: 0,
          mana: 0,
          manaRegen: 3,
          spellDmg: 12,
          dodge: 0,
          criticalChance: 0,
          activationManaCost: 0,
          activationHealthCost: 0,
          effectIds: ["eff-1", "eff-2"],
        },
      ),
    ).toBe(true);
  });

  it("treats a modified create form as dirty against item defaults", () => {
    expect(
      isItemFormDirty(
        {
          ...createDefaultItemFormValues(),
          name: "Bronze Buckler",
          effectIds: ["eff-1"],
        },
        null,
      ),
    ).toBe(true);
  });
});
