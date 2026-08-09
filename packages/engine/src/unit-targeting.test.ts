import { describe, expect, it } from "vitest";
import { asInternalState, initializeBattleState } from "./state";
import { selectTargets } from "./targeting";
import {
  createBattleInput,
  createEffect,
  createItem,
  createScenario,
  createStats,
  createUnit,
  effectSequence,
} from "./test-helpers";
import type { BattleUnitState } from "./types";
import type { InvalidBattleStateError } from "./validation";

function setupBattle(seed: number | string = 42) {
  return initializeBattleState(
    createBattleInput(
      [
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
      ],
      seed,
    ),
  );
}

function setupScopeBattle() {
  return initializeBattleState(
    createBattleInput([
      createScenario("Alpha", {
        melee: [createUnit("Cleric", { stats: createStats({ health: 200 }) })],
        ranged: [createUnit("Knight", { stats: createStats({ health: 300 }) })],
      }),
      createScenario("Bravo", {
        tank: [createUnit("Warrior", { stats: createStats({ health: 100 }) })],
      }),
    ]),
  );
}

function configure(
  caster: BattleUnitState,
  targeting: Partial<
    Pick<BattleUnitState, "targetScope" | "targetPriority" | "targetCount" | "selectionShape">
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

  it.each([
    ["self", ["Knight"]],
    ["self_allies", ["Knight", "Cleric"]],
    ["self_enemies", ["Knight", "Warrior"]],
    ["allies", ["Cleric"]],
    ["enemies", ["Warrior"]],
    ["both", ["Cleric", "Warrior"]],
  ] as const)("builds %s candidates", (targetScope, names) => {
    const state = setupScopeBattle();
    const caster = configure(state.scenarios[0].rows.ranged[0]!, {
      targetScope,
      targetCount: 8,
    });

    expect(selectTargets(state, caster, caster).map((unit) => unit.name)).toEqual(names);
  });

  it.each([
    "tank",
    "melee",
  ] as const)("limits a %s caster to the globally nearest occupied row", (casterRow) => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          [casterRow]: [
            createUnit("Caster", { targetScope: "both", targetCount: 3 }),
            createUnit("Ally Front", { stats: createStats({ health: 40 }) }),
          ],
        }),
        createScenario("Bravo", {
          tank: [createUnit("Dead Tank", { currentHealth: 0 })],
          ranged: [createUnit("Enemy Ranged", { stats: createStats({ health: 200 }) })],
        }),
      ]),
    );
    const caster = state.scenarios[0].rows[casterRow][0]!;

    expect(selectTargets(state, caster, caster).map((unit) => unit.name)).toEqual(["Ally Front"]);
  });

  it("uses the seeded RNG to choose a side for equally near rows", () => {
    const choose = (random?: () => number) => {
      const state = initializeBattleState(
        createBattleInput(
          [
            createScenario("Alpha", {
              tank: [createUnit("Ally Tank")],
              melee: [createUnit("Caster", { targetScope: "both", targetCount: 2 })],
            }),
            createScenario("Bravo", { tank: [createUnit("Enemy Tank")] }),
          ],
          "equal-distance",
        ),
      );
      const caster = state.scenarios[0].rows.melee[0]!;
      if (random) asInternalState(state).__rng = random;
      return selectTargets(state, caster, caster).map((unit) => unit.name);
    };

    expect(choose()).toEqual(choose());
    expect(choose()).toHaveLength(1);
    expect(choose(() => 0)).toEqual(["Ally Tank"]);
    expect(choose(() => 0.99)).toEqual(["Enemy Tank"]);
  });

  it.each([
    "ranged",
    "support",
  ] as const)("lets a %s caster prioritize across all rows", (casterRow) => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          [casterRow]: [createUnit("Caster", { targetPriority: "highest_health" })],
        }),
        createScenario("Bravo", {
          tank: [createUnit("Enemy Tank", { stats: createStats({ health: 100 }) })],
          support: [createUnit("Enemy Support", { stats: createStats({ health: 200 }) })],
        }),
      ]),
    );
    const caster = state.scenarios[0].rows[casterRow][0]!;

    expect(selectTargets(state, caster, caster).map((unit) => unit.name)).toEqual([
      "Enemy Support",
    ]);
  });

  it.each([
    ["highest_health", "Warrior"],
    ["lowest_health", "Sorcerer"],
    ["highest_damage", "Sorcerer"],
    ["support", "Sorcerer"],
  ] as const)("selects targets using %s priority", (targetPriority, expected) => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.ranged[0]!;

    expect(
      selectTargets(state, caster, configure(caster, { targetPriority, targetCount: 1 })).map(
        (unit) => unit.name,
      ),
    ).toEqual([expected]);
  });

  it("projects instant and interval damage using effective speed for highest-damage priority", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          ranged: [createUnit("Caster", { targetPriority: "highest_damage" })],
        }),
        createScenario("Bravo", {
          tank: [
            createUnit("Slow Burst", {
              stats: createStats({ meleeDmg: 0, rangedDmg: 0, spellDmg: 0, speed: 100 }),
              items: [
                createItem({
                  name: "Burst",
                  effects: effectSequence(
                    createEffect({
                      effectType: "damage",
                      timingType: "instant",
                      directSpellDmg: 45,
                    }),
                  ),
                }),
              ],
            }),
            createUnit("Fast Dot", {
              stats: createStats({ meleeDmg: 0, rangedDmg: 0, spellDmg: 0, speed: 50 }),
              items: [
                createItem({
                  name: "Dot",
                  effects: effectSequence(
                    createEffect({
                      effectType: "damage",
                      timingType: "instant",
                      directSpellDmg: 10,
                    }),
                    createEffect({
                      effectType: "damage",
                      timingType: "interval",
                      intervalTicks: 2,
                      directSpellDmg: 80,
                    }),
                  ),
                }),
              ],
            }),
          ],
        }),
      ]),
    );
    const caster = state.scenarios[0].rows.ranged[0]!;
    const fastDot = state.scenarios[1].rows.tank[1]!;
    fastDot.activeEffects.push({
      id: "haste",
      name: "Haste",
      sourceUnitId: fastDot.instanceId,
      sourceScenarioId: fastDot.scenarioId,
      targetUnitId: fastDot.instanceId,
      effectType: "buff",
      timingType: "instant",
      statKey: "speed",
      value: 50,
    });

    expect(
      selectTargets(state, caster, configure(caster, { targetPriority: "highest_damage" })).map(
        (unit) => unit.name,
      ),
    ).toEqual(["Fast Dot"]);
  });

  it("excludes direct damage from ally-only and zero-interval effects for highest-damage priority", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          ranged: [createUnit("Caster", { targetPriority: "highest_damage" })],
        }),
        createScenario("Bravo", {
          tank: [
            createUnit("Baseline", {
              stats: createStats({ meleeDmg: 10, rangedDmg: 0, spellDmg: 0, speed: 100 }),
            }),
            createUnit("Ally Burst", {
              targetScope: "allies",
              stats: createStats({ meleeDmg: 0, rangedDmg: 0, spellDmg: 0, speed: 100 }),
              items: [
                createItem({
                  name: "Ally Burst Item",
                  effects: effectSequence(
                    createEffect({
                      effectType: "damage",
                      timingType: "instant",
                      directSpellDmg: 100,
                    }),
                  ),
                }),
              ],
            }),
            createUnit("Zero Interval", {
              stats: createStats({ meleeDmg: 0, rangedDmg: 0, spellDmg: 0, speed: 100 }),
              items: [
                createItem({
                  name: "Zero Interval Item",
                  effects: effectSequence(
                    createEffect({
                      effectType: "damage",
                      timingType: "interval",
                      intervalTicks: 0,
                      directSpellDmg: 100,
                    }),
                  ),
                }),
              ],
            }),
          ],
        }),
      ]),
    );
    const caster = state.scenarios[0].rows.ranged[0]!;

    expect(
      selectTargets(state, caster, configure(caster, { targetPriority: "highest_damage" })).map(
        (unit) => unit.name,
      ),
    ).toEqual(["Baseline"]);
  });

  it("excludes direct damage on healing intervals from highest-damage priority", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          ranged: [createUnit("Caster", { targetPriority: "highest_damage" })],
        }),
        createScenario("Bravo", {
          tank: [
            createUnit("Damage Over Time", {
              stats: createStats({ meleeDmg: 0, rangedDmg: 0, spellDmg: 0 }),
              items: [
                createItem({
                  name: "Damage Item",
                  effects: effectSequence(
                    createEffect({
                      effectType: "damage",
                      timingType: "interval",
                      intervalTicks: 10,
                      directSpellDmg: 50,
                    }),
                  ),
                }),
              ],
            }),
            createUnit("Healing Over Time", {
              stats: createStats({ meleeDmg: 0, rangedDmg: 0, spellDmg: 0 }),
              items: [
                createItem({
                  name: "Healing Item",
                  effects: effectSequence(
                    createEffect({
                      effectType: "healing",
                      timingType: "interval",
                      intervalTicks: 1,
                      directSpellDmg: 100,
                    }),
                  ),
                }),
              ],
            }),
          ],
        }),
      ]),
    );
    const caster = state.scenarios[0].rows.ranged[0]!;

    expect(
      selectTargets(state, caster, configure(caster, { targetPriority: "highest_damage" })).map(
        (unit) => unit.name,
      ),
    ).toEqual(["Damage Over Time"]);
  });

  it("does not speed-scale interval damage for highest-damage priority", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          ranged: [createUnit("Caster", { targetPriority: "highest_damage" })],
        }),
        createScenario("Bravo", {
          tank: [
            createUnit("Steady Interval", {
              stats: createStats({ meleeDmg: 0, rangedDmg: 0, spellDmg: 0, speed: 100 }),
              items: [
                createItem({
                  name: "Steady Item",
                  effects: effectSequence(
                    createEffect({
                      effectType: "damage",
                      timingType: "interval",
                      intervalTicks: 1,
                      directSpellDmg: 5,
                    }),
                  ),
                }),
              ],
            }),
            createUnit("Hasted Interval", {
              stats: createStats({ meleeDmg: 0, rangedDmg: 0, spellDmg: 0, speed: 100 }),
              items: [
                createItem({
                  name: "Hasted Item",
                  effects: effectSequence(
                    createEffect({
                      effectType: "damage",
                      timingType: "interval",
                      intervalTicks: 2,
                      directSpellDmg: 8,
                    }),
                  ),
                }),
              ],
            }),
          ],
        }),
      ]),
    );
    const caster = state.scenarios[0].rows.ranged[0]!;
    const hastedInterval = state.scenarios[1].rows.tank[1]!;
    hastedInterval.activeEffects.push({
      id: "haste",
      name: "Haste",
      sourceUnitId: hastedInterval.instanceId,
      sourceScenarioId: hastedInterval.scenarioId,
      targetUnitId: hastedInterval.instanceId,
      effectType: "buff",
      timingType: "instant",
      statKey: "speed",
      value: 100,
    });

    expect(
      selectTargets(state, caster, configure(caster, { targetPriority: "highest_damage" })).map(
        (unit) => unit.name,
      ),
    ).toEqual(["Steady Interval"]);
  });

  it("uses the deterministic fallback order for equal projected output", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          ranged: [createUnit("Caster", { targetPriority: "highest_damage", targetCount: 2 })],
        }),
        createScenario("Bravo", {
          tank: [
            createUnit("First", {
              stats: createStats({ meleeDmg: 10, rangedDmg: 0, spellDmg: 0, speed: 100 }),
            }),
            createUnit("Second", {
              stats: createStats({ meleeDmg: 10, rangedDmg: 0, spellDmg: 0, speed: 100 }),
            }),
          ],
        }),
      ]),
    );
    const caster = state.scenarios[0].rows.ranged[0]!;

    expect(
      selectTargets(state, caster, configure(caster, { targetPriority: "highest_damage" })).map(
        (unit) => unit.name,
      ),
    ).toEqual(["First", "Second"]);
  });

  it("selects multiple seeded-random candidates without duplicates", () => {
    const select = () => {
      const state = setupBattle("random-three");
      const caster = state.scenarios[0].rows.ranged[0]!;
      return selectTargets(
        state,
        caster,
        configure(caster, { targetPriority: "random", targetCount: 3 }),
      ).map((unit) => unit.instanceId);
    };

    const selected = select();
    expect(selected).toHaveLength(3);
    expect(new Set(selected)).toHaveLength(3);
    expect(selected).toEqual(select());
  });

  it("uses deterministic fallback order for tied random scores", () => {
    const state = setupBattle();
    const caster = state.scenarios[0].rows.ranged[0]!;
    asInternalState(state).__rng = () => 0.5;

    expect(
      selectTargets(
        state,
        caster,
        configure(caster, { targetPriority: "random", targetCount: 3 }),
      ).map((unit) => unit.name),
    ).toEqual(["Warrior", "Paladin", "Ranger"]);
  });

  it("selects a contiguous adjacent group around the primary target", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", {
          ranged: [
            createUnit("Knight", {
              selectionShape: "adjacent",
              targetCount: 3,
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
    const caster = state.scenarios[0].rows.ranged[0]!;

    expect(selectTargets(state, caster, caster).map((unit) => unit.name)).toEqual([
      "Guard",
      "Tank",
      "Brute",
    ]);
  });

  it("excludes dead units before deciding melee reach", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Alpha", { melee: [createUnit("Caster")] }),
        createScenario("Bravo", {
          tank: [createUnit("Dead Tank", { currentHealth: 0 })],
          ranged: [createUnit("Living Ranged")],
        }),
      ]),
    );
    const caster = state.scenarios[0].rows.melee[0]!;

    expect(selectTargets(state, caster, caster).map((unit) => unit.name)).toEqual([
      "Living Ranged",
    ]);
  });
});
