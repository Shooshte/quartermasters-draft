import type { BattleUnitState, RowType } from "./types";

export const ROW_ORDER: RowType[] = ["tank", "melee", "ranged", "support"];

export const ROW_DEPTH: Record<RowType, number> = {
  tank: 0,
  melee: 1,
  ranged: 2,
  support: 3,
};

export function compareRowOrder(a: RowType, b: RowType): number {
  return ROW_ORDER.indexOf(a) - ROW_ORDER.indexOf(b);
}

export function compareUnitOrder(a: BattleUnitState, b: BattleUnitState): number {
  return compareRowOrder(a.rowType, b.rowType) || a.slot - b.slot || a.name.localeCompare(b.name);
}
