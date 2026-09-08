import { describe, expect, it } from "vitest";
import {
  computeBasicDamageWithModifiers,
  computeSpellDamageWithModifiers,
  getEffectiveStats,
} from "./math";
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

  it("stacks item mana into effective capacity and floors it at zero", () => {
    expect(
      getEffectiveStats(
        createStats({ mana: 100 }),
        [createItem({ name: "Focus", mana: 25 }), createItem({ name: "Curse", mana: -10 })],
        [],
      ).mana,
    ).toBe(115);

    expect(
      getEffectiveStats(createStats({ mana: 20 }), [createItem({ name: "Drain", mana: -50 })], [])
        .mana,
    ).toBe(0);
  });

  it("floors effective stats at zero", () => {
    const effective = getEffectiveStats(
      createStats({ spellDmg: 2, dodge: 1 }),
      [],
      [
        { statKey: "spellDmg", value: -10 },
        { statKey: "dodge", value: -5 },
      ],
    );
    expect(effective.spellDmg).toBe(0);
    expect(effective.dodge).toBe(0);
  });

  it("combines item bonuses and active effect modifiers additively", () => {
    const effective = getEffectiveStats(
      createStats({ meleeDmg: 10, rangedDmg: 4, speed: 5 }),
      [
        createItem({ name: "Axe", meleeDmg: 7, rangedDmg: 1 }),
        createItem({ name: "Boots", dodge: 3 }),
      ],
      [
        { statKey: "meleeDmg", value: 5 },
        { statKey: "speed", value: 2 },
        { statKey: "dodge", value: -1 },
      ],
    );

    expect(effective.meleeDmg).toBe(22);
    expect(effective.rangedDmg).toBe(5);
    expect(effective.speed).toBe(7);
    expect(effective.dodge).toBe(2);
  });

  it("returns base stats when items and modifiers are both empty", () => {
    const base = createStats({ health: 55, meleeDmg: 12, speed: 4 });

    expect(getEffectiveStats(base, [], [])).toEqual(base);
  });

  it("clamps each stat key individually at zero", () => {
    const effective = getEffectiveStats(
      createStats({
        health: 1,
        mana: 8,
        meleeDmg: 2,
        rangedDmg: 3,
        manaRegen: 4,
        spellDmg: 5,
        speed: 6,
        dodge: 7,
        criticalChance: 8,
      }),
      [],
      [
        { statKey: "health", value: -10 },
        { statKey: "mana", value: -10 },
        { statKey: "meleeDmg", value: -10 },
        { statKey: "rangedDmg", value: -10 },
        { statKey: "manaRegen", value: -10 },
        { statKey: "spellDmg", value: -10 },
        { statKey: "speed", value: -10 },
        { statKey: "dodge", value: -10 },
        { statKey: "criticalChance", value: -10 },
      ],
    );

    expect(effective).toEqual({
      health: 0,
      mana: 0,
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 0,
      spellDmg: 0,
      speed: 0,
      dodge: 0,
      criticalChance: 0,
    });
  });
});
