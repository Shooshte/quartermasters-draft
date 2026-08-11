import { describe, expect, it } from "vitest";
import { advanceToNextReadyBatch, getSchedulingSpeed } from "./action-scheduler";
import { initializeBattleState } from "./state";
import { createBattleInput, createScenario, createStats, createUnit } from "./test-helpers";

function schedulerState() {
  return initializeBattleState(
    createBattleInput([
      createScenario("A", {
        melee: [
          createUnit("Quick Fox", { stats: createStats({ speed: 60 }) }),
          createUnit("Slow Turtle", { stats: createStats({ speed: 30 }) }),
        ],
      }),
      createScenario("B", { tank: [createUnit("Dummy", { stats: createStats({ speed: 1 }) })] }),
    ]),
  );
}

describe("event-driven action scheduler", () => {
  it("advances every living bar only far enough for the next unit", () => {
    const state = schedulerState();

    expect(advanceToNextReadyBatch(state).map((unit) => unit.name)).toEqual(["Quick Fox"]);
    expect(state.scenarios[0].rows.melee.map((unit) => unit.actionBar)).toEqual([100, 50]);
  });

  it("groups equal readiness moments", () => {
    const state = schedulerState();
    const [fast, headStart] = state.scenarios[0].rows.melee;
    fast!.baseStats.speed = 20;
    headStart!.baseStats.speed = 10;
    headStart!.actionBar = 50;

    expect(advanceToNextReadyBatch(state).map((unit) => unit.name)).toEqual([
      "Quick Fox",
      "Slow Turtle",
    ]);
  });

  it("orders exact readiness ties by ascending instance ID", () => {
    const state = initializeBattleState(
      createBattleInput([
        createScenario("Z", { tank: [createUnit("Zed", { stats: createStats({ speed: 10 }) })] }),
        createScenario("A", { tank: [createUnit("Ada", { stats: createStats({ speed: 10 }) })] }),
      ]),
    );

    expect(advanceToNextReadyBatch(state).map((unit) => unit.instanceId)).toEqual([
      "A:tank:1",
      "Z:tank:1",
    ]);
  });

  it("uses one as minimum scheduling speed", () => {
    const state = schedulerState();
    const frozen = state.scenarios[0].rows.melee[0]!;
    frozen.baseStats.speed = 0;

    expect(getSchedulingSpeed(frozen)).toBe(1);
  });

  it("changes no state other than living action bars", () => {
    const state = schedulerState();
    const dead = state.scenarios[0].rows.melee[1]!;
    dead.currentHealth = 0;
    dead.actionBar = 12;
    const beforeLog = [...state.log];
    const beforeActedCount = dead.actedCount;

    advanceToNextReadyBatch(state);

    expect(state.log).toEqual(beforeLog);
    expect(dead.actionBar).toBe(12);
    expect(dead.actedCount).toBe(beforeActedCount);
  });
});
