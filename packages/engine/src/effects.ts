import { recordActionOperation } from "./action-operations";
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
  batchNumber: number,
  source: BattleUnitState,
  target: BattleUnitState,
  damage: number,
  origin: BattleLogOrigin,
  actionId?: string,
): void {
  const entry: BattleLogEntry = {
    batchNumber,
    type: "damage",
    source: source.name,
    sourceId: source.instanceId,
    target: target.name,
    targetId: target.instanceId,
    damage,
    actionId,
    origin,
    message: `${source.name} hits ${target.name} for ${damage} damage`,
  };
  pushLog(state, entry);
}

function logDeath(
  state: BattleState,
  batchNumber: number,
  unit: BattleUnitState,
  origin?: BattleLogOrigin,
  actionId?: string,
): void {
  if (
    state.log.some(
      (entry) =>
        entry.type === "death" &&
        entry.batchNumber === batchNumber &&
        entry.unitId === unit.instanceId,
    )
  ) {
    return;
  }

  pushLog(state, {
    batchNumber,
    type: "death",
    unit: unit.name,
    unitId: unit.instanceId,
    actionId,
    origin,
    message: `${unit.name} dies`,
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
  batchNumber: number,
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
    recordActionOperation(state, { kind: "healing", targetId: target.instanceId, amount });
    target.currentHealth = Math.min(maxHealth, target.currentHealth + amount);
    logHeal(state, batchNumber, caster, target, amount, origin, origin.actionId);
  }

  const directDamage =
    effect.directMeleeDmg ?? effect.directRangedDmg ?? effect.directSpellDmg ?? null;
  if (typeof directDamage === "number") {
    const modifiedDamage = computeSpellDamageWithModifiers(directDamage, casterStats, targetStats);
    recordActionOperation(state, {
      kind: "damage",
      targetId: target.instanceId,
      amount: modifiedDamage,
    });
    target.currentHealth = Math.max(0, target.currentHealth - modifiedDamage);
    logDamage(state, batchNumber, caster, target, modifiedDamage, origin, origin.actionId);
  }

  if (effect.effectType === "healing" && typeof effect.health === "number") {
    recordActionOperation(state, {
      kind: "healing",
      targetId: target.instanceId,
      amount: effect.health,
    });
    target.currentHealth = Math.min(maxHealth, target.currentHealth + effect.health);
    logHeal(state, batchNumber, caster, target, effect.health, origin, origin.actionId);
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
        actionsRemaining: effect.lastsForActions ?? 0,
        origin,
      };
      recordActionOperation(state, {
        kind: "add-effect",
        targetId: target.instanceId,
        effect: activeEffect,
      });
      target.activeEffects.push(activeEffect);
      appliedModifiers.push(activeEffect);
      logEffectApplied(
        state,
        batchNumber,
        target,
        effect.name ?? "Effect",
        {
          stat: modifier.statKey,
          value: activeEffect.value,
          actionsRemaining: effect.lastsForActions ?? 0,
        },
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
  caster: BattleUnitState,
  target: BattleUnitState,
  effect: EffectTemplateInput,
  origin: BattleLogOrigin,
): ActiveEffectState[] {
  const activeEffects: ActiveEffectState[] = [];

  if (effect.effectType === "healing") {
    const healing = effect.directHealing ?? effect.directSpellDmg;
    if (typeof healing === "number") {
      activeEffects.push({
        id: nextEffectId(state),
        name: effect.name ?? "Effect",
        sourceUnitId: caster.instanceId,
        sourceScenarioId: caster.scenarioId,
        targetUnitId: target.instanceId,
        effectType: effect.effectType,
        timingType: effect.timingType,
        value: healing,
        remainingTriggers: effect.triggerCount ?? 0,
        actionsUntilTrigger: effect.triggerEveryActions ?? 0,
        triggerEveryActions: effect.triggerEveryActions ?? 0,
        origin,
      });
    }
  } else {
    const directDamageValues = [
      effect.directMeleeDmg,
      effect.directRangedDmg,
      effect.directSpellDmg,
    ].filter((value): value is number => typeof value === "number");
    for (const value of directDamageValues) {
      activeEffects.push({
        id: nextEffectId(state),
        name: effect.name ?? "Effect",
        sourceUnitId: caster.instanceId,
        sourceScenarioId: caster.scenarioId,
        targetUnitId: target.instanceId,
        effectType: effect.effectType,
        timingType: effect.timingType,
        value,
        remainingTriggers: effect.triggerCount ?? 0,
        actionsUntilTrigger: effect.triggerEveryActions ?? 0,
        triggerEveryActions: effect.triggerEveryActions ?? 0,
        origin,
      });
    }
  }

  return activeEffects;
}

function applyEffectTemplate(
  state: BattleState,
  batchNumber: number,
  caster: BattleUnitState,
  target: BattleUnitState,
  effect: EffectTemplateInput,
  origin: BattleLogOrigin | undefined,
  effectPosition: number,
): string[] {
  if (effect.timingType === "interval") {
    const activeEffects = queueIntervalEffect(
      state,
      caster,
      target,
      effect,
      effectOrigin(origin, effect, effectPosition),
    );
    for (const activeEffect of activeEffects) {
      recordActionOperation(state, {
        kind: "add-effect",
        targetId: target.instanceId,
        effect: activeEffect,
      });
      target.activeEffects.push(activeEffect);
    }
    return [effect.name ?? "Effect"];
  }

  applyInstantEffect(
    state,
    batchNumber,
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
  batchNumber = 0,
  origin?: BattleLogOrigin,
): ApplyItemEffectsResult {
  const orderedEffects = [...item.effects].sort(
    (left, right) => left.sequenceOrder - right.sequenceOrder,
  );
  const targetIds = Object.freeze(targets.map((target) => target.instanceId));
  const targetsById = new Map(targets.map((target) => [target.instanceId, target]));
  const activationEntry: ItemActivationLogEntry = {
    batchNumber,
    type: "item-activation",
    caster: caster.name,
    casterId: caster.instanceId,
    item: item.name,
    targets: targets.map((target) => target.name),
    targetIds: [...targetIds],
    effects: orderedEffects.map((effect) => effect.effect.name ?? "Effect"),
    actionId: origin?.actionId,
    origin,
    message: `${caster.name} activates ${item.name} on ${targets.map((target) => target.name).join(", ")}`,
  };
  pushLog(state, activationEntry);

  const appliedEffectNames: string[] = [];

  for (const [effectIndex, effect] of orderedEffects.entries()) {
    const livingTargets = targetIds
      .map((targetId) => {
        const target = targetsById.get(targetId);
        if (!target) {
          throw new Error(
            `Selected target ${targetId} was not found while resolving item effects.`,
          );
        }
        return target;
      })
      .filter((target) => target.currentHealth > 0);
    if (livingTargets.length === 0) {
      break;
    }

    let applied = false;
    for (const target of livingTargets) {
      const targetResult = applyEffectTemplate(
        state,
        batchNumber,
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
  batchNumber = 0,
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
    batchNumber,
    origin,
  );
}

type PendingIntervalEvent = {
  effect: ActiveEffectState;
  source: BattleUnitState;
  target: BattleUnitState;
  amount: number;
  kind: "damage" | "healing";
};

/**
 * Advances interval effects immediately before their affected units act.
 * Every ready unit is observed once, even when several units are ready in one batch.
 */
export function processPreActionEffects(
  state: BattleState,
  readyUnitIds: readonly string[],
  batchNumber: number,
): Set<string> {
  const readyUnits = readyUnitIds
    .map((unitId) => findUnitById(state, unitId))
    .filter((unit): unit is BattleUnitState => unit !== undefined);
  const intervalSnapshot = readyUnits.flatMap((target) =>
    target.activeEffects
      .filter((effect) => effect.timingType === "interval")
      .map((effect) => ({ target, effect })),
  );
  const expiredEffectIds = new Set<string>();
  const events: PendingIntervalEvent[] = [];

  for (const { target, effect } of intervalSnapshot) {
    if (target.currentHealth <= 0) {
      expiredEffectIds.add(effect.id);
      continue;
    }

    if ((effect.remainingTriggers ?? 0) <= 0) {
      expiredEffectIds.add(effect.id);
      continue;
    }

    effect.actionsUntilTrigger = (effect.actionsUntilTrigger ?? 0) - 1;
    if (effect.actionsUntilTrigger > 0) {
      continue;
    }

    const source = findUnitById(state, effect.sourceUnitId);
    if (!source) {
      expiredEffectIds.add(effect.id);
      continue;
    }

    const amount =
      effect.effectType === "healing"
        ? effect.value
        : computeSpellDamageWithModifiers(
            effect.value,
            getUnitEffectiveStats(source),
            getUnitEffectiveStats(target),
          );
    events.push({
      effect,
      source,
      target,
      amount,
      kind: effect.effectType === "healing" ? "healing" : "damage",
    });

    effect.remainingTriggers = (effect.remainingTriggers ?? 0) - 1;
    if ((effect.remainingTriggers ?? 0) > 0) {
      effect.actionsUntilTrigger = effect.triggerEveryActions ?? 0;
    } else {
      expiredEffectIds.add(effect.id);
    }
  }

  const totals = new Map<string, { target: BattleUnitState; damage: number; healing: number }>();
  for (const event of events) {
    const total = totals.get(event.target.instanceId) ?? {
      target: event.target,
      damage: 0,
      healing: 0,
    };
    total[event.kind] += event.amount;
    totals.set(event.target.instanceId, total);
  }
  for (const { target, damage, healing } of totals.values()) {
    target.currentHealth = Math.max(
      0,
      Math.min(getUnitEffectiveStats(target).health, target.currentHealth + healing - damage),
    );
    if (target.currentHealth === 0) {
      for (const { effect } of intervalSnapshot.filter(
        (entry) => entry.target.instanceId === target.instanceId,
      )) {
        expiredEffectIds.add(effect.id);
      }
    }
  }

  for (const event of events) {
    const origin = event.effect.origin ?? { kind: "item-effect" as const };
    if (event.kind === "healing") {
      logHeal(state, batchNumber, event.source, event.target, event.amount, origin);
    } else {
      logDamage(state, batchNumber, event.source, event.target, event.amount, origin);
    }
  }
  for (const { target } of totals.values()) {
    if (target.currentHealth === 0) {
      logDeath(state, batchNumber, target);
    }
  }
  for (const { target, effect } of intervalSnapshot) {
    if (expiredEffectIds.has(effect.id)) {
      target.activeEffects = target.activeEffects.filter((candidate) => candidate.id !== effect.id);
    }
  }
  for (const { target, effect } of intervalSnapshot) {
    if (expiredEffectIds.has(effect.id) && !findUnitById(state, effect.sourceUnitId)) {
      logEffectExpired(state, batchNumber, target, effect.name, undefined, effect.origin);
    }
  }

  return new Set(
    readyUnits.filter((unit) => unit.currentHealth > 0).map((unit) => unit.instanceId),
  );
}

/** Decrements only modifiers that existed before the resolved action batch. */
export function completeResolvedActionEffects(
  state: BattleState,
  actorIds: readonly string[],
  eligibleEffectIds: ReadonlySet<string>,
  batchNumber: number,
): void {
  for (const actorId of actorIds) {
    const unit = findUnitById(state, actorId);
    if (!unit) continue;

    const oldMaximumMana = getUnitEffectiveStats(unit).mana;
    const expired = unit.activeEffects.filter(
      (effect) =>
        effect.actionsRemaining !== undefined &&
        eligibleEffectIds.has(effect.id) &&
        --effect.actionsRemaining <= 0,
    );
    if (expired.length === 0) continue;

    unit.activeEffects = unit.activeEffects.filter(
      (effect) => !expired.some((candidate) => candidate.id === effect.id),
    );
    const updatedStats = getUnitEffectiveStats(unit);
    clampHealth(unit, updatedStats.health);
    reconcileManaForCapacityChange(unit, oldMaximumMana, updatedStats.mana);
    for (const effect of expired) {
      logEffectExpired(
        state,
        batchNumber,
        unit,
        effect.name,
        effect.statKey
          ? { stat: effect.statKey, value: effect.value, actionsRemaining: 0 }
          : undefined,
        effect.origin,
      );
    }
  }
}
