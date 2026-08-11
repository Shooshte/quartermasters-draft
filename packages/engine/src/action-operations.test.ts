import { describe, expect, it } from "vitest";
import {
  type ActionOperation,
  applyDamage,
  commitPlannedActions,
  type PlannedAction,
} from "./action-operations";
import { initializeBattleState } from "./state";
import {
  createBattleInput,
  createScenario,
  createShieldLayer,
  createStats,
  createUnit,
} from "./test-helpers";

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

function planned(actorId: string, operation: ActionOperation | ActionOperation[]): PlannedAction {
  return {
    actorId,
    actionId: `1:${actorId}:1`,
    operations: Array.isArray(operation) ? operation : [operation],
    log: [],
  };
}

describe("simultaneous action operations", () => {
  it("consumes the oldest shield layer before health", () => {
    const state = operationState(100, 100);
    const unit = state.scenarios[0].rows.tank[0]!;
    unit.shieldLayers = [
      { id: "first", remaining: 5 },
      { id: "second", remaining: 8 },
    ];

    expect(applyDamage(unit, 10, false)).toBe(0);
    expect(unit.currentHealth).toBe(100);
    expect(unit.shieldLayers).toEqual([{ id: "second", remaining: 3 }]);
  });

  it("applies bypassing damage directly to health", () => {
    const state = operationState(100, 100);
    const unit = state.scenarios[0].rows.tank[0]!;
    unit.shieldLayers = [{ id: "ward", remaining: 20 }];

    expect(applyDamage(unit, 30, true)).toBe(30);
    expect(unit.currentHealth).toBe(70);
    expect(unit.shieldLayers).toEqual([{ id: "ward", remaining: 20 }]);
  });

  it.each([
    false,
    true,
  ])("ignores negative damage without increasing health or shields when bypass=%s", (bypassesShield) => {
    const state = operationState(100, 100);
    const unit = state.scenarios[0].rows.tank[0]!;
    unit.currentHealth = 90;
    unit.shieldLayers = [{ id: "ward", remaining: 20 }];

    expect(applyDamage(unit, -30, bypassesShield)).toBe(0);
    expect(unit.currentHealth).toBe(90);
    expect(unit.shieldLayers).toEqual([{ id: "ward", remaining: 20 }]);
  });

  it("ignores a negative recorded shield grant", () => {
    const state = operationState(100, 100);
    const target = state.scenarios[1].rows.tank[0]!;

    commitPlannedActions(
      state,
      [
        planned("caster", {
          kind: "grant-shield",
          targetId: target.instanceId,
          layer: createShieldLayer("invalid-shield", -5),
        }),
      ],
      1,
    );

    expect(target.shieldLayers).toEqual([]);
  });

  it("replays shield grants and damage in recorded order", () => {
    const state = operationState(100, 100);
    const target = state.scenarios[1].rows.tank[0]!;

    commitPlannedActions(
      state,
      [
        planned("caster", [
          { kind: "damage", targetId: target.instanceId, amount: 10 },
          {
            kind: "grant-shield",
            targetId: target.instanceId,
            layer: createShieldLayer("late-shield", 5),
          },
          { kind: "damage", targetId: target.instanceId, amount: 3 },
        ]),
      ],
      1,
    );

    expect(target.currentHealth).toBe(90);
    expect(target.shieldLayers).toEqual([createShieldLayer("late-shield", 2)]);
  });

  it("lets a shield grant protect later damage in the same plan", () => {
    const state = operationState(100, 100);
    const target = state.scenarios[1].rows.tank[0]!;

    commitPlannedActions(
      state,
      [
        planned("caster", [
          {
            kind: "grant-shield",
            targetId: target.instanceId,
            layer: createShieldLayer("early-shield", 5),
          },
          { kind: "damage", targetId: target.instanceId, amount: 8 },
        ]),
      ],
      1,
    );

    expect(target.currentHealth).toBe(97);
    expect(target.shieldLayers).toEqual([]);
  });

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

  it.each([
    ["healing before damage", ["healing", "damage"]],
    ["damage before healing", ["damage", "healing"]],
  ] as const)("aggregates %s when existing shields are untouched by bypassing damage", (_label, operationOrder) => {
    const state = operationState(100, 100);
    const target = state.scenarios[1].rows.tank[0]!;
    target.currentHealth = 90;
    target.shieldLayers = [{ id: "ward", remaining: 25 }];
    const operations: Record<(typeof operationOrder)[number], ActionOperation> = {
      healing: { kind: "healing", targetId: target.instanceId, amount: 20 },
      damage: {
        kind: "damage",
        targetId: target.instanceId,
        amount: 30,
        bypassesShield: true,
      },
    };

    commitPlannedActions(
      state,
      operationOrder.map((kind) => planned(kind, operations[kind])),
      1,
    );

    expect(target.currentHealth).toBe(80);
    expect(target.shieldLayers).toEqual([{ id: "ward", remaining: 25 }]);
  });

  it.each([
    ["shield grant before sibling damage", ["shield", "damage"]],
    ["sibling damage before shield grant", ["damage", "shield"]],
  ] as const)("does not let a cross-plan %s absorb same-batch damage", (_label, planOrder) => {
    const state = operationState(100, 100);
    const target = state.scenarios[1].rows.tank[0]!;
    const plans: Record<(typeof planOrder)[number], PlannedAction> = {
      shield: planned("protector", {
        kind: "grant-shield",
        targetId: target.instanceId,
        layer: createShieldLayer("same-batch-shield", 20),
      }),
      damage: planned("attacker", {
        kind: "damage",
        targetId: target.instanceId,
        amount: 30,
      }),
    };

    commitPlannedActions(
      state,
      planOrder.map((kind) => plans[kind]),
      1,
    );

    expect(target.currentHealth).toBe(70);
    expect(target.shieldLayers).toEqual([createShieldLayer("same-batch-shield", 20)]);
  });

  it.each([
    ["shield and healing before sibling bypass damage", ["shield", "healing", "damage"]],
    ["sibling bypass damage before healing and shield", ["damage", "healing", "shield"]],
  ] as const)("aggregates %s before one health clamp", (_label, planOrder) => {
    const state = operationState(100, 100);
    const target = state.scenarios[1].rows.tank[0]!;
    target.currentHealth = 90;
    const plans: Record<(typeof planOrder)[number], PlannedAction> = {
      shield: planned("protector", {
        kind: "grant-shield",
        targetId: target.instanceId,
        layer: createShieldLayer("same-batch-shield", 20),
      }),
      healing: planned("healer", {
        kind: "healing",
        targetId: target.instanceId,
        amount: 20,
      }),
      damage: planned("attacker", {
        kind: "damage",
        targetId: target.instanceId,
        amount: 30,
        bypassesShield: true,
      }),
    };

    commitPlannedActions(
      state,
      planOrder.map((kind) => plans[kind]),
      1,
    );

    expect(target.currentHealth).toBe(80);
    expect(target.shieldLayers).toEqual([createShieldLayer("same-batch-shield", 20)]);
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
