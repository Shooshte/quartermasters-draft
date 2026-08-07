import { describe, expect, it } from "vitest";
import { BattleEngine } from "./battle-engine";
import {
  createBattleInput,
  createItem,
  createScenario,
  createStats,
  createUnit,
} from "./test-helpers";

function getUnitByName(engine: BattleEngine, scenarioId: string, name: string) {
  const state = engine.getState();
  const scenario = state.scenarios.find((candidate) => candidate.id === scenarioId);
  if (!scenario) throw new Error(`Scenario not found: ${scenarioId}`);
  for (const row of Object.values(scenario.rows)) {
    const found = row.find((unit) => unit.name === name);
    if (found) return found;
  }
  throw new Error(`Unit not found: ${name}`);
}

describe("battle setup", () => {
  it("initializes current mana at effective base plus item capacity", () => {
    const engine = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          support: [
            createUnit("Mage", {
              stats: createStats({ mana: 200 }),
              items: [createItem({ name: "Focus", mana: 25 })],
            }),
          ],
        }),
        createScenario("B", { tank: [createUnit("Dummy")] }),
      ]),
    );

    expect(getUnitByName(engine, "A", "Mage").mana).toBe(225);
  });

  it("defaults and preserves the targeting and item placement contracts", () => {
    const engine = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          support: [
            createUnit("Mage", {
              items: [createItem({ name: "Focus", allowedRowTypes: ["support"] })],
            }),
          ],
        }),
        createScenario("B", { tank: [createUnit("Dummy")] }),
      ]),
    );

    const mage = getUnitByName(engine, "A", "Mage");
    expect(mage.targetScope).toBe("enemies");
    expect(mage.targetPriority).toBe("highest_health");
    expect(mage.targetCount).toBe(1);
    expect(mage.selectionShape).toBe("individual");
    expect(mage.items[0]?.allowedRowTypes).toEqual(["support"]);
  });

  it("initializes battle state with fixed row order, zero action bar, full mana, and base health", () => {
    const alpha = createScenario("Alpha", {
      tank: [
        createUnit("Templar", { stats: createStats({ health: 150, meleeDmg: 20, dodge: 5 }) }),
      ],
      melee: [
        createUnit("Barbarian", {
          stats: createStats({ health: 120, meleeDmg: 28, criticalChance: 15 }),
        }),
      ],
      ranged: [
        createUnit("Archer", { stats: createStats({ health: 80, rangedDmg: 25, speed: 12 }) }),
      ],
      support: [
        createUnit("Cleric", { stats: createStats({ health: 70, manaRegen: 6, spellDmg: 15 }) }),
      ],
    });
    const bravo = createScenario("Bravo", {
      melee: [createUnit("Barbarian", { stats: createStats({ health: 120, meleeDmg: 28 }) })],
    });

    const engine = new BattleEngine(createBattleInput([alpha, bravo], 42));
    const state = engine.getState();

    expect(state.tick).toBe(0);
    expect(state.scenarios[0].id).toBe("Alpha");
    expect(Object.keys(state.scenarios[0].rows)).toEqual(["tank", "melee", "ranged", "support"]);
    expect(getUnitByName(engine, "Alpha", "Templar").actionBar).toBe(0);
    expect(getUnitByName(engine, "Alpha", "Templar").mana).toBe(100);
    expect(getUnitByName(engine, "Alpha", "Templar").currentHealth).toBe(150);
    expect(getUnitByName(engine, "Bravo", "Barbarian").currentHealth).toBe(120);
  });

  it("keeps empty rows and multiple units in slot order", () => {
    const alpha = createScenario("Alpha", {
      melee: [
        createUnit("Barbarian", { stats: createStats({ health: 120 }) }),
        createUnit("Templar", { stats: createStats({ health: 150 }) }),
        createUnit("Barbarian Clone", { stats: createStats({ health: 120 }) }),
      ],
    });
    const bravo = createScenario("Bravo", {
      ranged: [
        createUnit("Archer", { stats: createStats({ health: 80 }) }),
        createUnit("Archer Clone", { stats: createStats({ health: 80 }) }),
      ],
    });

    const engine = new BattleEngine(createBattleInput([alpha, bravo], 12));
    const state = engine.getState();

    expect(state.scenarios[0].rows.tank).toHaveLength(0);
    expect(state.scenarios[0].rows.support).toHaveLength(0);
    expect(state.scenarios[0].rows.melee.map((unit) => [unit.slot, unit.name])).toEqual([
      [1, "Barbarian"],
      [2, "Templar"],
      [3, "Barbarian Clone"],
    ]);
    expect(state.scenarios[1].rows.ranged.map((unit) => [unit.slot, unit.name])).toEqual([
      [1, "Archer"],
      [2, "Archer Clone"],
    ]);
  });

  it("applies additive item bonuses independently per unit instance", () => {
    const sword = createItem({ name: "Iron Sword", meleeDmg: 10, criticalChance: 5 });
    const shield = createItem({ name: "Oak Shield", dodge: 8 });
    const staff = createItem({
      name: "Crystal Staff",
      spellDmg: 12,
      manaRegen: 3,
      criticalChance: 2,
    });
    const templar = createUnit("Templar", {
      stats: createStats({ health: 150, meleeDmg: 20, dodge: 5, criticalChance: 10 }),
      items: [sword, shield],
    });
    const mage = createUnit("Mage", {
      stats: createStats({ health: 60, spellDmg: 30, manaRegen: 5, criticalChance: 6 }),
      items: [staff],
    });

    const engine = new BattleEngine(
      createBattleInput([
        createScenario("Alpha", { tank: [templar], support: [mage] }),
        createScenario("Bravo", {
          support: [createUnit("Mage", { stats: mage.stats, items: [staff] })],
        }),
      ]),
    );

    const templarState = getUnitByName(engine, "Alpha", "Templar");
    const mageA = getUnitByName(engine, "Alpha", "Mage");
    const mageB = getUnitByName(engine, "Bravo", "Mage");

    expect(templarState.itemBonusStats).toMatchObject({
      meleeDmg: 10,
      dodge: 8,
      criticalChance: 5,
    });
    expect(mageA.itemBonusStats).toMatchObject({ spellDmg: 12, manaRegen: 3, criticalChance: 2 });
    expect(mageB.itemBonusStats).toMatchObject({ spellDmg: 12, manaRegen: 3, criticalChance: 2 });
  });

  it("rejects non-finite seeds and battles where both scenarios are empty", () => {
    expect(
      () =>
        new BattleEngine(
          createBattleInput([createScenario("Alpha"), createScenario("Bravo")], Number.NaN),
        ),
    ).toThrow(/finite number/i);

    expect(
      () =>
        new BattleEngine(createBattleInput([createScenario("Alpha"), createScenario("Bravo")], 1)),
    ).toThrow(/at least one living unit/i);
  });
});
