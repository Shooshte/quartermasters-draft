import { describe, expect, it } from "vitest";
import { BattleEngine } from "./battle-engine";
import { createBattleInput, createScenario, createStats, createUnit } from "./test-helpers";

function makeBarBattle() {
  return createBattleInput([
    createScenario("A", {
      tank: [createUnit("Shield Bearer", { stats: createStats({ health: 120, meleeDmg: 5, speed: 20, dodge: 5 }) })],
      melee: [createUnit("Blade Dancer", { stats: createStats({ health: 80, meleeDmg: 25, speed: 30, dodge: 10, criticalChance: 15 }) })],
      ranged: [createUnit("Longbow Scout", { stats: createStats({ health: 60, rangedDmg: 20, speed: 25, dodge: 8, criticalChance: 10 }) })],
      support: [createUnit("Field Medic", { stats: createStats({ health: 50, manaRegen: 10, spellDmg: 15, speed: 35, dodge: 3, criticalChance: 5 }) })],
    }),
    createScenario("B", {
      tank: [createUnit("Iron Golem", { stats: createStats({ health: 150, meleeDmg: 8, speed: 15, dodge: 2 }) })],
      melee: [createUnit("Shadow Striker", { stats: createStats({ health: 70, meleeDmg: 30, speed: 40, dodge: 12, criticalChance: 20 }) })],
      ranged: [createUnit("Flame Caster", { stats: createStats({ health: 55, rangedDmg: 10, manaRegen: 8, spellDmg: 25, speed: 25, dodge: 5, criticalChance: 8 }) })],
      support: [createUnit("War Drummer", { stats: createStats({ health: 45, manaRegen: 12, speed: 20, dodge: 4, criticalChance: 3 }) })],
    }),
  ]);
}

function actionBar(engine: BattleEngine, scenarioId: string, name: string) {
  const scenario = engine.getState().scenarios.find((candidate) => candidate.id === scenarioId)!;
  const unit = Object.values(scenario.rows).flat().find((candidate) => candidate.name === name)!;
  return unit.actionBar;
}

describe("action bar", () => {
  it("accumulates raw action bar when action resolution is disabled", () => {
    const engine = new BattleEngine(makeBarBattle(), { resolveActionsOnTick: false });
    engine.tick(3);

    expect(actionBar(engine, "A", "Shield Bearer")).toBe(60);
    expect(actionBar(engine, "A", "Blade Dancer")).toBe(90);
    expect(actionBar(engine, "A", "Field Medic")).toBe(105);
    expect(actionBar(engine, "B", "Shadow Striker")).toBe(120);
  });

  it("does not increment dead units", () => {
    const input = makeBarBattle();
    input.scenarios[0].rows!.tank![0]!.stats.health = 0;
    const engine = new BattleEngine(input, { resolveActionsOnTick: false });
    engine.tick(3);

    expect(actionBar(engine, "A", "Shield Bearer")).toBe(0);
    expect(actionBar(engine, "A", "Blade Dancer")).toBe(90);
  });

  it("resets to zero after acting and discards overflow", () => {
    const engine = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          melee: [createUnit("Overcharger", { stats: createStats({ health: 80, meleeDmg: 20, speed: 60 }) })],
        }),
        createScenario("B", {
          tank: [createUnit("Dummy", { stats: createStats({ health: 200, meleeDmg: 0, speed: 10 }) })],
        }),
      ]),
    );

    engine.tick(2);
    const unit = Object.values(engine.getState().scenarios[0].rows).flat()[0]!;
    expect(unit.actedCount).toBe(1);
    expect(unit.actionBar).toBe(0);
  });

  it("uses deterministic tie-breaking by speed, scenario order, row order, and slot", () => {
    const engine = new BattleEngine(
      createBattleInput([
        createScenario("A", {
          melee: [createUnit("A Melee 1", { stats: createStats({ health: 80, meleeDmg: 20, speed: 50 }) }), createUnit("A Melee 2", { stats: createStats({ health: 80, meleeDmg: 20, speed: 50 }) })],
          tank: [createUnit("A Tank 1", { stats: createStats({ health: 120, meleeDmg: 5, speed: 50 }) })],
          ranged: [createUnit("A Ranged 1", { stats: createStats({ health: 60, rangedDmg: 20, speed: 50 }) })],
        }),
        createScenario("B", {
          melee: [createUnit("B Melee 1", { stats: createStats({ health: 80, meleeDmg: 20, speed: 50 }) })],
          tank: [createUnit("B Tank 1", { stats: createStats({ health: 120, meleeDmg: 5, speed: 50 }) })],
          support: [createUnit("B Support 1", { stats: createStats({ health: 50, spellDmg: 15, manaRegen: 10, speed: 100 }) })],
        }),
      ]),
    );

    engine.tick(2);

    const attackNames = engine
      .getState()
      .log.filter((entry) => entry.tick === 2 && (entry.type === "attack" || entry.type === "spell-cast"))
      .map((entry) => ("attacker" in entry ? entry.attacker : entry.caster));

    expect(attackNames).toEqual([
      "B Support 1",
      "A Tank 1",
      "A Melee 1",
      "A Melee 2",
      "A Ranged 1",
      "B Tank 1",
      "B Melee 1",
    ]);
  });
});
