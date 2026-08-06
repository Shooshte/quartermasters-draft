import { describe, expect, it } from "vitest";
import {
  buildSeedData,
  effectSeedData,
  itemSeedData,
  itemsEffectsSeedData,
  scenarioSeedData,
  scenariosRowsSeedData,
  scenariosRowsUnitsSeedData,
  unitSeedData,
  unitsItemsSeedData,
} from "./seed-data";

const FAKE_HASH = "$argon2id$v=19$m=65536,t=3,p=4$fakesalt$fakehash";

describe("seed data", () => {
  it("creates GM user with correct email and role", () => {
    const { users } = buildSeedData(FAKE_HASH);
    const gm = users.find((u) => u.email === "gm@example.com");
    expect(gm).toBeDefined();
    expect(gm?.role).toBe("gm");
    expect(gm?.name).toBe("Test GM");
    expect(gm?.id).toBe("seed-gm-001");
  });

  it("creates Player user with correct email and role", () => {
    const { users } = buildSeedData(FAKE_HASH);
    const player = users.find((u) => u.email === "player@example.com");
    expect(player).toBeDefined();
    expect(player?.role).toBe("player");
    expect(player?.name).toBe("Test Player");
    expect(player?.id).toBe("seed-player-001");
  });

  it("creates account records for each user", () => {
    const { accounts } = buildSeedData(FAKE_HASH);
    expect(accounts).toHaveLength(2);
  });

  it("creates account with providerId 'credential' and accountId matching userId", () => {
    const { accounts } = buildSeedData(FAKE_HASH);
    for (const account of accounts) {
      expect(account.providerId).toBe("credential");
      expect(account.accountId).toBe(account.userId);
    }
  });

  it("sets the hashed password on each account", () => {
    const { accounts } = buildSeedData(FAKE_HASH);
    for (const account of accounts) {
      expect(account.password).toBe(FAKE_HASH);
    }
  });

  it("maps account userId to matching user id", () => {
    const { users, accounts } = buildSeedData(FAKE_HASH);
    const userIds = users.map((u) => u.id);
    for (const account of accounts) {
      expect(userIds).toContain(account.userId);
    }
  });
});

describe("effectSeedData", () => {
  it("has 21 effect records", () => {
    expect(effectSeedData).toHaveLength(21);
  });

  it("each record has required fields: name, timingType, effectType", () => {
    for (const template of effectSeedData) {
      expect(template.name).toBeDefined();
      expect(template.timingType).toBeDefined();
      expect(template.effectType).toBeDefined();
    }
  });

  it("covers all four effectType values", () => {
    const effectTypes = effectSeedData.map((t) => t.effectType);
    expect(effectTypes).toContain("buff");
    expect(effectTypes).toContain("debuff");
    expect(effectTypes).toContain("healing");
    expect(effectTypes).toContain("damage");
  });

  it("covers both timingType values", () => {
    const timingTypes = effectSeedData.map((t) => t.timingType);
    expect(timingTypes).toContain("instant");
    expect(timingTypes).toContain("interval");
  });

  it("interval records have intervalTicks and triggerCount set", () => {
    const intervalRecords = effectSeedData.filter((t) => t.timingType === "interval");
    expect(intervalRecords.length).toBeGreaterThan(0);
    for (const template of intervalRecords) {
      expect(template.intervalTicks).toBeDefined();
      expect(template.triggerCount).toBeDefined();
    }
  });

  it("instant records do not have intervalTicks or triggerCount set", () => {
    const instantRecords = effectSeedData.filter((t) => t.timingType === "instant");
    expect(instantRecords.length).toBeGreaterThan(0);
    for (const template of instantRecords) {
      expect(template.intervalTicks).toBeUndefined();
      expect(template.triggerCount).toBeUndefined();
    }
  });

  it("healing records have directHealing or health set", () => {
    const healingRecords = effectSeedData.filter((t) => t.effectType === "healing");
    for (const template of healingRecords) {
      expect(template.directHealing !== undefined || template.health !== undefined).toBe(true);
    }
  });

  it("damage records have a direct damage field set", () => {
    const damageRecords = effectSeedData.filter((t) => t.effectType === "damage");
    for (const template of damageRecords) {
      expect(
        template.directSpellDmg !== undefined ||
          template.directMeleeDmg !== undefined ||
          template.directRangedDmg !== undefined,
      ).toBe(true);
    }
  });

  it("each record has a deterministic id", () => {
    for (const effect of effectSeedData) {
      expect(effect.id).toBeDefined();
      expect(typeof effect.id).toBe("string");
    }
  });
});

