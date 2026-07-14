import type {
  EffectTemplateInput,
  ItemInput,
  RowType,
  ScenarioInput,
  SpellInput,
  TargetPolicy,
} from "@qd/engine";

type ScenarioRecord = {
  id: string;
  name: string;
};

type UnitRecord = {
  id: string;
  name: string;
  health: number;
  meleeDmg: number;
  rangedDmg: number;
  manaRegen: number;
  spellDmg: number;
  speed: number;
  dodge: number;
  criticalChance: number;
};

type ItemRecord = {
  id: string;
  name: string;
  meleeDmg: number;
  rangedDmg: number;
  manaRegen: number;
  spellDmg: number;
  dodge: number;
  criticalChance: number;
  activationManaCost: number;
  activationHealthCost: number;
};

type SpellRecord = {
  id: string;
  name: string;
  description: string | null;
  targetPolicy: TargetPolicy;
  targetRowCount: number;
  maxTargetsPerRow: number | null;
  targetOnlyAdjacent: boolean;
};

type EffectRecord = {
  id: string;
  name: string;
  timingType: EffectTemplateInput["timingType"];
  effectType: EffectTemplateInput["effectType"];
  intervalMs: number | null;
  triggerCount: number | null;
  durationMs: number | null;
  meleeDmg: number | null;
  health: number | null;
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
  itemSpells: Array<{
    itemId: string;
    spell: SpellRecord;
  }>;
  spellAllowedRows: Array<{
    spellId: string;
    rowType: RowType;
  }>;
  spellEffects: Array<{
    spellId: string;
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

  const itemSpellsByItemId = new Map<string, BattleScenarioRecords["itemSpells"]>();
  for (const link of records.itemSpells) {
    appendToMap(itemSpellsByItemId, link.itemId, link);
  }

  const allowedRowsBySpellId = new Map<string, RowType[]>();
  for (const link of records.spellAllowedRows) {
    appendToMap(allowedRowsBySpellId, link.spellId, link.rowType);
  }

  const effectsBySpellId = new Map<string, BattleScenarioRecords["spellEffects"]>();
  for (const link of records.spellEffects) {
    appendToMap(effectsBySpellId, link.spellId, link);
  }

  function buildEffectsForSpell(spellId: string): NonNullable<SpellInput["effects"]> {
    return [...(effectsBySpellId.get(spellId) ?? [])]
      .sort((left, right) => left.sequenceOrder - right.sequenceOrder)
      .map(({ sequenceOrder, effect }) => ({
        sequenceOrder,
        effect: {
          id: effect.id,
          name: effect.name,
          timingType: effect.timingType,
          effectType: effect.effectType,
          intervalMs: effect.intervalMs,
          triggerCount: effect.triggerCount,
          durationMs: effect.durationMs,
          meleeDmg: effect.meleeDmg,
          health: effect.health,
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

  function buildSpellsForItem(itemId: string): SpellInput[] {
    return (itemSpellsByItemId.get(itemId) ?? []).map(({ spell }) => ({
      id: spell.id,
      name: spell.name,
      description: spell.description,
      targetPolicy: spell.targetPolicy,
      targetRowCount: spell.targetRowCount,
      maxTargetsPerRow: spell.maxTargetsPerRow,
      targetOnlyAdjacent: spell.targetOnlyAdjacent,
      allowedRowTypes: [...(allowedRowsBySpellId.get(spell.id) ?? [])].sort(
        (left, right) => ROW_ORDER[left] - ROW_ORDER[right],
      ),
      effects: buildEffectsForSpell(spell.id),
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
        manaRegen: item.manaRegen,
        spellDmg: item.spellDmg,
        dodge: item.dodge,
        criticalChance: item.criticalChance,
        activationManaCost: item.activationManaCost,
        activationHealthCost: item.activationHealthCost,
        linkedSpells: buildSpellsForItem(item.id),
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
        meleeDmg: assignment.unit.meleeDmg,
        rangedDmg: assignment.unit.rangedDmg,
        manaRegen: assignment.unit.manaRegen,
        spellDmg: assignment.unit.spellDmg,
        speed: assignment.unit.speed,
        dodge: assignment.unit.dodge,
        criticalChance: assignment.unit.criticalChance,
      },
      items: buildItemsForUnit(assignment.unit.id),
    });
  }

  return {
    id: records.scenario.id,
    name: records.scenario.name,
    rows,
  };
}
