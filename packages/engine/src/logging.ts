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
} from "./types";

export function pushLog(state: BattleState, entry: BattleLogEntry): void {
  state.log.push(entry);
}

export function logEffectApplied(
  state: BattleState,
  tick: number,
  target: BattleUnitState,
  effect: string,
  stat?: string,
  actionId?: string,
  origin?: BattleLogOrigin,
): void {
  const entry: EffectApplyLogEntry = {
    tick,
    type: "effect-apply",
    target: target.name,
    targetId: target.instanceId,
    effect,
    stat,
    actionId,
    origin,
    message: stat
      ? `Tick ${tick}: ${target.name} gains ${effect} (${stat} modified)`
      : `Tick ${tick}: ${target.name} gains ${effect}`,
  };
  pushLog(state, entry);
}

export function logEffectExpired(
  state: BattleState,
  tick: number,
  target: BattleUnitState,
  effect: string,
  origin?: BattleLogOrigin,
): void {
  const entry: EffectExpireLogEntry = {
    tick,
    type: "effect-expire",
    target: target.name,
    targetId: target.instanceId,
    effect,
    origin,
    message: `Tick ${tick}: ${effect} expires on ${target.name}`,
  };
  pushLog(state, entry);
}

export function logHeal(
  state: BattleState,
  tick: number,
  source: BattleUnitState,
  target: BattleUnitState,
  amount: number,
  origin: BattleLogOrigin,
  actionId?: string,
): void {
  const entry: HealLogEntry = {
    tick,
    type: "heal",
    source: source.name,
    sourceId: source.instanceId,
    target: target.name,
    targetId: target.instanceId,
    amount,
    actionId,
    origin,
    message: `Tick ${tick}: ${source.name} heals ${target.name} for ${amount}`,
  };
  pushLog(state, entry);
}

export function logFatigue(
  state: BattleState,
  tick: number,
  target: BattleUnitState,
  damage: number,
): void {
  const entry: FatigueLogEntry = {
    tick,
    type: "fatigue",
    target: target.name,
    targetId: target.instanceId,
    damage,
    origin: { kind: "fatigue" },
    message: `Tick ${tick}: fatigue hits ${target.name} for ${damage} damage`,
  };
  pushLog(state, entry);
}

export function logBattleEnd(state: BattleState, tick: number, winnerId: string | null): void {
  const outcome = winnerId === null ? "draw" : winnerId;
  const entry: BattleEndLogEntry = {
    tick,
    type: "battle-end",
    outcome,
    winnerId,
    message: `Battle ends: ${outcome}`,
  };
  pushLog(state, entry);
}
