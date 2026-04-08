import { describe, expect, it } from "vitest";
import { computeBasicDamageWithModifiers, computeSpellDamageWithModifiers, getEffectiveStats } from "./math";
import { createItem, createStats } from "./test-helpers";

describe("stats and modifiers", () => {
  it("applies critical chance to outgoing basic and spell damage", () => {
    expect(computeBasicDamageWithModifiers(100, { criticalChance: 25 }, { dodge: 0 })).toBe(125);
    expect(computeSpellDamageWithModifiers(50, { criticalChance: 40 }, { dodge: 0 })).toBe(70);
  });

  it("applies dodge to incoming damage and composes multiplicatively with crit", () => {
    expect(computeBasicDamageWithModifiers(100, { criticalChance: 0 }, { dodge: 30 })).toBe(70);
    expect(computeSpellDamageWithModifiers(50, { criticalChance: 60 }, { dodge: 25 })).toBe(60);
    expect(computeBasicDamageWithModifiers(100, { criticalChance: 50 }, { dodge: 20 })).toBe(120);
  });

  it("stacks item bonuses additively into effective stats", () => {
    const effective = getEffectiveStats(
      createStats({ meleeDmg: 10, criticalChance: 5, dodge: 10 }),
      [
        createItem({ name: "War Sword", meleeDmg: 8, criticalChance: 3 }),
        createItem({ name: "Signet Ring", meleeDmg: 3, criticalChance: 2 }),
        createItem({ name: "Leather Vest", dodge: 15 }),
        createItem({ name: "Nimble Boots", dodge: 5 }),
      ],
      [],
    );

    expect(effective.meleeDmg).toBe(21);
    expect(effective.criticalChance).toBe(10);
    expect(effective.dodge).toBe(30);
  });

  it("floors effective stats at zero", () => {
    const effective = getEffectiveStats(
      createStats({ spellDmg: 2, dodge: 1 }),
      [],
      [{ statKey: "spellDmg", value: -10 }, { statKey: "dodge", value: -5 }],
    );
    expect(effective.spellDmg).toBe(0);
    expect(effective.dodge).toBe(0);
  });
});
