import { STAT_KEYS, type BattleItemState, type BattleUnitState, type RowType, type StatKey, type UnitStats } from "./types";
import { ROW_DEPTH } from "./rows";

type ModifierLike = { statKey: StatKey; value: number };

function clampAtZero(value: number): number {
  return value < 0 ? 0 : value;
}

export function getEffectiveStats(
  baseStats: UnitStats,
  items: Pick<BattleItemState, "meleeDmg" | "rangedDmg" | "manaRegen" | "spellDmg" | "dodge" | "criticalChance">[],
  activeModifiers: ModifierLike[],
): UnitStats {
  const totals = { ...baseStats };

  for (const item of items) {
    totals.meleeDmg += item.meleeDmg;
    totals.rangedDmg += item.rangedDmg;
    totals.manaRegen += item.manaRegen;
    totals.spellDmg += item.spellDmg;
    totals.dodge += item.dodge;
    totals.criticalChance += item.criticalChance;
  }

  for (const modifier of activeModifiers) {
    totals[modifier.statKey] += modifier.value;
  }

  for (const key of STAT_KEYS) {
    totals[key] = clampAtZero(totals[key]);
  }

  return totals;
}

export function getUnitEffectiveStats(unit: BattleUnitState): UnitStats {
  const modifiers = unit.activeEffects
    .filter((effect) => typeof effect.statKey === "string")
    .map((effect) => ({
      statKey: effect.statKey!,
      value: effect.value,
    }));

  return getEffectiveStats(unit.baseStats, unit.items, modifiers);
}

export function computeRowDistanceMultiplier(attackerRow: RowType, targetRow: RowType): number {
  return Math.max(0, 1 - 0.25 * (ROW_DEPTH[attackerRow] + ROW_DEPTH[targetRow]));
}

export function computeBasicAttackDamage(baseDamage: number, attackerRow: RowType, targetRow: RowType): number {
  return Math.round(baseDamage * computeRowDistanceMultiplier(attackerRow, targetRow));
}

export function computeBasicDamageWithModifiers(
  baseDamage: number,
  attacker: Pick<UnitStats, "criticalChance">,
  defender: Pick<UnitStats, "dodge">,
): number {
  return Math.round(baseDamage * (1 + attacker.criticalChance / 100) * (1 - defender.dodge / 100));
}

export function computeSpellDamageWithModifiers(
  baseDamage: number,
  attacker: Pick<UnitStats, "criticalChance">,
  defender: Pick<UnitStats, "dodge">,
): number {
  return Math.round(baseDamage * (1 + attacker.criticalChance / 100) * (1 - defender.dodge / 100));
}
