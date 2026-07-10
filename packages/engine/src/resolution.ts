import { applySpell } from "./effects";
import { pushLog } from "./logging";
import {
  computeBasicAttackDamage,
  computeBasicDamageWithModifiers,
  getUnitEffectiveStats,
} from "./math";
import { compareUnitOrder } from "./rows";
import { findScenario } from "./state";
import { selectTargets } from "./targeting";
import type { BattleState, BattleUnitState, SpellInput } from "./types";

export type ActionOutcome = {
  usedBasicAttack: boolean;
  totalDamage: number;
  castSpellNames: string[];
};

function basicAttackPolicySpell(unit: BattleUnitState): SpellInput {
  return {
    name: "Basic Attack",
    targetPolicy: unit.targetPolicyOverride ?? unit.targetPolicy ?? "highest_health",
    targetRowCount: 1,
    maxTargetsPerRow: 1,
    targetOnlyAdjacent: false,
    allowedRowTypes: [],
    effects: [],
  };
}

export function performBasicAttack(
  state: BattleState,
  attacker: BattleUnitState,
  tick = state.tick,
): number {
  const targets = selectTargets(state, attacker, basicAttackPolicySpell(attacker));
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
    message: `Tick ${tick}: ${attacker.name} hits ${target.name} for ${damage} damage`,
  });
  if (target.currentHealth === 0) {
    pushLog(state, {
      tick,
      type: "death",
      unit: target.name,
      unitId: target.instanceId,
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
  const castSpellNames: string[] = [];
  let totalDamage = 0;

  const items = [...unit.items];

  for (const item of items) {
    if (item.linkedSpells.length === 0) continue;
    if (unit.mana < item.activationManaCost) continue;
    if (unit.currentHealth < item.activationHealthCost) continue;

    const castableSpells = item.linkedSpells;
    if (castableSpells.length === 0) continue;

    unit.mana -= item.activationManaCost;
    unit.currentHealth -= item.activationHealthCost;

    for (const spell of [...castableSpells].sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const startingHealthByTarget = new Map(
        selectTargets(state, unit, spell).map((target) => [
          target.instanceId,
          target.currentHealth,
        ]),
      );
      const result = applySpell(state, unit, spell, tick);
      castSpellNames.push(spell.name);
      totalDamage += result.targets.reduce((sum, target) => {
        // biome-ignore lint/style/noNonNullAssertion: applySpell only returns targets from battle state.
        const scenario = findScenario(state, target.scenarioId)!;
        // biome-ignore lint/style/noNonNullAssertion: applySpell preserves returned targets in their row.
        const updated = scenario.rows[target.rowType].find(
          (candidate) => candidate.instanceId === target.instanceId,
        )!;
        const startingHealth =
          startingHealthByTarget.get(target.instanceId) ?? updated.currentHealth;
        return sum + Math.max(0, startingHealth - updated.currentHealth);
      }, 0);
    }

    if (unit.currentHealth <= 0) {
      break;
    }
  }

  if (castSpellNames.length > 0) {
    return {
      usedBasicAttack: false,
      totalDamage,
      castSpellNames,
    };
  }

  return {
    usedBasicAttack: true,
    totalDamage: performBasicAttack(state, unit, tick),
    castSpellNames,
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
