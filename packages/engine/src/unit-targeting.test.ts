import { describe, expect, it } from "vitest";
import { asInternalState, initializeBattleState } from "./state";
import { selectTargets } from "./targeting";
import { createBattleInput, createScenario, createStats, createUnit } from "./test-helpers";
import type { BattleUnitState } from "./types";
import type { InvalidBattleStateError } from "./validation";

function setupBattle() {
  return initializeBattleState(
    createBattleInput([
      createScenario("Alpha", {
        tank: [
          createUnit("Knight", {
            stats: createStats({ health: 120, meleeDmg: 25 }),
          }),
        ],
        melee: [
          createUnit("Cleric", {
            stats: createStats({ health: 80, spellDmg: 15 }),
          }),
        ],
        ranged: [
          createUnit("Archer", {
            stats: createStats({ health: 70, rangedDmg: 30 }),
          }),
          createUnit("Mage", {
            stats: createStats({ health: 60, spellDmg: 40 }),
          }),
        ],
      }),
      createScenario("Bravo", {
        tank: [
          createUnit("Warrior", {
            stats: createStats({ health: 150, meleeDmg: 30 }),
          }),
          createUnit("Paladin", {
            stats: createStats({ health: 130, meleeDmg: 20, spellDmg: 10 }),
          }),
        ],
        ranged: [
          createUnit("Ranger", {
            stats: createStats({ health: 75, rangedDmg: 28 }),
          }),
        ],
        support: [
          createUnit("Sorcerer", {
            stats: createStats({ health: 55, spellDmg: 45 }),
          }),
        ],
      }),
    ]),
  );
}

function configure(
  caster: BattleUnitState,
  targeting: Partial<
    Pick<
      BattleUnitState,
      | "targetSide"
      | "targetPolicy"
      | "targetRowCount"
      | "maxTargetsPerRow"
      | "targetOnlyAdjacent"
      | "allowedRowTypes"
    >
  >,
) {
  Object.assign(caster, targeting);
  return caster;
}

