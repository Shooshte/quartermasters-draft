import { getUnitEffectiveStats } from "./math";
import { compareRowOrder, ROW_ORDER } from "./rows";
import { findScenario, getScenarioOrderIndex, nextRandom } from "./state";
import type { BattleState, BattleUnitState, RowType, TargetPolicy, TargetSide } from "./types";
import { InvalidBattleStateError } from "./validation";

export interface UnitTargetingInput {
  targetSide: TargetSide;
  targetPolicy: TargetPolicy;
  targetRowCount: number;
  maxTargetsPerRow: number | null;
  targetOnlyAdjacent: boolean;
  allowedRowTypes: RowType[];
}

function candidateUnits(
  state: BattleState,
  caster: BattleUnitState,
  targeting: UnitTargetingInput,
): BattleUnitState[] {
  const casterScenario = findScenario(state, caster.scenarioId);
  if (!casterScenario) {
    throw new InvalidBattleStateError(
      "CASTER_SCENARIO_NOT_FOUND",
      `Caster scenario ${caster.scenarioId} was not found in battle state.`,
    );
  }

  const isEligible = (unit: BattleUnitState) =>
    unit.currentHealth > 0 &&
    (targeting.allowedRowTypes.length === 0 || targeting.allowedRowTypes.includes(unit.rowType));

  if (targeting.targetSide === "self") {
    return isEligible(caster) ? [caster] : [];
  }

  const scenario =
    targeting.targetSide === "allies"
      ? casterScenario
      : state.scenarios.find((candidate) => candidate.id !== caster.scenarioId);
  if (!scenario) {
    throw new InvalidBattleStateError(
      "OPPOSING_SCENARIO_NOT_FOUND",
      `No opposing scenario was found for caster scenario ${caster.scenarioId}.`,
    );
  }

  return ROW_ORDER.flatMap((rowType) => scenario.rows[rowType]).filter(isEligible);
}

function policyValue(unit: BattleUnitState, policy: TargetPolicy) {
  const stats = getUnitEffectiveStats(unit);
  switch (policy) {
    case "highest_health":
    case "lowest_health":
      return unit.currentHealth;
    case "highest_damage":
      return stats.meleeDmg + stats.rangedDmg + stats.spellDmg;
    case "random":
    case "self":
      return 0;
  }
}

function compareTargetFallback(
  state: BattleState,
  left: BattleUnitState,
  right: BattleUnitState,
): number {
  return (
    compareRowOrder(left.rowType, right.rowType) ||
    left.slot - right.slot ||
    getScenarioOrderIndex(state, left.scenarioId) -
      getScenarioOrderIndex(state, right.scenarioId) ||
    left.instanceId.localeCompare(right.instanceId)
  );
}

function sortCandidates(
  state: BattleState,
  units: BattleUnitState[],
  policy: TargetPolicy,
  caster: BattleUnitState,
): BattleUnitState[] {
  if (policy === "random") {
    return [...units]
      .map((unit) => ({ unit, score: nextRandom(state) }))
      .sort(
        (left, right) =>
          left.score - right.score || compareTargetFallback(state, left.unit, right.unit),
      )
      .map((entry) => entry.unit);
  }

  return [...units].sort((left, right) => {
    const leftValue = policyValue(left, policy);
    const rightValue = policyValue(right, policy);
    const primary =
      policy === "self"
        ? Number(right.instanceId === caster.instanceId) -
          Number(left.instanceId === caster.instanceId)
        : policy === "lowest_health"
          ? leftValue - rightValue
          : rightValue - leftValue;
    return primary || compareTargetFallback(state, left, right);
  });
}

function frontmostOccupiedRows(units: BattleUnitState[]): RowType[] {
  return ROW_ORDER.filter((rowType) => units.some((unit) => unit.rowType === rowType));
}

function selectAdjacent(
  rowUnits: BattleUnitState[],
  primary: BattleUnitState,
  maxTargets: number,
): BattleUnitState[] {
  const sorted = [...rowUnits].sort((left, right) => left.slot - right.slot);
  const primaryIndex = sorted.findIndex((unit) => unit.instanceId === primary.instanceId);
  if (primaryIndex === -1 || maxTargets >= sorted.length) {
    return sorted;
  }

  let start = Math.max(0, primaryIndex - Math.floor((maxTargets - 1) / 2));
  if (start + maxTargets > sorted.length) {
    start = sorted.length - maxTargets;
  }
  return sorted.slice(start, start + maxTargets);
}

export function selectTargets(
  state: BattleState,
  caster: BattleUnitState,
  targeting: UnitTargetingInput,
): BattleUnitState[] {
  const policy = caster.targetPolicyOverride ?? targeting.targetPolicy;
  const candidates = candidateUnits(state, caster, targeting);
  if (candidates.length === 0 || targeting.targetSide === "self") {
    return candidates;
  }

  if (targeting.maxTargetsPerRow === 1) {
    const sorted = sortCandidates(state, candidates, policy, caster);
    const selected: BattleUnitState[] = [];
    const rowSet = new Set<RowType>();
    for (const unit of sorted) {
      if (rowSet.has(unit.rowType)) continue;
      rowSet.add(unit.rowType);
      selected.push(unit);
      if (selected.length === targeting.targetRowCount) break;
    }
    return selected;
  }

  const eligibleRows = frontmostOccupiedRows(candidates).slice(0, targeting.targetRowCount);
  const selected: BattleUnitState[] = [];

  for (const rowType of eligibleRows) {
    const rowCandidates = candidates.filter((unit) => unit.rowType === rowType);
    if (targeting.maxTargetsPerRow == null) {
      selected.push(...rowCandidates.sort((left, right) => left.slot - right.slot));
      continue;
    }

    const ordered = sortCandidates(state, rowCandidates, policy, caster);
    if (targeting.targetOnlyAdjacent) {
      const primary = ordered[0];
      if (!primary) continue;
      selected.push(...selectAdjacent(rowCandidates, primary, targeting.maxTargetsPerRow));
    } else {
      selected.push(...ordered.slice(0, targeting.maxTargetsPerRow));
    }
  }

  return selected;
}
