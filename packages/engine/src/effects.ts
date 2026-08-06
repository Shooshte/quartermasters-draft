import { logEffectApplied, logEffectExpired, logHeal, pushLog } from "./logging";
import { computeSpellDamageWithModifiers, getUnitEffectiveStats } from "./math";
import { clampHealth, findUnitById, nextEffectId, reconcileManaForCapacityChange } from "./state";
import { selectTargets } from "./targeting";
import type {
  ActiveEffectState,
  BattleItemState,
  BattleLogEntry,
  BattleLogOrigin,
  BattleState,
  BattleUnitState,
  EffectTemplateInput,
  ItemActivationLogEntry,
  StatKey,
} from "./types";

type ApplyItemEffectsResult = {
  targets: BattleUnitState[];
  appliedEffectNames: string[];
};

function normalizeDebuffValue(value: number): number {
  return value > 0 ? -value : value;
}

function effectStatEntries(
  effect: EffectTemplateInput,
): Array<{ statKey: StatKey; value: number }> {
  const entries: Array<{ statKey: StatKey; value: number }> = [];
  for (const statKey of [
    "health",
    "mana",
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
  origin: BattleLogOrigin,
  actionId?: string,
): void {
  const entry: BattleLogEntry = {
    tick,
    type: "damage",
    source: source.name,
    sourceId: source.instanceId,
    target: target.name,
    targetId: target.instanceId,
    damage,
    actionId,
    origin,
    message: `Tick ${tick}: ${source.name} hits ${target.name} for ${damage} damage`,
  };
  pushLog(state, entry);
}

function logDeath(
  state: BattleState,
  tick: number,
  unit: BattleUnitState,
  origin?: BattleLogOrigin,
  actionId?: string,
): void {
  if (
    state.log.some(
      (entry) => entry.type === "death" && entry.tick === tick && entry.unitId === unit.instanceId,
    )
  ) {
    return;
  }

  pushLog(state, {
    tick,
    type: "death",
    unit: unit.name,
    unitId: unit.instanceId,
    actionId,
    origin,
    message: `Tick ${tick}: ${unit.name} dies`,
  });
}

function effectOrigin(
  origin: BattleLogOrigin | undefined,
  effect: EffectTemplateInput,
  position: number,
): BattleLogOrigin {
  return {
    kind: "item-effect",
    ...origin,
    effect: { id: effect.id, name: effect.name ?? "Effect", position },
  };
}

function applyInstantEffect(
  state: BattleState,
  tick: number,
  caster: BattleUnitState,
  target: BattleUnitState,
  effect: EffectTemplateInput,
  origin: BattleLogOrigin,
): ActiveEffectState[] {
  const appliedModifiers: ActiveEffectState[] = [];
  const casterStats = getUnitEffectiveStats(caster);
  const targetStats = getUnitEffectiveStats(target);
  const maxHealth = getUnitEffectiveStats(target).health;

  if (typeof effect.directHealing === "number") {
    const amount = effect.directHealing;
    target.currentHealth = Math.min(maxHealth, target.currentHealth + amount);
    logHeal(state, tick, caster, target, amount, origin, origin.actionId);
  }

  const directDamage =
    effect.directMeleeDmg ?? effect.directRangedDmg ?? effect.directSpellDmg ?? null;
  if (typeof directDamage === "number") {
    const modifiedDamage = computeSpellDamageWithModifiers(directDamage, casterStats, targetStats);
    target.currentHealth = Math.max(0, target.currentHealth - modifiedDamage);
    logDamage(state, tick, caster, target, modifiedDamage, origin, origin.actionId);
    if (target.currentHealth === 0) {
      logDeath(state, tick, target, origin, origin.actionId);
    }
  }

  if (effect.effectType === "healing" && typeof effect.health === "number") {
    target.currentHealth = Math.min(maxHealth, target.currentHealth + effect.health);
    logHeal(state, tick, caster, target, effect.health, origin, origin.actionId);
  }

  if (effect.effectType === "buff" || effect.effectType === "debuff") {
    const oldMaximumMana = getUnitEffectiveStats(target).mana;
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
          effect.effectType === "debuff" ? normalizeDebuffValue(modifier.value) : modifier.value,
        expiresAtTick: tick + (effect.durationTicks ?? 0),
        origin,
      };
      target.activeEffects.push(activeEffect);
      appliedModifiers.push(activeEffect);
      logEffectApplied(
        state,
        tick,
        target,
        effect.name ?? "Effect",
        modifier.statKey,
        origin.actionId,
        origin,
      );
    }
    const updatedStats = getUnitEffectiveStats(target);
    clampHealth(target, updatedStats.health);
    reconcileManaForCapacityChange(target, oldMaximumMana, updatedStats.mana);
  }

  return appliedModifiers;
}

function queueIntervalEffect(
  state: BattleState,
  tick: number,
  caster: BattleUnitState,
  target: BattleUnitState,
  effect: EffectTemplateInput,
  origin: BattleLogOrigin,
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
      nextTriggerTick: tick + (effect.intervalTicks ?? 0),
      intervalTicks: effect.intervalTicks ?? 0,
      origin,
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
  origin: BattleLogOrigin | undefined,
  effectPosition: number,
): string[] {
  if (effect.timingType === "interval") {
    target.activeEffects.push(
      ...queueIntervalEffect(
        state,
        tick,
        caster,
        target,
        effect,
        effectOrigin(origin, effect, effectPosition),
      ),
    );
    return [effect.name ?? "Effect"];
  }

  applyInstantEffect(
    state,
    tick,
    caster,
    target,
    effect,
    effectOrigin(origin, effect, effectPosition),
  );
  return [effect.name ?? "Effect"];
}

