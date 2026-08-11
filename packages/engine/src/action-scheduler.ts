import { getUnitEffectiveStats } from "./math";
import { compareRowOrder } from "./rows";
import { allUnits } from "./state";
import type { BattleState, BattleUnitState } from "./types";

export const READY_EPSILON = 1e-9;

export function getSchedulingSpeed(unit: BattleUnitState): number {
  return Math.max(1, getUnitEffectiveStats(unit).speed);
}

export function compareReadyUnitOrder(
  state: BattleState,
  left: BattleUnitState,
  right: BattleUnitState,
): number {
  const speedDifference = getSchedulingSpeed(right) - getSchedulingSpeed(left);
  if (speedDifference !== 0) return speedDifference;

  const scenarioDifference =
    state.scenarios.findIndex((scenario) => scenario.id === left.scenarioId) -
    state.scenarios.findIndex((scenario) => scenario.id === right.scenarioId);
  if (scenarioDifference !== 0) return scenarioDifference;

  const rowDifference = compareRowOrder(left.rowType, right.rowType);
  if (rowDifference !== 0) return rowDifference;

  const slotDifference = left.slot - right.slot;
  if (slotDifference !== 0) return slotDifference;

  return left.instanceId < right.instanceId ? -1 : left.instanceId > right.instanceId ? 1 : 0;
}

export function advanceToNextReadyBatch(state: BattleState): BattleUnitState[] {
  const living = allUnits(state).filter((unit) => unit.currentHealth > 0);
  const progress = Math.min(
    ...living.map((unit) => Math.max(0, 100 - unit.actionBar) / getSchedulingSpeed(unit)),
  );

  for (const unit of living) {
    unit.actionBar = Math.min(100, unit.actionBar + getSchedulingSpeed(unit) * progress);
  }

  return living
    .filter((unit) => unit.actionBar >= 100 - READY_EPSILON)
    .sort((left, right) => compareReadyUnitOrder(state, left, right));
}
