import { describe, expect, it } from "vitest";
import { initializeBattleState } from "./state";
import { selectTargets } from "./targeting";
import { createBattleInput, createEffect, createScenario, createSpell, createStats, createUnit, effectSequence } from "./test-helpers";

function setupBattle() {
  return initializeBattleState(
    createBattleInput([
      createScenario("Alpha", {
        tank: [createUnit("Knight", { stats: createStats({ health: 120, meleeDmg: 25, speed: 3, manaRegen: 1, dodge: 5, criticalChance: 10 }) })],
        melee: [createUnit("Cleric", { stats: createStats({ health: 80, meleeDmg: 5, spellDmg: 15, speed: 2, manaRegen: 8, dodge: 3, criticalChance: 5 }) })],
        ranged: [
          createUnit("Archer", { stats: createStats({ health: 70, meleeDmg: 5, rangedDmg: 30, speed: 4, manaRegen: 2, dodge: 10, criticalChance: 15 }) }),
          createUnit("Mage", { stats: createStats({ health: 60, spellDmg: 40, speed: 2, manaRegen: 10, dodge: 8, criticalChance: 12 }) }),
        ],
      }),
      createScenario("Bravo", {
        tank: [
          createUnit("Warrior", { stats: createStats({ health: 150, meleeDmg: 30, speed: 3, dodge: 4, criticalChance: 8 }) }),
          createUnit("Paladin", { stats: createStats({ health: 130, meleeDmg: 20, spellDmg: 10, speed: 2, manaRegen: 5, dodge: 6, criticalChance: 7 }) }),
        ],
        ranged: [createUnit("Ranger", { stats: createStats({ health: 75, meleeDmg: 8, rangedDmg: 28, speed: 5, manaRegen: 3, dodge: 12, criticalChance: 18 }) })],
        support: [createUnit("Sorcerer", { stats: createStats({ health: 55, spellDmg: 45, speed: 2, manaRegen: 12, dodge: 7, criticalChance: 10 }) })],
      }),
    ]),
  );
}

describe("spell targeting", () => {
  it("selects highest health, lowest health, highest damage, and deterministic random targets", () => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.tank[0]!;

    expect(selectTargets(state, caster, createSpell({ name: "HH", targetPolicy: "highest_health" })).map((unit) => unit.name)).toEqual(["Warrior"]);
    expect(selectTargets(state, caster, createSpell({ name: "LH", targetPolicy: "lowest_health" })).map((unit) => unit.name)).toEqual(["Sorcerer"]);
    expect(selectTargets(state, caster, createSpell({ name: "HD", targetPolicy: "highest_damage" })).map((unit) => unit.name)).toEqual(["Sorcerer"]);

    const randomSpell = createSpell({ name: "Random", targetPolicy: "random" });
    const first = selectTargets(state, caster, randomSpell).map((unit) => unit.instanceId);
    const second = selectTargets(setupBattle(), setupBattle().scenarios[0].rows.tank[0]!, randomSpell).map((unit) => unit.instanceId);
    expect(first).toEqual(second);
  });

  it("uses targeting overrides and one-per-row global selection when maxTargetsPerRow is 1", () => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.tank[0]!;
    caster.targetPolicyOverride = "lowest_health";

    expect(selectTargets(state, caster, createSpell({ name: "Override", targetPolicy: "highest_health" })).map((unit) => unit.name)).toEqual(["Sorcerer"]);
    caster.targetPolicyOverride = null;
    expect(
      selectTargets(
        state,
        caster,
        createSpell({ name: "Rows", targetPolicy: "highest_health", targetRowCount: 2, maxTargetsPerRow: 1 }),
      ).map((unit) => unit.name),
    ).toEqual(["Warrior", "Ranger"]);
  });

  it("selects full rows front-to-back, skips empty rows, excludes dead units, and targets allies for healing spells", () => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.tank[0]!;
    state.scenarios[1].rows.tank[0]!.currentHealth = 0;

    expect(
      selectTargets(
        state,
        caster,
        createSpell({ name: "All Tank", targetPolicy: "highest_health", targetRowCount: 1, maxTargetsPerRow: null }),
      ).map((unit) => unit.name),
    ).toEqual(["Paladin"]);

    expect(
      selectTargets(
        state,
        caster,
        createSpell({ name: "Front Rows", targetPolicy: "highest_health", targetRowCount: 2, maxTargetsPerRow: null }),
      ).map((unit) => unit.name),
    ).toEqual(["Paladin", "Ranger"]);

    const healer = state.scenarios[0].rows.melee[0]!;
    healer.currentHealth = 60;
    caster.currentHealth = 100;
    const healSpell = createSpell({
      name: "Heal",
      targetPolicy: "lowest_health",
      effects: effectSequence(createEffect({ name: "Mend", effectType: "healing", timingType: "instant", directHealing: 10 })),
    });
    expect(selectTargets(state, healer, healSpell).map((unit) => unit.name)).toEqual(["Cleric"]);
  });

  it("supports adjacent targeting around the row primary target", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", { tank: [createUnit("Knight", { stats: createStats({ health: 120, meleeDmg: 25 }) })] }),
        createScenario("Bravo", {
          tank: [
            createUnit("Guard", { stats: createStats({ health: 100, meleeDmg: 20 }) }),
            createUnit("Tank", { stats: createStats({ health: 140, meleeDmg: 15 }) }),
            createUnit("Brute", { stats: createStats({ health: 90, meleeDmg: 35 }) }),
            createUnit("Shield", { stats: createStats({ health: 110, meleeDmg: 10 }) }),
          ],
        }),
      ]),
    );

    const targets = selectTargets(
      state,
      state.scenarios[0].rows.tank[0]!,
      createSpell({
        name: "Adjacent",
        targetPolicy: "highest_health",
        targetRowCount: 1,
        maxTargetsPerRow: 3,
        targetOnlyAdjacent: true,
      }),
    );

    expect(targets.map((unit) => unit.name)).toEqual(["Guard", "Tank", "Brute"]);
  });

  it("filters candidates by allowed target row types", () => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.tank[0]!;

    const targets = selectTargets(
      state,
      caster,
      createSpell({
        name: "Backline Hunt",
        targetPolicy: "highest_health",
        targetRowCount: 2,
        maxTargetsPerRow: 1,
        allowedRowTypes: ["ranged", "support"],
      }),
    );

    expect(targets.map((unit) => unit.name)).toEqual(["Ranger", "Sorcerer"]);
  });
});