describe("unit targeting", () => {
  it("reports a missing caster scenario with a domain error", () => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.tank[0]!;
    state.scenarios = [state.scenarios[1], state.scenarios[1]];

    expect(() => selectTargets(state, caster, caster)).toThrowError(
      expect.objectContaining<Partial<InvalidBattleStateError>>({
        code: "CASTER_SCENARIO_NOT_FOUND",
        message: expect.stringContaining(caster.scenarioId),
      }),
    );
  });

  it("reports a missing opposing scenario with a domain error", () => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.tank[0]!;
    state.scenarios = [state.scenarios[0], state.scenarios[0]];

    expect(() => selectTargets(state, caster, caster)).toThrowError(
      expect.objectContaining<Partial<InvalidBattleStateError>>({
        code: "OPPOSING_SCENARIO_NOT_FOUND",
        message: expect.stringContaining(caster.scenarioId),
      }),
    );
  });

  it("uses target side rather than effect category to choose candidates", () => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.melee[0]!;
    caster.currentHealth = 5;

    expect(
      selectTargets(
        state,
        caster,
        configure(caster, { targetSide: "allies", targetPolicy: "lowest_health" }),
      ).map((unit) => unit.name),
    ).toEqual(["Cleric"]);

    expect(
      selectTargets(
        state,
        caster,
        configure(caster, { targetSide: "enemies", targetPolicy: "highest_health" }),
      ).map((unit) => unit.name),
    ).toEqual(["Warrior"]);
  });

  it("selects only the caster for self targeting when its row is eligible", () => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.tank[0]!;

    expect(
      selectTargets(
        state,
        caster,
        configure(caster, {
          targetSide: "self",
          targetPolicy: "self",
          allowedRowTypes: ["tank"],
        }),
      ).map((unit) => unit.name),
    ).toEqual(["Knight"]);
  });

  it("returns no self target when the caster row is not eligible", () => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.tank[0]!;

    expect(
      selectTargets(
        state,
        caster,
        configure(caster, {
          targetSide: "self",
          targetPolicy: "self",
          allowedRowTypes: ["support"],
        }),
      ),
    ).toEqual([]);
  });

  it.each([
    ["highest_health", "Warrior"],
    ["lowest_health", "Sorcerer"],
    ["highest_damage", "Sorcerer"],
  ] as const)("selects enemy targets using %s", (policy, expected) => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.tank[0]!;

    expect(
      selectTargets(
        state,
        caster,
        configure(caster, { targetSide: "enemies", targetPolicy: policy }),
      ).map((unit) => unit.name),
    ).toEqual([expected]);
  });

  it("produces deterministic random targets for the same seed", () => {
    const firstState = setupBattle();
    const firstCaster = firstState.scenarios[0].rows.tank[0]!;
    const first = selectTargets(
      firstState,
      firstCaster,
      configure(firstCaster, { targetPolicy: "random" }),
    ).map((unit) => unit.instanceId);

    const secondState = setupBattle();
    const secondCaster = secondState.scenarios[0].rows.tank[0]!;
    const second = selectTargets(
      secondState,
      secondCaster,
      configure(secondCaster, { targetPolicy: "random" }),
    ).map((unit) => unit.instanceId);

    expect(first).toEqual(second);
  });

  it("uses a targeting policy override without changing unit targeting shape", () => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.tank[0]!;
    caster.targetPolicyOverride = "lowest_health";

    expect(selectTargets(state, caster, caster).map((unit) => unit.name)).toEqual(["Sorcerer"]);
  });

  it("selects one target from each requested row by global policy", () => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.tank[0]!;

    expect(
      selectTargets(
        state,
        caster,
        configure(caster, { targetRowCount: 2, maxTargetsPerRow: 1 }),
      ).map((unit) => unit.name),
    ).toEqual(["Warrior", "Ranger"]);
  });

  it("selects full rows front-to-back, skips empty rows, and excludes dead units", () => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.tank[0]!;
    state.scenarios[1].rows.tank[0]!.currentHealth = 0;

    expect(
      selectTargets(
        state,
        caster,
        configure(caster, { targetRowCount: 2, maxTargetsPerRow: null }),
      ).map((unit) => unit.name),
    ).toEqual(["Paladin", "Ranger"]);
  });

  it("supports adjacent targeting around the row primary target", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          tank: [
            createUnit("Knight", {
              stats: createStats({ health: 120, meleeDmg: 25 }),
              maxTargetsPerRow: 3,
              targetOnlyAdjacent: true,
            }),
          ],
        }),
        createScenario("Bravo", {
          tank: [
            createUnit("Guard", { stats: createStats({ health: 100 }) }),
            createUnit("Tank", { stats: createStats({ health: 140 }) }),
            createUnit("Brute", { stats: createStats({ health: 90 }) }),
            createUnit("Shield", { stats: createStats({ health: 110 }) }),
          ],
        }),
      ]),
    );
    const caster = state.scenarios[0].rows.tank[0]!;

    expect(selectTargets(state, caster, caster).map((unit) => unit.name)).toEqual([
      "Guard",
      "Tank",
      "Brute",
    ]);
  });

  it("filters candidates by allowed target rows", () => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.tank[0]!;

    expect(
      selectTargets(
        state,
        caster,
        configure(caster, {
          targetRowCount: 2,
          allowedRowTypes: ["ranged", "support"],
        }),
      ).map((unit) => unit.name),
    ).toEqual(["Ranger", "Sorcerer"]);
  });

  it("uses deterministic fallback order for tied random scores", () => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.tank[0]!;
    asInternalState(state).__rng = () => 0.5;

    expect(
      selectTargets(
        state,
        caster,
        configure(caster, { targetPolicy: "random", targetRowCount: 2 }),
      ).map((unit) => unit.name),
    ).toEqual(["Warrior", "Ranger"]);
  });
});
