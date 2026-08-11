import { commitPlannedActions } from "./action-operations";
import { advanceToNextReadyBatch } from "./action-scheduler";
import { completeResolvedActionEffects, processPreActionEffects } from "./effects";
import { logBattleEnd, logFatigue, pushLog } from "./logging";
import { getUnitEffectiveStats } from "./math";
import { planUnitAction } from "./resolution";
import {
  allUnits,
  cloneState,
  findUnitById,
  initializeBattleState,
  livingUnitsForScenario,
  nextEffectId,
  nextRandom,
} from "./state";
import type { BattleInput, BattleOptions, BattleResult, BattleState } from "./types";

function determineWinner(state: BattleState): string | null | undefined {
  const livingCounts = state.scenarios.map(
    (scenario) => livingUnitsForScenario(state, scenario.id).length,
  );
  if (livingCounts[0] === 0 && livingCounts[1] === 0) return null;
  // biome-ignore lint/style/noNonNullAssertion: battle validation guarantees two scenarios.
  if (livingCounts[0] === 0) return state.scenarios[1]!.id;
  // biome-ignore lint/style/noNonNullAssertion: battle validation guarantees two scenarios.
  if (livingCounts[1] === 0) return state.scenarios[0]!.id;
  return undefined;
}

function maybeFinishBattle(state: BattleState, endedByActionLimit = false): void {
  const winner = determineWinner(state);
  if (winner !== undefined) {
    state.winnerId = winner;
    state.status = "finished";
    if (state.log.at(-1)?.type !== "battle-end") {
      logBattleEnd(state, state.batchCount, winner, endedByActionLimit);
    }
  }
}

function regenerateReadyMana(state: BattleState, readyIds: ReadonlySet<string>): void {
  for (const unitId of readyIds) {
    const unit = findUnitById(state, unitId);
    if (!unit || unit.currentHealth <= 0) continue;
    const stats = getUnitEffectiveStats(unit);
    unit.mana = Math.min(stats.mana, unit.mana + stats.manaRegen);
  }
}

function fatigueForOrdinal(ordinal: number, threshold: number, start: number): number {
  return ordinal <= threshold ? 0 : start + ordinal - threshold - 1;
}

function applyActionFatigue(
  state: BattleState,
  resolvedInBatch: number,
  batchNumber: number,
): void {
  const firstOrdinal = state.actionCount - resolvedInBatch + 1;
  let damage = 0;
  for (let ordinal = firstOrdinal; ordinal <= state.actionCount; ordinal += 1) {
    damage += fatigueForOrdinal(ordinal, state.fatigueActionThreshold, state.fatigueDamageStart);
  }
  if (damage === 0) return;

  const survivors = allUnits(state).filter((unit) => unit.currentHealth > 0);
  for (const unit of survivors) {
    unit.currentHealth = Math.max(0, unit.currentHealth - damage);
  }
  for (const unit of survivors) {
    logFatigue(state, batchNumber, unit, damage);
    if (unit.currentHealth === 0) {
      pushLog(state, {
        batchNumber,
        type: "death",
        unit: unit.name,
        unitId: unit.instanceId,
        origin: { kind: "fatigue" },
        message: `${unit.name} dies`,
      });
    }
  }
}

const DEFAULT_INPUT: BattleInput = {
  scenarios: [
    {
      id: "A",
      rows: {
        tank: [
          {
            name: "Default A",
            stats: {
              health: 100,
              mana: 100,
              meleeDmg: 10,
              rangedDmg: 0,
              manaRegen: 0,
              spellDmg: 0,
              speed: 10,
              dodge: 0,
              criticalChance: 0,
            },
          },
        ],
      },
    },
    {
      id: "B",
      rows: {
        tank: [
          {
            name: "Default B",
            stats: {
              health: 100,
              mana: 100,
              meleeDmg: 10,
              rangedDmg: 0,
              manaRegen: 0,
              spellDmg: 0,
              speed: 10,
              dodge: 0,
              criticalChance: 0,
            },
          },
        ],
      },
    },
  ],
  seed: 0,
};

export class BattleEngine {
  private readonly state: BattleState;

  public constructor(input: BattleInput = DEFAULT_INPUT, options: BattleOptions = {}) {
    this.state = initializeBattleState(input, options);
    maybeFinishBattle(this.state);
  }

  getState(): BattleState {
    return cloneState(this.state);
  }

  resolveNextBatch(): BattleState {
    if (this.state.status === "finished") return this.getState();

    const ready = advanceToNextReadyBatch(this.state);
    this.state.batchCount += 1;
    const batchNumber = this.state.batchCount;
    const survivors = processPreActionEffects(
      this.state,
      ready.map((unit) => unit.instanceId),
      batchNumber,
    );
    regenerateReadyMana(this.state, survivors);

    const eligibleModifierIds = new Set(
      allUnits(this.state)
        .flatMap((unit) => unit.activeEffects)
        .filter((effect) => effect.actionsRemaining !== undefined)
        .map((effect) => effect.id),
    );
    const snapshot = cloneState(this.state);
    const sharedRandom = () => nextRandom(this.state);
    const sharedEffectId = () => nextEffectId(this.state);
    const plans = ready
      .filter((unit) => survivors.has(unit.instanceId))
      .map((unit) =>
        planUnitAction(snapshot, unit.instanceId, batchNumber, sharedRandom, sharedEffectId),
      );
    const actedIds = commitPlannedActions(this.state, plans, batchNumber);

    for (const actorId of actedIds) {
      const actor = findUnitById(this.state, actorId);
      if (!actor) throw new Error(`Resolved action actor ${actorId} was not found.`);
      actor.actedCount += 1;
    }
    this.state.actionCount += actedIds.length;
    completeResolvedActionEffects(this.state, actedIds, eligibleModifierIds, batchNumber);
    for (const unit of ready) unit.actionBar = 0;
    const winnerBeforeFatigue = determineWinner(this.state);
    applyActionFatigue(this.state, actedIds.length, batchNumber);
    const winnerAfterFatigue = determineWinner(this.state);
    const endedByActionLimit =
      winnerBeforeFatigue === undefined || winnerBeforeFatigue !== winnerAfterFatigue;
    maybeFinishBattle(this.state, endedByActionLimit);

    return this.getState();
  }

  resolve(): BattleResult {
    while (this.state.status !== "finished") {
      this.resolveNextBatch();
    }

    return {
      winnerId: this.state.winnerId,
      actionsResolved: this.state.actionCount,
      finalState: this.getState(),
      log: structuredClone(this.state.log),
    };
  }
}

export type { BattleResult } from "./types";
