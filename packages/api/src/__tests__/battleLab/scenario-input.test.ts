import { describe, expect, it } from "vitest";
import {
  type BattleScenarioRecords,
  toScenarioInput,
} from "../../routers/battleLab/scenario-input";

const mage = {
  id: "unit-1",
  name: "Mage",
  health: 60,
  mana: 200,
  meleeDmg: 3,
  rangedDmg: 0,
  manaRegen: 5,
  spellDmg: 30,
  speed: 1,
  dodge: 8,
  criticalChance: 6,
  targetScope: "self_allies" as const,
  targetPriority: "support" as const,
  targetCount: 3,
  selectionShape: "adjacent" as const,
};

const oakStaff = {
  id: "item-early",
  name: "Oak Staff",
  meleeDmg: 1,
  rangedDmg: 2,
  mana: 25,
  manaRegen: 3,
  spellDmg: 4,
  dodge: 5,
  criticalChance: 6,
  activationManaCost: 7,
  activationHealthCost: 8,
};

const crystal = {
  id: "item-late",
  name: "Crystal",
  meleeDmg: 0,
  rangedDmg: 0,
  mana: -10,
  manaRegen: 2,
  spellDmg: 10,
  dodge: 0,
  criticalChance: 1,
  activationManaCost: 0,
  activationHealthCost: 0,
};

const burn = {
  id: "effect-burn",
  name: "Burn",
  timingType: "interval" as const,
  effectType: "damage" as const,
  isTaunt: false,
  triggerEveryActions: 2,
  triggerCount: 3,
  lastsForActions: 3,
  meleeDmg: null,
  health: -2,
  mana: null,
  rangedDmg: null,
  manaRegen: null,
  spellDmg: null,
  speed: null,
  dodge: null,
  criticalChance: null,
  directHealing: null,
  directMeleeDmg: null,
  directRangedDmg: null,
  directSpellDmg: 5,
};

const scorch = {
  id: "effect-scorch",
  name: "Scorch",
  timingType: "instant" as const,
  effectType: "debuff" as const,
  isTaunt: false,
  triggerEveryActions: null,
  triggerCount: null,
  lastsForActions: 3,
  meleeDmg: -1,
  health: null,
  mana: -20,
  rangedDmg: -2,
  manaRegen: -3,
  spellDmg: -4,
  speed: -5,
  dodge: -6,
  criticalChance: -7,
  directHealing: 0,
  directMeleeDmg: 1,
  directRangedDmg: 2,
  directSpellDmg: 3,
};

function buildRecords(): BattleScenarioRecords {
  return {
    scenario: { id: "scenario-a", name: "Ambush at Dawn" },
    assignments: [{ rowType: "ranged", slot: 1, unit: mage }],
    unitItems: [
      { unitId: mage.id, priority: 20, item: crystal },
      { unitId: mage.id, priority: 10, item: oakStaff },
    ],
    itemAllowedRows: [
      { itemId: oakStaff.id, rowType: "support" },
      { itemId: oakStaff.id, rowType: "ranged" },
    ],
    itemEffects: [
      { itemId: oakStaff.id, sequenceOrder: 2, effect: burn },
      { itemId: oakStaff.id, sequenceOrder: 1, effect: scorch },
    ],
  };
}

describe("toScenarioInput", () => {
  it("maps the complete database graph into ordered engine input", () => {
    const result = toScenarioInput(buildRecords());

    expect(result).toEqual({
      id: "scenario-a",
      name: "Ambush at Dawn",
      rows: {
        tank: [],
        melee: [],
        ranged: [
          {
            id: "unit-1",
            name: "Mage",
            stats: {
              health: 60,
              mana: 200,
              meleeDmg: 3,
              rangedDmg: 0,
              manaRegen: 5,
              spellDmg: 30,
              speed: 1,
              dodge: 8,
              criticalChance: 6,
            },
            targetScope: "self_allies",
            targetPriority: "support",
            targetCount: 3,
            selectionShape: "adjacent",
            items: [
              {
                ...oakStaff,
                allowedRowTypes: ["ranged", "support"],
                effects: [
                  { sequenceOrder: 1, effect: scorch },
                  { sequenceOrder: 2, effect: burn },
                ],
              },
              { ...crystal, allowedRowTypes: [], effects: [] },
            ],
          },
        ],
        support: [],
      },
    });
  });

  it("preserves duplicate unit assignments and duplicate item priority links", () => {
    const records = buildRecords();
    records.assignments = [
      { rowType: "melee", slot: 2, unit: mage },
      { rowType: "melee", slot: 1, unit: mage },
    ];
    records.unitItems = [
      { unitId: mage.id, priority: 2, item: oakStaff },
      { unitId: mage.id, priority: 1, item: oakStaff },
    ];

    const result = toScenarioInput(records);

    expect(result.rows?.melee).toHaveLength(2);
    expect(result.rows?.melee?.map((unit) => unit.id)).toEqual([mage.id, mage.id]);
    expect(result.rows?.melee?.[0]?.items?.map((item) => item.id)).toEqual([
      oakStaff.id,
      oakStaff.id,
    ]);
  });

  it("retains all four empty row arrays for an empty scenario", () => {
    const records = buildRecords();
    records.assignments = [];
    records.unitItems = [];
    records.itemAllowedRows = [];
    records.itemEffects = [];

    expect(toScenarioInput(records)).toEqual({
      id: "scenario-a",
      name: "Ambush at Dawn",
      rows: { tank: [], melee: [], ranged: [], support: [] },
    });
  });
});
