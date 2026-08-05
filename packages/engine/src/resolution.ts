import { applyItemEffectsToTargets } from "./effects";
import { pushLog } from "./logging";
import {
  computeBasicAttackDamage,
  computeBasicDamageWithModifiers,
  getUnitEffectiveStats,
} from "./math";
import { compareUnitOrder } from "./rows";
import { findScenario } from "./state";
import type { UnitTargetingInput } from "./targeting";
import { selectTargets } from "./targeting";
import type { BattleLogOrigin, BattleState, BattleUnitState } from "./types";

export type ActionOutcome = {
  usedBasicAttack: boolean;
  totalDamage: number;
  activatedItemNames: string[];
};

function basicAttackTargeting(unit: BattleUnitState): UnitTargetingInput {
  return {
    targetSide: "enemies",
    targetPolicy: unit.targetPolicyOverride ?? unit.targetPolicy ?? "highest_health",
    targetRowCount: 1,
    maxTargetsPerRow: 1,
    targetOnlyAdjacent: false,
    allowedRowTypes: [],
  };
}

export function performBasicAttack(
  state: BattleState,
  attacker: BattleUnitState,
  tick = state.tick,
  actionId = `${tick}:${attacker.instanceId}:${attacker.actedCount + 1}`,
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

  target.currentHealth = Math.max(0, target.currentHealth - damage);
  pushLog(state, {
    tick,
    type: "attack",
    attacker: attacker.name,
    attackerId: attacker.instanceId,
    target: target.name,
    targetId: target.instanceId,
    damage,
    actionId,
    origin: { kind: "basic-attack", actionId, sourceUnitId: attacker.instanceId },
    message: `Tick ${tick}: ${attacker.name} attacks ${target.name} for ${damage} damage`,
  });
  pushLog(state, {
    tick,
    type: "damage",
    source: attacker.name,
    sourceId: attacker.instanceId,
    target: target.name,
    targetId: target.instanceId,
    damage,
    actionId,
    origin: { kind: "basic-attack", actionId, sourceUnitId: attacker.instanceId },
    message: `Tick ${tick}: ${attacker.name} hits ${target.name} for ${damage} damage`,
  });
  if (target.currentHealth === 0) {
    pushLog(state, {
      tick,
      type: "death",
      unit: target.name,
      unitId: target.instanceId,
      actionId,
      origin: { kind: "basic-attack", actionId, sourceUnitId: attacker.instanceId },
      message: `Tick ${tick}: ${target.name} dies`,
    });
  }
  return damage;
}

export function resolveUnitAction(
  state: BattleState,
  unit: BattleUnitState,
  tick = state.tick,
): ActionOutcome {
  const activatedItemNames: string[] = [];
  let totalDamage = 0;
  const actionId = `${tick}:${unit.instanceId}:${unit.actedCount + 1}`;

  const items = [...unit.items];

  for (const [itemIndex, item] of items.entries()) {
    if (item.effects.length === 0) continue;
    if (unit.mana < item.activationManaCost) continue;
    if (unit.currentHealth < item.activationHealthCost) continue;

    const targets = selectTargets(state, unit, unit);
    if (targets.length === 0) continue;

    unit.mana -= item.activationManaCost;
    unit.currentHealth -= item.activationHealthCost;

    const startingHealthByTarget = new Map(
      targets.map((target) => [target.instanceId, target.currentHealth]),
    );
    const origin: BattleLogOrigin = {
      kind: "item-effect",
      actionId,
      sourceUnitId: unit.instanceId,
      item: { id: item.id, name: item.name, position: itemIndex + 1 },
    };
    const result = applyItemEffectsToTargets(state, unit, item, targets, tick, origin);
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
    totalDamage: performBasicAttack(state, unit, tick, actionId),
    activatedItemNames,
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