describe("itemSeedData", () => {
  it("has 21 item records", () => {
    expect(itemSeedData).toHaveLength(21);
  });

  it("each record has required fields: name and all stat fields defined", () => {
    for (const item of itemSeedData) {
      expect(item.name).toBeDefined();
      expect(item.meleeDmg).toBeDefined();
      expect(item.rangedDmg).toBeDefined();
      expect(item.mana).toBe(0);
      expect(item.manaRegen).toBeDefined();
      expect(item.spellDmg).toBeDefined();
      expect(item.dodge).toBeDefined();
      expect(item.criticalChance).toBeDefined();
      expect(item.activationManaCost).toBeDefined();
      expect(item.activationHealthCost).toBeDefined();
    }
  });

  it("all names are unique", () => {
    const names = itemSeedData.map((i) => i.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("each record has a deterministic id", () => {
    for (const item of itemSeedData) {
      expect(item.id).toBeDefined();
      expect(typeof item.id).toBe("string");
    }
  });

  it("all stat fields are numbers", () => {
    for (const item of itemSeedData) {
      expect(typeof item.meleeDmg).toBe("number");
      expect(typeof item.rangedDmg).toBe("number");
      expect(typeof item.mana).toBe("number");
      expect(typeof item.manaRegen).toBe("number");
      expect(typeof item.spellDmg).toBe("number");
      expect(typeof item.dodge).toBe("number");
      expect(typeof item.criticalChance).toBe("number");
      expect(typeof item.activationManaCost).toBe("number");
      expect(typeof item.activationHealthCost).toBe("number");
    }
  });

  it("activation costs are nonnegative", () => {
    for (const item of itemSeedData) {
      expect(item.activationManaCost).toBeGreaterThanOrEqual(0);
      expect(item.activationHealthCost).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("itemsEffectsSeedData", () => {
  it("uses positive, unique sequence orders per item", () => {
    expect(itemsEffectsSeedData.every((link) => link.sequenceOrder > 0)).toBe(true);
    expect(
      new Set(itemsEffectsSeedData.map((link) => `${link.itemId}:${link.sequenceOrder}`)).size,
    ).toBe(itemsEffectsSeedData.length);
  });

  it("references seeded items and effects", () => {
    const itemIds = new Set(itemSeedData.map((item) => item.id));
    const effectIds = new Set(effectSeedData.map((effect) => effect.id));

    for (const link of itemsEffectsSeedData) {
      expect(itemIds.has(link.itemId)).toBe(true);
      expect(effectIds.has(link.effectTemplateId)).toBe(true);
    }
  });

  it("uses deterministic ids", () => {
    for (const link of itemsEffectsSeedData) {
      expect(typeof link.id).toBe("string");
    }
  });
});

describe("unitSeedData", () => {
  it("has 21 unit records", () => {
    expect(unitSeedData).toHaveLength(21);
  });

  it("each record has required fields: name and all stat fields", () => {
    for (const unit of unitSeedData) {
      expect(unit.name).toBeDefined();
      expect(unit.meleeDmg).toBeDefined();
      expect(unit.health).toBeDefined();
      expect(unit.mana).toBe(100);
      expect(unit.rangedDmg).toBeDefined();
      expect(unit.manaRegen).toBeDefined();
      expect(unit.spellDmg).toBeDefined();
      expect(unit.speed).toBeDefined();
      expect(unit.dodge).toBeDefined();
      expect(unit.criticalChance).toBeDefined();
    }
  });

  it("all names are unique", () => {
    const names = unitSeedData.map((u) => u.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("defaults every unit to target enemies", () => {
    expect(unitSeedData.every((unit) => unit.targetSide === "enemies")).toBe(true);
  });

  it("each record has a deterministic id", () => {
    for (const unit of unitSeedData) {
      expect(unit.id).toBeDefined();
      expect(typeof unit.id).toBe("string");
    }
  });

  it("all stat fields are numbers", () => {
    for (const unit of unitSeedData) {
      expect(typeof unit.meleeDmg).toBe("number");
      expect(typeof unit.health).toBe("number");
      expect(typeof unit.mana).toBe("number");
      expect(typeof unit.rangedDmg).toBe("number");
      expect(typeof unit.manaRegen).toBe("number");
      expect(typeof unit.spellDmg).toBe("number");
      expect(typeof unit.speed).toBe("number");
      expect(typeof unit.dodge).toBe("number");
      expect(typeof unit.criticalChance).toBe("number");
    }
  });
});

describe("unitsItemsSeedData", () => {
  it("has 3 records", () => {
    expect(unitsItemsSeedData.length).toEqual(3);
  });

  it("each record has required fields: unitId, itemId, priority", () => {
    for (const record of unitsItemsSeedData) {
      expect(record.unitId).toBeDefined();
      expect(record.itemId).toBeDefined();
      expect(record.priority).toBeDefined();
    }
  });

  it("all unitId values reference units in unitSeedData", () => {
    const unitIds = new Set(unitSeedData.map((u) => u.id));
    for (const record of unitsItemsSeedData) {
      expect(unitIds.has(record.unitId)).toBe(true);
    }
  });

  it("all itemId values reference items in itemSeedData", () => {
    const itemIds = new Set(itemSeedData.map((i) => i.id));
    for (const record of unitsItemsSeedData) {
      expect(itemIds.has(record.itemId)).toBe(true);
    }
  });

  it("each record has a deterministic id", () => {
    for (const record of unitsItemsSeedData) {
      expect(record.id).toBeDefined();
      expect(typeof record.id).toBe("string");
    }
  });

  it("priority is > 0 for all records", () => {
    for (const record of unitsItemsSeedData) {
      expect(record.priority).toBeGreaterThan(0);
    }
  });

  it("no duplicate (unitId, priority) combinations", () => {
    const seen = new Set<string>();
    for (const record of unitsItemsSeedData) {
      const key = `${record.unitId}:${record.priority}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});

describe("scenarioSeedData", () => {
  it("has 21 scenario records", () => {
    expect(scenarioSeedData).toHaveLength(21);
  });

  it("each record has required fields: name", () => {
    for (const record of scenarioSeedData) {
      expect(record.name).toBeDefined();
    }
  });

  it("all names are unique", () => {
    const names = scenarioSeedData.map((s) => s.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("each record has a deterministic id", () => {
    for (const record of scenarioSeedData) {
      expect(record.id).toBeDefined();
      expect(typeof record.id).toBe("string");
    }
  });
});

describe("scenariosRowsSeedData", () => {
  it("has 84 records", () => {
    expect(scenariosRowsSeedData).toHaveLength(84);
  });

  it("each record has required fields: scenarioId, rowType", () => {
    for (const record of scenariosRowsSeedData) {
      expect(record.scenarioId).toBeDefined();
      expect(record.rowType).toBeDefined();
    }
  });

  it("covers all four rowType values", () => {
    const rowTypes = scenariosRowsSeedData.map((r) => r.rowType);
    expect(rowTypes).toContain("support");
    expect(rowTypes).toContain("ranged");
    expect(rowTypes).toContain("melee");
    expect(rowTypes).toContain("tank");
  });

  it("all scenarioId values reference scenarios in scenarioSeedData", () => {
    const scenarioIds = new Set(scenarioSeedData.map((s) => s.id));
    for (const record of scenariosRowsSeedData) {
      expect(scenarioIds.has(record.scenarioId)).toBe(true);
    }
  });

  it("each record has a deterministic id", () => {
    for (const record of scenariosRowsSeedData) {
      expect(record.id).toBeDefined();
      expect(typeof record.id).toBe("string");
    }
  });

  it("every scenario has exactly 4 rows (ranged, support, melee, tank)", () => {
    const rowsByScenario = new Map<string, string[]>();
    for (const record of scenariosRowsSeedData) {
      const existing = rowsByScenario.get(record.scenarioId) ?? [];
      existing.push(record.rowType);
      rowsByScenario.set(record.scenarioId, existing);
    }

    const scenarioIds = scenarioSeedData.map((s) => s.id);
    for (const scenarioId of scenarioIds) {
      if (!scenarioId) {
        throw new Error("scenario seed record should have an id");
      }
      const rows = rowsByScenario.get(scenarioId);
      expect(rows, `scenario ${scenarioId} should have rows`).toBeDefined();
      if (!rows) {
        throw new Error(`scenario ${scenarioId} should have rows`);
      }
      expect(rows.sort()).toEqual(["melee", "ranged", "support", "tank"]);
    }
  });
});

describe("scenariosRowsUnitsSeedData", () => {
  it("has 3 records", () => {
    expect(scenariosRowsUnitsSeedData).toHaveLength(3);
  });

  it("each record has required fields: rowId, unitId, slot", () => {
    for (const record of scenariosRowsUnitsSeedData) {
      expect(record.rowId).toBeDefined();
      expect(record.unitId).toBeDefined();
      expect(record.slot).toBeDefined();
    }
  });

  it("slot >= 1 for all records", () => {
    for (const record of scenariosRowsUnitsSeedData) {
      expect(record.slot).toBeGreaterThanOrEqual(1);
    }
  });

  it("all rowId values reference rows in scenariosRowsSeedData", () => {
    const rowIds = new Set(scenariosRowsSeedData.map((r) => r.id));
    for (const record of scenariosRowsUnitsSeedData) {
      expect(rowIds.has(record.rowId)).toBe(true);
    }
  });

  it("all unitId values reference units in unitSeedData", () => {
    const unitIds = new Set(unitSeedData.map((u) => u.id));
    for (const record of scenariosRowsUnitsSeedData) {
      expect(unitIds.has(record.unitId)).toBe(true);
    }
  });

  it("each record has a deterministic id", () => {
    for (const record of scenariosRowsUnitsSeedData) {
      expect(record.id).toBeDefined();
      expect(typeof record.id).toBe("string");
    }
  });

  it("no duplicate (rowId, slot) combinations", () => {
    const seen = new Set<string>();
    for (const record of scenariosRowsUnitsSeedData) {
      const key = `${record.rowId}:${record.slot}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });
});
