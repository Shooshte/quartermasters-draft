import { describe, expect, it } from "vitest";
import {
  type ActionOperation,
  commitPlannedActions,
  type PlannedAction,
} from "./action-operations";
import { initializeBattleState } from "./state";
import { createBattleInput, createScenario, createStats, createUnit } from "./test-helpers";

function operationState(leftHealth: number, rightHealth: number) {
  return initializeBattleState(
    createBattleInput([
      createScenario("A", {
        tank: [
          createUnit("Left", {
            stats: createStats({ health: leftHealth, speed: 100 }),
          }),
        ],
      }),
      createScenario("B", {
        tank: [
          createUnit("Right", {
            stats: createStats({ health: rightHealth, speed: 100 }),
          }),
        ],
      }),
    ]),
  );
}

function planned(actorId: string, operation: ActionOperation): PlannedAction {
  return {
    actorId,
    actionId: `1:${actorId}:1`,
    operations: [operation],
    log: [],
  };
}

describe("simultaneous action operations", () => {
  it("aggregates healing and damage before clamping", () => {
    const state = operationState(100, 100);
    const target = state.scenarios[1].rows.tank[0]!;
    target.currentHealth = 90;

    commitPlannedActions(
      state,
      [
        planned("healer", { kind: "healing", targetId: target.instanceId, amount: 20 }),
        planned("attacker", { kind: "damage", targetId: target.instanceId, amount: 50 }),
      ],
      1,
    );

    expect(target.currentHealth).toBe(60);
  });

  it("commits both lethal same-batch actions", () => {
    const state = operationState(10, 10);
    const left = state.scenarios[0].rows.tank[0]!;
    const right = state.scenarios[1].rows.tank[0]!;
    const leftPlan = planned(left.instanceId, {
      kind: "damage",
      targetId: right.instanceId,
      amount: 10,
    });
    leftPlan.log.push({
      batchNumber: 1,
      type: "attack",
      attacker: left.name,
      attackerId: left.instanceId,
      target: right.name,
      targetId: right.instanceId,
      damage: 10,
      actionId: leftPlan.actionId,
      message: "Left attacks Right",
    });
    const rightPlan = planned(right.instanceId, {
      kind: "damage",
      targetId: left.instanceId,
      amount: 10,
    });
    rightPlan.log.push({
      batchNumber: 1,
      type: "attack",
      attacker: right.name,
      attackerId: right.instanceId,
      target: left.name,
      targetId: left.instanceId,
      damage: 10,
      actionId: rightPlan.actionId,
      message: "Right attacks Left",
    });

    const committedActorIds = commitPlannedActions(state, [leftPlan, rightPlan], 1);

    expect([left.currentHealth, right.currentHealth]).toEqual([0, 0]);
    expect(committedActorIds).toEqual([left.instanceId, right.instanceId]);
    expect(state.log.map((entry) => entry.type)).toEqual(["attack", "attack", "death", "death"]);
    expect(
      state.log.flatMap((entry) => (entry.type === "attack" ? [entry.attackerId] : [])),
    ).toEqual([left.instanceId, right.instanceId]);
  });

  it("reconciles mana capacity effects once before applying aggregated costs", () => {
    const state = operationState(100, 100);
    const target = state.scenarios[0].rows.tank[0]!;
    target.mana = 70;
    const effect = (id: string, value: number): ActionOperation => ({
      kind: "add-effect",
      targetId: target.instanceId,
      effect: {
        id,
        name: id,
        sourceUnitId: target.instanceId,
        sourceScenarioId: target.scenarioId,
        targetUnitId: target.instanceId,
        effectType: value < 0 ? "debuff" : "buff",
        timingType: "instant",
        statKey: "mana",
        value,
        actionsRemaining: 2,
      },
    });

    commitPlannedActions(
      state,
      [
        planned("debuffer", effect("drain-capacity", -80)),
        planned("buffer", effect("restore-capacity", 80)),
        planned("spender", { kind: "mana-cost", targetId: target.instanceId, amount: 20 }),
      ],
      1,
    );

    expect(target.mana).toBe(50);
  });
});
