import { computeSpellDamageWithModifiers, getUnitEffectiveStats } from "./math";
import {
  clampHealth,
  findUnitById,
  nextEffectId,
} from "./state";
import {
  logEffectApplied,
  logEffectExpired,
  logHeal,
  pushLog,
} from "./logging";
import { selectTargets } from "./targeting";
import type {
  ActiveEffectState,
  BattleLogEntry,
  BattleState,
  BattleUnitState,
  EffectTemplateInput,
  SpellCastLogEntry,
  SpellInput,
  StatKey,
} from "./types";

type ApplySpellResult = {
  targets: BattleUnitState[];
  appliedEffectNames: string[];
};

function normalizeDebuffValue(value: number): number {
  return value > 0 ? -value : value;
}

function effectStatEntries(effect: EffectTemplateInput): Array<{ statKey: StatKey; value: number }> {
  const entries: Array<{ statKey: StatKey; value: number }> = [];
  for (const statKey of [
    "health",
    "meleeDmg",
    "rangedDmg",
    "manaRegen",
    "spellDmg",
    "speed",
    "dodge",
    "criticalChance",
  ] as const) {
    const value = effect[statKey];
    if (typeof value === "number") {
      entries.push({ statKey, value });
    }
  }
  return entries;
}

function logDamage(
  state: BattleState,
  tick: number,
  source: BattleUnitState,
  target: BattleUnitState,
  damage: number,
): void {
  const entry: BattleLogEntry = {
    tick,
    type: "damage",
    source: source.name,
    sourceId: source.instanceId,
    target: target.name,
    targetId: target.instanceId,
    damage,
    message: `Tick ${tick}: ${source.name} hits ${target.name} for ${damage} damage`,
  };
  pushLog(state, entry);
}

function logDeath(state: BattleState, tick: number, unit: BattleUnitState): void {
  if (state.log.some((entry) => entry.type === "death" && entry.tick === tick && entry.unitId === unit.instanceId)) {
    return;
  }

  pushLog(state, {
    tick,
    type: "death",
    unit: unit.name,
    unitId: unit.instanceId,
    message: `Tick ${tick}: ${unit.name} dies`,
  });
}

function applyInstantEffect(
  state: BattleState,
  tick: number,
  caster: BattleUnitState,
  target: BattleUnitState,
  effect: EffectTemplateInput,
): ActiveEffectState[] {
  const appliedModifiers: ActiveEffectState[] = [];
  const casterStats = getUnitEffectiveStats(caster);
  const targetStats = getUnitEffectiveStats(target);
  const maxHealth = getUnitEffectiveStats(target).health;

  if (typeof effect.directHealing === "number") {
    const amount = effect.directHealing;
    target.currentHealth = Math.min(maxHealth, target.currentHealth + amount);
    logHeal(state, tick, caster, target, amount);
  }

  const directDamage =
    effect.directMeleeDmg ?? effect.directRangedDmg ?? effect.directSpellDmg ?? null;
  if (typeof directDamage === "number") {
    const modifiedDamage = computeSpellDamageWithModifiers(directDamage, casterStats, targetStats);
    target.currentHealth = Math.max(0, target.currentHealth - modifiedDamage);
    logDamage(state, tick, caster, target, modifiedDamage);
    if (target.currentHealth === 0) {
      logDeath(state, tick, target);
    }
  }

  if (effect.effectType === "healing" && typeof effect.health === "number") {
    target.currentHealth = Math.min(maxHealth, target.currentHealth + effect.health);
    logHeal(state, tick, caster, target, effect.health);
  }

  if (effect.effectType === "buff" || effect.effectType === "debuff") {
    for (const modifier of effectStatEntries(effect)) {
      const activeEffect: ActiveEffectState = {
        id: nextEffectId(state),
        name: effect.name ?? "Effect",
        sourceUnitId: caster.instanceId,
        sourceScenarioId: caster.scenarioId,
        targetUnitId: target.instanceId,
        effectType: effect.effectType,
        timingType: effect.timingType,
        statKey: modifier.statKey,
        value:
          effect.effectType === "debuff"
            ? normalizeDebuffValue(modifier.value)
            : modifier.value,
        expiresAtTick: tick + (effect.durationMs ?? 0),
      };
      target.activeEffects.push(activeEffect);
      appliedModifiers.push(activeEffect);
      logEffectApplied(state, tick, target, effect.name ?? "Effect", modifier.statKey);
    }
    clampHealth(target, getUnitEffectiveStats(target).health);
  }

  return appliedModifiers;
}

