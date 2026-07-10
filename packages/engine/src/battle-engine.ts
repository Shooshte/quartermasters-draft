import { processCurrentTickEffects } from "./effects";
import { logBattleEnd, logFatigue } from "./logging";
import { getUnitEffectiveStats } from "./math";
import { buildReadyQueue, resolveUnitAction } from "./resolution";
import {
  allUnits,
  cloneState,
  getResolveActionsOnTick,
  initializeBattleState,
  isUnitAlive,
  livingUnitsForScenario,
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

function maybeFinishBattle(state: BattleState): void {
  const winner = determineWinner(state);
  if (winner !== undefined) {
    state.winnerId = winner;
    state.status = "finished";
    if (state.log.at(-1)?.type !== "battle-end") {
      logBattleEnd(state, state.tick, winner);
    }
  }
}

function isBattleFinished(state: BattleState): boolean {
  return state.status === "finished";
}

function applyFatigue(state: BattleState): void {
  if (state.tick < state.fatigueTickThreshold) return;
  const damage = state.fatigueDamageStart + (state.tick - state.fatigueTickThreshold);
  for (const unit of allUnits(state).filter((candidate) => candidate.currentHealth > 0)) {
    unit.currentHealth = Math.max(0, unit.currentHealth - damage);
    logFatigue(state, state.tick, unit, damage);
    if (unit.currentHealth === 0) {
      state.log.push({
        tick: state.tick,
        type: "death",
        unit: unit.name,
        unitId: unit.instanceId,
        message: `Tick ${state.tick}: ${unit.name} dies`,
      });
    }
  }
}

function incrementManaAndBars(state: BattleState): void {
  for (const unit of allUnits(state)) {
    if (!isUnitAlive(unit)) continue;
    const stats = getUnitEffectiveStats(unit);
    unit.mana += stats.manaRegen;
    unit.actionBar += stats.speed;
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

  tick(count = 1): BattleState {
    for (let iteration = 0; iteration < count; iteration += 1) {
      if (this.state.status === "finished") break;

      this.state.tick += 1;
      processCurrentTickEffects(this.state);
      incrementManaAndBars(this.state);

      if (getResolveActionsOnTick(this.state)) {
        const queue = buildReadyQueue(this.state);
        for (const unit of queue) {
          const liveUnit = allUnits(this.state).find(
            (candidate) => candidate.instanceId === unit.instanceId,
          );
          if (!liveUnit || !isUnitAlive(liveUnit) || liveUnit.actionBar < 100) continue;
          resolveUnitAction(this.state, liveUnit, this.state.tick);
          liveUnit.actedCount += 1;
          liveUnit.actionBar = 0;
          maybeFinishBattle(this.state);
          if (isBattleFinished(this.state)) break;
        }
      }

      applyFatigue(this.state);
      maybeFinishBattle(this.state);
    }

    return this.getState();
  }

  resolve(): BattleResult {
    while (this.state.status !== "finished") {
      this.tick(1);
    }

    return {
      winnerId: this.state.winnerId,
      ticksElapsed: this.state.tick,
      finalState: this.getState(),
      log: structuredClone(this.state.log),
    };
  }
}

export type { BattleResult } from "./types";
