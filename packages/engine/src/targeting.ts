import { getUnitEffectiveStats } from "./math";
import { compareRowOrder, ROW_ORDER } from "./rows";
import { findScenario, getScenarioOrderIndex, nextRandom } from "./state";
import type {
  BattleScenarioState,
  BattleState,
  BattleUnitState,
  TargetPriority,
  TargetScope,
} from "./types";
import { InvalidBattleStateError } from "./validation";

export type UnitTargetingInput = Pick<
  BattleUnitState,
  "targetScope" | "targetPriority" | "targetCount" | "selectionShape"
>;

function opposingScenario(state: BattleState, caster: BattleUnitState): BattleScenarioState {
  const scenario = state.scenarios.find((candidate) => candidate.id !== caster.scenarioId);
  if (!scenario) {
    throw new InvalidBattleStateError(
      "OPPOSING_SCENARIO_NOT_FOUND",
      `No opposing scenario was found for caster scenario ${caster.scenarioId}.`,
    );
  }
  return scenario;
}

function candidateScenarios(
  state: BattleState,
  caster: BattleUnitState,
  scope: TargetScope,
): BattleScenarioState[] {
  const casterScenario = findScenario(state, caster.scenarioId);
  if (!casterScenario) {
    throw new InvalidBattleStateError(
      "CASTER_SCENARIO_NOT_FOUND",
      `Caster scenario ${caster.scenarioId} was not found in battle state.`,
    );
  }

  switch (scope) {
    case "self":
    case "self_allies":
    case "allies":
      return [casterScenario];
    case "self_enemies":
    case "both":
      return [casterScenario, opposingScenario(state, caster)];
    case "enemies":
      return [opposingScenario(state, caster)];
  }
}

function candidateUnits(state: BattleState, caster: BattleUnitState): BattleUnitState[] {
  const candidates = candidateScenarios(state, caster, caster.targetScope)
    .flatMap((scenario) => ROW_ORDER.flatMap((rowType) => scenario.rows[rowType]))
    .filter((unit) => unit.currentHealth > 0);
  const isCaster = (unit: BattleUnitState) => unit.instanceId === caster.instanceId;

  switch (caster.targetScope) {
    case "self":
      return candidates.filter(isCaster);
    case "self_allies":
      return candidates;
    case "self_enemies":
      return candidates.filter((unit) => isCaster(unit) || unit.scenarioId !== caster.scenarioId);
    case "allies":
    case "both":
      return candidates.filter((unit) => !isCaster(unit));
    case "enemies":
      return candidates;
  }
}

function selectNearestRow(state: BattleState, candidates: BattleUnitState[]): BattleUnitState[] {
  const groups = new Map<
    string,
    { rowType: BattleUnitState["rowType"]; units: BattleUnitState[] }
  >();
  for (const candidate of candidates) {
    const key = `${candidate.scenarioId}:${candidate.rowType}`;
    const group = groups.get(key);
    if (group) {
      group.units.push(candidate);
    } else {
      groups.set(key, { rowType: candidate.rowType, units: [candidate] });
    }
  }

  const occupiedGroups = [...groups.values()];
  let nearestRow = occupiedGroups[0]?.rowType;
  if (!nearestRow) return [];
  for (const group of occupiedGroups.slice(1)) {
    if (compareRowOrder(group.rowType, nearestRow) < 0) {
      nearestRow = group.rowType;
    }
  }

  const nearestGroups = occupiedGroups.filter((group) => group.rowType === nearestRow);
  if (nearestGroups.length === 1) return nearestGroups[0]?.units ?? [];

  const selectedIndex = Math.floor(nextRandom(state) * nearestGroups.length);
  return nearestGroups[Math.min(selectedIndex, nearestGroups.length - 1)]?.units ?? [];
}

function reachableCandidates(state: BattleState, caster: BattleUnitState): BattleUnitState[] {
  const candidates = candidateUnits(state, caster);
  if (caster.rowType === "ranged" || caster.rowType === "support") {
    return candidates;
  }
  return selectNearestRow(state, candidates);
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

function priorityValue(unit: BattleUnitState, priority: TargetPriority): number {
  const stats = getUnitEffectiveStats(unit);
  switch (priority) {
    case "highest_health":
    case "lowest_health":
      return unit.currentHealth;
    case "highest_damage":
      return stats.meleeDmg + stats.rangedDmg + stats.spellDmg;
    case "support":
      return Number(unit.rowType !== "support");
    case "random":
      return 0;
  }
}

function rankCandidates(
  state: BattleState,
  units: BattleUnitState[],
  priority: TargetPriority,
): BattleUnitState[] {
  if (priority === "random") {
    return units
      .map((unit) => ({ unit, score: nextRandom(state) }))
      .sort(
        (left, right) =>
          left.score - right.score || compareTargetFallback(state, left.unit, right.unit),
      )
      .map((entry) => entry.unit);
  }

  return [...units].sort((left, right) => {
    const leftValue = priorityValue(left, priority);
    const rightValue = priorityValue(right, priority);
    const primary =
      priority === "highest_health" || priority === "highest_damage"
        ? rightValue - leftValue
        : leftValue - rightValue;
    return primary || compareTargetFallback(state, left, right);
  });
}

function selectAdjacent(
  rowUnits: BattleUnitState[],
  primary: BattleUnitState,
  count: number,
): BattleUnitState[] {
  const sorted = [...rowUnits].sort((left, right) => left.slot - right.slot);
  const primaryIndex = sorted.findIndex((unit) => unit.instanceId === primary.instanceId);
  if (primaryIndex === -1 || count <= 0) return [];
  if (count >= sorted.length) return sorted;

  let start = Math.max(0, primaryIndex - Math.floor((count - 1) / 2));
  if (start + count > sorted.length) {
    start = sorted.length - count;
  }
  return sorted.slice(start, start + count);
}

export function selectTargets(
  state: BattleState,
  caster: BattleUnitState,
  targeting: UnitTargetingInput,
): BattleUnitState[] {
  const targetingCaster = { ...caster, ...targeting };
  const ranked = rankCandidates(
    state,
    reachableCandidates(state, targetingCaster),
    targeting.targetPriority,
  );
  if (ranked.length === 0 || targeting.selectionShape === "individual") {
    return ranked.slice(0, targeting.targetCount);
  }

  const primary = ranked[0];
  if (!primary) return [];
  const rowUnits = ranked.filter(
    (unit) => unit.scenarioId === primary.scenarioId && unit.rowType === primary.rowType,
  );
  return selectAdjacent(rowUnits, primary, targeting.targetCount);
}
