import { getUnitEffectiveStats } from "./math";
import { allUnits } from "./state";
import type { BattleState, BattleUnitState } from "./types";

export const READY_EPSILON = 1e-9;

export function getSchedulingSpeed(unit: BattleUnitState): number {
  return Math.max(1, getUnitEffectiveStats(unit).speed);
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
    .sort((left, right) =>
      left.instanceId < right.instanceId ? -1 : left.instanceId > right.instanceId ? 1 : 0,
    );
}