export function applyItemEffectsToTargets(
  state: BattleState,
  caster: BattleUnitState,
  item: BattleItemState,
  targets: BattleUnitState[],
  tick = state.tick,
  origin?: BattleLogOrigin,
): ApplyItemEffectsResult {
  const orderedEffects = [...item.effects].sort(
    (left, right) => left.sequenceOrder - right.sequenceOrder,
  );
  const targetIds = Object.freeze(targets.map((target) => target.instanceId));
  const targetsById = new Map(targets.map((target) => [target.instanceId, target]));
  const activationEntry: ItemActivationLogEntry = {
    tick,
    type: "item-activation",
    caster: caster.name,
    casterId: caster.instanceId,
    item: item.name,
    targets: targets.map((target) => target.name),
    targetIds: [...targetIds],
    effects: orderedEffects.map((effect) => effect.effect.name ?? "Effect"),
    actionId: origin?.actionId,
    origin,
    message: `Tick ${tick}: ${caster.name} activates ${item.name} on ${targets.map((target) => target.name).join(", ")}`,
  };
  pushLog(state, activationEntry);

  const appliedEffectNames: string[] = [];

  for (const [effectIndex, effect] of orderedEffects.entries()) {
    let applied = false;
    for (const targetId of targetIds) {
      const target = targetsById.get(targetId);
      if (!target) {
        throw new Error(`Selected target ${targetId} was not found while resolving item effects.`);
      }
      const targetResult = applyEffectTemplate(
        state,
        tick,
        caster,
        target,
        effect.effect,
        origin,
        effectIndex + 1,
      );
      applied ||= targetResult.length > 0;
    }
    if (applied) {
      appliedEffectNames.push(effect.effect.name ?? "Effect");
    }
  }

  return {
    targets,
    appliedEffectNames,
  };
}

export function applyItemEffects(
  state: BattleState,
  caster: BattleUnitState,
  item: BattleItemState,
  tick = state.tick,
): ApplyItemEffectsResult {
  const equippedIndex = caster.items.findIndex(
    (candidate) => candidate === item || (item.id != null && candidate.id === item.id),
  );
  const origin: BattleLogOrigin = {
    kind: "item-effect",
    sourceUnitId: caster.instanceId,
    item: {
      id: item.id,
      name: item.name,
      position: equippedIndex >= 0 ? equippedIndex + 1 : 1,
    },
  };
  return applyItemEffectsToTargets(
    state,
    caster,
    item,
    selectTargets(state, caster, caster),
    tick,
    origin,
  );
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
    const oldMaximumMana = getUnitEffectiveStats(unit).mana;
    const remaining: ActiveEffectState[] = [];
    for (const effect of unit.activeEffects) {
      if (
        effect.timingType === "interval" &&
        effect.nextTriggerTick != null &&
        effect.remainingTriggers
      ) {
        if (effect.nextTriggerTick <= currentTick && unit.currentHealth > 0) {
          const source = findUnitById(state, effect.sourceUnitId);
          if (!source) {
            logEffectExpired(state, currentTick, unit, effect.name, effect.origin);
            continue;
          }
          const sourceStats = getUnitEffectiveStats(source);
          const targetStats = getUnitEffectiveStats(unit);
          if (effect.effectType === "healing") {
            unit.currentHealth += effect.value;
            clampHealth(unit, getUnitEffectiveStats(unit).health);
            logHeal(
              state,
              currentTick,
              source,
              unit,
              effect.value,
              effect.origin ?? {
                kind: "item-effect",
              },
            );
          } else {
            const modifiedDamage = computeSpellDamageWithModifiers(
              effect.value,
              sourceStats,
              targetStats,
            );
            unit.currentHealth = Math.max(0, unit.currentHealth - modifiedDamage);
            logDamage(
              state,
              currentTick,
              source,
              unit,
              modifiedDamage,
              effect.origin ?? {
                kind: "item-effect",
              },
            );
            if (unit.currentHealth === 0) {
              logDeath(state, currentTick, unit, effect.origin);
            }
          }
          effect.remainingTriggers -= 1;
          if ((effect.remainingTriggers ?? 0) > 0) {
            effect.nextTriggerTick += effect.intervalTicks ?? 0;
          }
        }
      }

      if (effect.timingType === "interval" && (effect.remainingTriggers ?? 0) > 0) {
        remaining.push(effect);
        continue;
      }

      if (
        effect.timingType === "instant" &&
        effect.expiresAtTick != null &&
        effect.expiresAtTick > currentTick
      ) {
        remaining.push(effect);
        continue;
      }

      if (
        effect.timingType === "instant" &&
        effect.expiresAtTick != null &&
        effect.expiresAtTick <= currentTick
      ) {
        logEffectExpired(state, currentTick, unit, effect.name, effect.origin);
        clampHealth(unit, getUnitEffectiveStats(unit).health);
      }
    }
    unit.activeEffects = remaining;
    const updatedStats = getUnitEffectiveStats(unit);
    clampHealth(unit, updatedStats.health);
    reconcileManaForCapacityChange(unit, oldMaximumMana, updatedStats.mana);
  }
}
