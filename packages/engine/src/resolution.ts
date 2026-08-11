import {
  clonePlanningState,
  getRecordedActionOperations,
  type PlannedAction,
  recordActionOperation,
} from "./action-operations";
import { applyItemEffectsToTargets } from "./effects";
import { pushLog } from "./logging";
import {
  computeBasicAttackDamage,
  computeBasicDamageWithModifiers,
  getUnitEffectiveStats,
} from "./math";
import { compareUnitOrder } from "./rows";
import { findScenario, findUnitById } from "./state";
import type { UnitTargetingInput } from "./targeting";
import { selectTargets } from "./targeting";
import type { BattleLogOrigin, BattleState, BattleUnitState } from "./types";

export type ActionOutcome = {
  usedBasicAttack: boolean;
  totalDamage: number;
  activatedItemNames: string[];
};

function basicAttackTargeting(attacker: BattleUnitState): UnitTargetingInput {
  return {
    targetScope: "enemies",
    targetPriority: attacker.targetPriority,
    targetCount: 1,
    selectionShape: "individual",
  };
}

export function performBasicAttack(
  state: BattleState,
  attacker: BattleUnitState,
  batchNumber = state.batchCount,
  actionId = `${batchNumber}:${attacker.instanceId}:${attacker.actedCount + 1}`,
): number {
  const targets = selectTargets(state, attacker, basicAttackTargeting(attacker));
  const target = targets[0];
  if (!target) return 0;

  const attackerStats = getUnitEffectiveStats(attacker);
  const targetStats = getUnitEffectiveStats(target);
  const baseStat =
    attacker.rowType === "tank" || attacker.rowType === "melee"
      ? attackerStats.meleeDmg
      : attackerStats.rangedDmg;
  const distanceAdjustedDamage = computeBasicAttackDamage(
    baseStat,
    attacker.rowType,
    target.rowType,
  );
  const damage = computeBasicDamageWithModifiers(
    distanceAdjustedDamage,
    attackerStats,
    targetStats,
  );

  recordActionOperation(state, { kind: "damage", targetId: target.instanceId, amount: damage });
  target.currentHealth = Math.max(0, target.currentHealth - damage);
  pushLog(state, {
    batchNumber,
    type: "attack",
    attacker: attacker.name,
    attackerId: attacker.instanceId,
    target: target.name,
    targetId: target.instanceId,
    damage,
    actionId,
    origin: { kind: "basic-attack", actionId, sourceUnitId: attacker.instanceId },
    message: `${attacker.name} attacks ${target.name} for ${damage} damage`,
  });
  pushLog(state, {
    batchNumber,
    type: "damage",
    source: attacker.name,
    sourceId: attacker.instanceId,
    target: target.name,
    targetId: target.instanceId,
    damage,
    actionId,
    origin: { kind: "basic-attack", actionId, sourceUnitId: attacker.instanceId },
    message: `${attacker.name} hits ${target.name} for ${damage} damage`,
  });
  return damage;
}

export function resolveUnitAction(
  state: BattleState,
  unit: BattleUnitState,
  batchNumber = state.batchCount,
): ActionOutcome {
  const activatedItemNames: string[] = [];
  let totalDamage = 0;
  const actionId = `${batchNumber}:${unit.instanceId}:${unit.actedCount + 1}`;

  const items = [...unit.items];

  for (const [itemIndex, item] of items.entries()) {
    if (item.effects.length === 0) continue;
    if (unit.mana < item.activationManaCost) continue;
    if (unit.currentHealth < item.activationHealthCost) continue;

    const targets = selectTargets(state, unit, unit);
    if (targets.length === 0) continue;

    if (item.activationManaCost > 0) {
      recordActionOperation(state, {
        kind: "mana-cost",
        targetId: unit.instanceId,
        amount: item.activationManaCost,
      });
      unit.mana -= item.activationManaCost;
    }
    if (item.activationHealthCost > 0) {
      recordActionOperation(state, {
        kind: "health-cost",
        targetId: unit.instanceId,
        amount: item.activationHealthCost,
      });
      unit.currentHealth -= item.activationHealthCost;
    }

    const startingHealthByTarget = new Map(
      targets.map((target) => [target.instanceId, target.currentHealth]),
    );
    const origin: BattleLogOrigin = {
      kind: "item-effect",
      actionId,
      sourceUnitId: unit.instanceId,
      item: { id: item.id, name: item.name, position: itemIndex + 1 },
    };
    const result = applyItemEffectsToTargets(state, unit, item, targets, batchNumber, origin);
    activatedItemNames.push(item.name);
    totalDamage += result.targets.reduce((sum, target) => {
      // biome-ignore lint/style/noNonNullAssertion: item effects only receive targets from battle state.
      const scenario = findScenario(state, target.scenarioId)!;
      // biome-ignore lint/style/noNonNullAssertion: item effects preserve targets in their row.
      const updated = scenario.rows[target.rowType].find(
        (candidate) => candidate.instanceId === target.instanceId,
      )!;
      const startingHealth = startingHealthByTarget.get(target.instanceId) ?? updated.currentHealth;
      return sum + Math.max(0, startingHealth - updated.currentHealth);
    }, 0);

    if (unit.currentHealth <= 0) {
      break;
    }
  }

  if (activatedItemNames.length > 0) {
    return {
      usedBasicAttack: false,
      totalDamage,
      activatedItemNames,
    };
  }

  return {
    usedBasicAttack: true,
    totalDamage: performBasicAttack(state, unit, batchNumber, actionId),
    activatedItemNames,
  };
}

export function planUnitAction(
  snapshot: BattleState,
  actorId: string,
  batchNumber: number,
  random: () => number,
  allocateEffectId: () => string,
): PlannedAction {
  const planningState = clonePlanningState(snapshot, random, allocateEffectId);
  const actor = findUnitById(planningState, actorId);
  if (!actor) {
    throw new Error(`Action actor ${actorId} was not found in battle snapshot.`);
  }
  const actionId = `${batchNumber}:${actor.instanceId}:${actor.actedCount + 1}`;
  const existingLogLength = planningState.log.length;

  resolveUnitAction(planningState, actor, batchNumber);

  return {
    actorId,
    actionId,
    operations: getRecordedActionOperations(planningState),
    log: structuredClone(planningState.log.slice(existingLogLength)),
  };
}

export function buildReadyQueue(state: BattleState): BattleUnitState[] {
  return state.scenarios
    .flatMap((scenario) => Object.values(scenario.rows).flat())
    .filter((unit) => unit.currentHealth > 0 && unit.actionBar >= 100)
    .sort((left, right) => {
      const speedDiff = getUnitEffectiveStats(right).speed - getUnitEffectiveStats(left).speed;
      if (speedDiff !== 0) return speedDiff;
      if (left.scenarioId !== right.scenarioId) {
        return (
          state.scenarios.findIndex((scenario) => scenario.id === left.scenarioId) -
          state.scenarios.findIndex((scenario) => scenario.id === right.scenarioId)
        );
      }
      return compareUnitOrder(left, right);
    });
}