function queueIntervalEffect(
  state: BattleState,
  tick: number,
  caster: BattleUnitState,
  target: BattleUnitState,
  effect: EffectTemplateInput,
): ActiveEffectState[] {
  const activeEffects: ActiveEffectState[] = [];

  if (typeof effect.directSpellDmg === "number" || typeof effect.directHealing === "number") {
    activeEffects.push({
      id: nextEffectId(state),
      name: effect.name ?? "Effect",
      sourceUnitId: caster.instanceId,
      sourceScenarioId: caster.scenarioId,
      targetUnitId: target.instanceId,
      effectType: effect.effectType,
      timingType: effect.timingType,
      value: effect.directHealing ?? effect.directSpellDmg ?? 0,
      remainingTriggers: effect.triggerCount ?? 0,
      nextTriggerTick: tick + (effect.intervalMs ?? 0),
      intervalMs: effect.intervalMs ?? 0,
    });
  }

  return activeEffects;
}

function applyEffectTemplate(
  state: BattleState,
  tick: number,
  caster: BattleUnitState,
  target: BattleUnitState,
  effect: EffectTemplateInput,
): string[] {
  if (target.currentHealth <= 0) {
    return [];
  }

  if (effect.timingType === "interval") {
    target.activeEffects.push(...queueIntervalEffect(state, tick, caster, target, effect));
    return [effect.name ?? "Effect"];
  }

  applyInstantEffect(state, tick, caster, target, effect);
  return [effect.name ?? "Effect"];
}

export function applySpell(
  state: BattleState,
  caster: BattleUnitState,
  spell: SpellInput,
  tick = state.tick,
): ApplySpellResult {
  const targets = selectTargets(state, caster, spell);
  const spellEntry: SpellCastLogEntry = {
    tick,
    type: "spell-cast",
    caster: caster.name,
    casterId: caster.instanceId,
    spell: spell.name,
    targets: targets.map((target) => target.name),
    targetIds: targets.map((target) => target.instanceId),
    effects: (spell.effects ?? []).map((effect) => effect.effect.name ?? "Effect"),
    message: `Tick ${tick}: ${caster.name} casts ${spell.name} on ${targets.map((target) => target.name).join(", ")}`,
  };
  pushLog(state, spellEntry);

  const appliedEffectNames: string[] = [];
  const orderedEffects = [...(spell.effects ?? [])].sort(
    (left, right) => left.sequenceOrder - right.sequenceOrder,
  );

  for (const target of targets) {
    for (const effect of orderedEffects) {
      if (target.currentHealth <= 0) break;
      appliedEffectNames.push(...applyEffectTemplate(state, tick, caster, target, effect.effect));
    }
  }

  return {
    targets,
    appliedEffectNames,
  };
}

export function processOngoingEffects(state: BattleState, elapsedTicks: number): void {
  for (let step = 0; step < elapsedTicks; step += 1) {
    state.tick += 1;
    processCurrentTickEffects(state);
  }
}

export function processCurrentTickEffects(state: BattleState): void {
  const currentTick = state.tick;
  for (const unit of state.scenarios.flatMap((scenario) => Object.values(scenario.rows).flat())) {
    const remaining: ActiveEffectState[] = [];
    for (const effect of unit.activeEffects) {
      if (effect.timingType === "interval" && effect.nextTriggerTick != null && effect.remainingTriggers) {
        if (effect.nextTriggerTick <= currentTick && unit.currentHealth > 0) {
          const source = findUnitById(state, effect.sourceUnitId);
          if (!source) continue;
          const sourceStats = getUnitEffectiveStats(source);
          const targetStats = getUnitEffectiveStats(unit);
          if (effect.effectType === "healing") {
            unit.currentHealth += effect.value;
            clampHealth(unit, getUnitEffectiveStats(unit).health);
            logHeal(state, currentTick, source, unit, effect.value);
          } else {
            const modifiedDamage = computeSpellDamageWithModifiers(effect.value, sourceStats, targetStats);
            unit.currentHealth = Math.max(0, unit.currentHealth - modifiedDamage);
            logDamage(state, currentTick, source, unit, modifiedDamage);
            if (unit.currentHealth === 0) {
              logDeath(state, currentTick, unit);
            }
          }
          effect.remainingTriggers -= 1;
          if ((effect.remainingTriggers ?? 0) > 0) {
            effect.nextTriggerTick += effect.intervalMs ?? 0;
          }
        }
      }

      if (effect.timingType === "interval" && (effect.remainingTriggers ?? 0) > 0) {
        remaining.push(effect);
        continue;
      }

      if (effect.timingType === "instant" && effect.expiresAtTick != null && effect.expiresAtTick > currentTick) {
        remaining.push(effect);
        continue;
      }

      if (effect.timingType === "instant" && effect.expiresAtTick != null && effect.expiresAtTick <= currentTick) {
        logEffectExpired(state, currentTick, unit, effect.name);
        clampHealth(unit, getUnitEffectiveStats(unit).health);
      }
    }
    unit.activeEffects = remaining;
  }
}
