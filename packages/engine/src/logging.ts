import type {
  BattleEndLogEntry,
  BattleLogEntry,
  BattleLogOrigin,
  BattleState,
  BattleUnitState,
  EffectApplyLogEntry,
  EffectExpireLogEntry,
  FatigueLogEntry,
  HealLogEntry,
  StatKey,
} from "./types";

type EffectLogModifier = {
  stat: StatKey;
  value: number;
  actionsRemaining: number;
};

export function pushLog(state: BattleState, entry: BattleLogEntry): void {
  state.log.push(entry);
}

export function logEffectApplied(
  state: BattleState,
  batchNumber: number,
  target: BattleUnitState,
  effect: string,
  modifier: EffectLogModifier,
  actionId?: string,
  origin?: BattleLogOrigin,
): void {
  const entry: EffectApplyLogEntry = {
    batchNumber,
    type: "effect-apply",
    target: target.name,
    targetId: target.instanceId,
    effect,
    stat: modifier.stat,
    value: modifier.value,
    actionsRemaining: modifier.actionsRemaining,
    actionId,
    origin,
    message: `${target.name} gains ${effect} (${modifier.stat} modified)`,
  };
  pushLog(state, entry);
}

export function logEffectExpired(
  state: BattleState,
  batchNumber: number,
  target: BattleUnitState,
  effect: string,
  modifier: EffectLogModifier | undefined,
  origin?: BattleLogOrigin,
): void {
  const entry: EffectExpireLogEntry = {
    batchNumber,
    type: "effect-expire",
    target: target.name,
    targetId: target.instanceId,
    effect,
    ...(modifier
      ? {
          stat: modifier.stat,
          value: modifier.value,
          actionsRemaining: modifier.actionsRemaining,
        }
      : {}),
    origin,
    message: `${effect} expires on ${target.name}`,
  };
  pushLog(state, entry);
}

export function logHeal(
  state: BattleState,
  batchNumber: number,
  source: BattleUnitState,
  target: BattleUnitState,
  amount: number,
  origin: BattleLogOrigin,
  actionId?: string,
): void {
  const entry: HealLogEntry = {
    batchNumber,
    type: "heal",
    source: source.name,
    sourceId: source.instanceId,
    target: target.name,
    targetId: target.instanceId,
    amount,
    actionId,
    origin,
    message: `${source.name} heals ${target.name} for ${amount}`,
  };
  pushLog(state, entry);
}

export function logFatigue(
  state: BattleState,
  batchNumber: number,
  target: BattleUnitState,
  damage: number,
): void {
  const entry: FatigueLogEntry = {
    batchNumber,
    type: "fatigue",
    target: target.name,
    targetId: target.instanceId,
    damage,
    origin: { kind: "fatigue" },
    message: `Fatigue hits ${target.name} for ${damage} damage`,
  };
  pushLog(state, entry);
}

export function logBattleEnd(state: BattleState, batchNumber: number, winnerId: string | null): void {
  const outcome = winnerId === null ? "draw" : winnerId;
  const entry: BattleEndLogEntry = {
    batchNumber,
    type: "battle-end",
    outcome,
    winnerId,
    message: `Battle ends: ${outcome}`,
  };
  pushLog(state, entry);
}
