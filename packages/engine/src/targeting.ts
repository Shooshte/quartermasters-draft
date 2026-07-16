import { getUnitEffectiveStats } from "./math";
import { compareRowOrder, ROW_ORDER } from "./rows";
import { findScenario, getScenarioOrderIndex, nextRandom } from "./state";
import type { BattleState, BattleUnitState, RowType, SpellInput } from "./types";
import { InvalidBattleStateError } from "./validation";

function spellTargetsAllies(spell: SpellInput): boolean {
  const firstEffect = spell.effects
    ?.slice()
    .sort((left, right) => left.sequenceOrder - right.sequenceOrder)[0]?.effect;
  return firstEffect?.effectType === "healing" || firstEffect?.effectType === "buff";
}

function candidateUnits(
  state: BattleState,
  caster: BattleUnitState,
  spell: SpellInput,
): BattleUnitState[] {
  const casterScenario = findScenario(state, caster.scenarioId);
  if (!casterScenario) {
    throw new InvalidBattleStateError(
      "CASTER_SCENARIO_NOT_FOUND",
      `Caster scenario ${caster.scenarioId} was not found in battle state.`,
    );
  }

  const targetScope = spell.targetScope ?? "self_and_others";
  const allowedRows = spell.allowedRowTypes ?? [];
  const isEligible = (unit: BattleUnitState) => {
    if (unit.currentHealth <= 0) return false;
    if (allowedRows.length > 0 && !allowedRows.includes(unit.rowType)) return false;
    return true;
  };

  if (targetScope === "self") {
    return isEligible(caster) ? [caster] : [];
  }

  const scenario = spellTargetsAllies(spell)
    ? casterScenario
    : state.scenarios.find((candidate) => candidate.id !== caster.scenarioId);
  if (!scenario) {
    throw new InvalidBattleStateError(
      "OPPOSING_SCENARIO_NOT_FOUND",
      `No opposing scenario was found for caster scenario ${caster.scenarioId}.`,
    );
  }
  return ROW_ORDER.flatMap((rowType) => scenario.rows[rowType]).filter((unit) => {
    if (!isEligible(unit)) return false;
    return targetScope !== "others" || unit.instanceId !== caster.instanceId;
  });
}

function policyValue(unit: BattleUnitState, policy: SpellInput["targetPolicy"]) {
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
  policy: SpellInput["targetPolicy"],
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
  spell: SpellInput,
): BattleUnitState[] {
  const policy =
    caster.targetPolicyOverride ?? spell.targetPolicy ?? caster.targetPolicy ?? "highest_health";
  const candidates = candidateUnits(state, caster, spell);
  if (candidates.length === 0) {
    return [];
  }

  const maxTargetsPerRow = spell.maxTargetsPerRow ?? 1;
  const targetRowCount = spell.targetRowCount ?? 1;

  if (maxTargetsPerRow === 1) {
    const sorted = sortCandidates(state, candidates, policy, caster);
    const selected: BattleUnitState[] = [];
    const rowSet = new Set<RowType>();
    for (const unit of sorted) {
      if (rowSet.has(unit.rowType)) continue;
      rowSet.add(unit.rowType);
      selected.push(unit);
      if (selected.length === targetRowCount) break;
    }
    return selected;
  }

  const eligibleRows = frontmostOccupiedRows(candidates).slice(0, targetRowCount);
  const selected: BattleUnitState[] = [];

  for (const rowType of eligibleRows) {
    const rowCandidates = candidates.filter((unit) => unit.rowType === rowType);
    if (spell.maxTargetsPerRow == null) {
      selected.push(...rowCandidates.sort((left, right) => left.slot - right.slot));
      continue;
    }

    const ordered = sortCandidates(state, rowCandidates, policy, caster);
    if (spell.targetOnlyAdjacent) {
      const primary = ordered[0];
      if (!primary) continue;
      selected.push(...selectAdjacent(rowCandidates, primary, maxTargetsPerRow));
    } else {
      selected.push(...ordered.slice(0, maxTargetsPerRow));
    }
  }

  return selected;
}
