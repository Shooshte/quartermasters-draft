import type { items, units } from "@qd/db";
import type {
  EffectTemplateInput,
  ItemInput,
  RowType,
  ScenarioInput,
} from "@qd/engine";

type ScenarioRecord = {
  id: string;
  name: string;
};

type Stats = Pick<
  typeof units.$inferSelect,
  | "health"
  | "mana"
  | "meleeDmg"
  | "rangedDmg"
  | "manaRegen"
  | "spellDmg"
  | "speed"
  | "dodge"
  | "criticalChance"
>;

type UnitRecord = Pick<
  typeof units.$inferSelect,
  "id" | "name" | "targetScope" | "targetPriority" | "targetCount" | "selectionShape"
> &
  Stats;

type ItemRecord = Pick<
  typeof items.$inferSelect,
  | "id"
  | "name"
  | "meleeDmg"
  | "rangedDmg"
  | "mana"
  | "manaRegen"
  | "spellDmg"
  | "dodge"
  | "criticalChance"
  | "activationManaCost"
  | "activationHealthCost"
>;

type EffectRecord = {
  id: string;
  name: string;
  timingType: EffectTemplateInput["timingType"];
  effectType: EffectTemplateInput["effectType"];
  intervalTicks: number | null;
  triggerCount: number | null;
  durationTicks: number | null;
  meleeDmg: number | null;
  health: number | null;
  mana: number | null;
  rangedDmg: number | null;
  manaRegen: number | null;
  spellDmg: number | null;
  speed: number | null;
  dodge: number | null;
  criticalChance: number | null;
  directHealing: number | null;
  directMeleeDmg: number | null;
  directRangedDmg: number | null;
  directSpellDmg: number | null;
};

export interface BattleScenarioRecords {
  scenario: ScenarioRecord;
  assignments: Array<{
    rowType: RowType;
    slot: number;
    unit: UnitRecord;
  }>;
  unitItems: Array<{
    unitId: string;
    priority: number;
    item: ItemRecord;
  }>;
  itemAllowedRows: Array<{
    itemId: string;
    rowType: RowType;
  }>;
  itemEffects: Array<{
    itemId: string;
    sequenceOrder: number;
    effect: EffectRecord;
  }>;
}

const ROW_ORDER: Record<RowType, number> = {
  tank: 0,
  melee: 1,
  ranged: 2,
  support: 3,
};

function byCombatRowOrder(left: RowType, right: RowType): number {
  return ROW_ORDER[left] - ROW_ORDER[right];
}

function appendToMap<Key, Value>(map: Map<Key, Value[]>, key: Key, value: Value): void {
  const values = map.get(key);
  if (values) {
    values.push(value);
  } else {
    map.set(key, [value]);
  }
}

export function toScenarioInput(records: BattleScenarioRecords): ScenarioInput {
  const unitItemsByUnitId = new Map<string, BattleScenarioRecords["unitItems"]>();
  for (const link of records.unitItems) {
    appendToMap(unitItemsByUnitId, link.unitId, link);
  }

  const allowedRowsByItemId = new Map<string, RowType[]>();
  for (const link of records.itemAllowedRows) {
    appendToMap(allowedRowsByItemId, link.itemId, link.rowType);
  }

  const effectsByItemId = new Map<string, BattleScenarioRecords["itemEffects"]>();
  for (const link of records.itemEffects) {
    appendToMap(effectsByItemId, link.itemId, link);
  }

  function buildEffectsForItem(itemId: string): NonNullable<ItemInput["effects"]> {
    return [...(effectsByItemId.get(itemId) ?? [])]
      .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
      .map(({ sequenceOrder, effect }) => ({
        sequenceOrder,
        effect: {
          id: effect.id,
          name: effect.name,
          timingType: effect.timingType,
          effectType: effect.effectType,
          intervalTicks: effect.intervalTicks,
          triggerCount: effect.triggerCount,
          durationTicks: effect.durationTicks,
          meleeDmg: effect.meleeDmg,
          health: effect.health,
          mana: effect.mana,
          rangedDmg: effect.rangedDmg,
          manaRegen: effect.manaRegen,
          spellDmg: effect.spellDmg,
          speed: effect.speed,
          dodge: effect.dodge,
          criticalChance: effect.criticalChance,
          directHealing: effect.directHealing,
          directMeleeDmg: effect.directMeleeDmg,
          directRangedDmg: effect.directRangedDmg,
          directSpellDmg: effect.directSpellDmg,
        },
      }));
  }

  function buildItemsForUnit(unitId: string): ItemInput[] {
    return [...(unitItemsByUnitId.get(unitId) ?? [])]
      .sort((left, right) => left.priority - right.priority)
      .map(({ item }) => ({
        id: item.id,
        name: item.name,
        meleeDmg: item.meleeDmg,
        rangedDmg: item.rangedDmg,
        mana: item.mana,
        manaRegen: item.manaRegen,
        spellDmg: item.spellDmg,
        dodge: item.dodge,
        criticalChance: item.criticalChance,
        activationManaCost: item.activationManaCost,
        activationHealthCost: item.activationHealthCost,
        allowedRowTypes: [...(allowedRowsByItemId.get(item.id) ?? [])].sort(byCombatRowOrder),
        effects: buildEffectsForItem(item.id),
      }));
  }

  const rows: NonNullable<ScenarioInput["rows"]> = {
    tank: [],
    melee: [],
    ranged: [],
    support: [],
  };

  for (const assignment of [...records.assignments].sort((left, right) => left.slot - right.slot)) {
    rows[assignment.rowType]?.push({
      id: assignment.unit.id,
      name: assignment.unit.name,
      stats: {
        health: assignment.unit.health,
        mana: assignment.unit.mana,
        meleeDmg: assignment.unit.meleeDmg,
        rangedDmg: assignment.unit.rangedDmg,
        manaRegen: assignment.unit.manaRegen,
        spellDmg: assignment.unit.spellDmg,
        speed: assignment.unit.speed,
        dodge: assignment.unit.dodge,
        criticalChance: assignment.unit.criticalChance,
      },
      targetScope: assignment.unit.targetScope,
      targetPriority: assignment.unit.targetPriority,
      targetCount: assignment.unit.targetCount,
      selectionShape: assignment.unit.selectionShape,
      items: buildItemsForUnit(assignment.unit.id),
    });
  }

  return {
    id: records.scenario.id,
    name: records.scenario.name,
    rows,
  };
}
