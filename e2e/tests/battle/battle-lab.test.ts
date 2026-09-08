import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "../db-reset.fixture";
import { parseApiResponse } from "../helpers/rest-api";
import {
  AMBUSH_AT_DAWN_ID,
  AMBUSH_AT_DAWN_NAME,
  API_BASE,
  ARCANE_DAMAGE_ID,
  BARBARIAN_ID,
  BATTLE_LAB_SEED,
  CASTLE_SIEGE_ID,
  CASTLE_SIEGE_NAME,
  IRON_SWORD_ID,
  LEATHER_SHIELD_ID,
  MAGE_ID,
  RANGER_ID,
  SAMURAI_ID,
  TEMPLAR_ID,
} from "../helpers/seed-constants";
import { runWorkerSql } from "../helpers/worker-db";
import { BattleLabPage } from "../pages/battle-lab.page";

type ScenarioRowType = "ranged" | "support" | "melee" | "tank";

interface BattleStats {
  health: number;
  mana: number;
  meleeDmg: number;
  rangedDmg: number;
  manaRegen: number;
  spellDmg: number;
  speed: number;
  dodge: number;
  criticalChance: number;
}

interface BattleReplayResponse {
  scenarios: { id: string; name: string }[];
  result: {
    winnerId: string | null;
    actionsResolved: number;
    finalState: {
      scenarios: {
        id: string;
        rows: Record<
          ScenarioRowType,
          {
            name: string;
            rowType: ScenarioRowType;
            slot: number;
            currentHealth: number;
            baseStats: BattleStats;
            itemBonusStats: BattleStats;
            mana: number;
            actedCount: number;
            shieldLayers: { remaining: number }[];
            activeEffects: {
              name: string;
              remainingTriggers?: number;
              actionsRemaining?: number;
              statKey?: keyof BattleStats;
              value: number;
            }[];
          }[]
        >;
      }[];
    };
    log: {
      batchNumber: number;
      type: string;
      message: string;
      actionId?: string;
      caster?: string;
      casterId?: string;
      item?: string;
      targets?: string[];
      targetIds?: string[];
      effects?: string[];
      source?: string;
      sourceId?: string;
      target?: string;
      targetId?: string;
      origin?: {
        item?: { name: string };
        effect?: { name: string };
      };
    }[];
  };
}

interface ScenarioRecord {
  id: string;
  name: string;
  rows: {
    rowType: ScenarioRowType;
    assignments: { unitId: string }[];
  }[];
}

test.beforeEach(async ({ resetDb }) => {
  await resetDb();
});

test.afterEach(async ({ resetDb }) => {
  await resetDb();
});

async function getScenario(request: APIRequestContext, id: string): Promise<ScenarioRecord> {
  const response = await request.get(`${API_BASE}/scenarios/${id}`);
  await expect(response).toBeOK();
  return parseApiResponse(response);
}

async function getBattleReplay(
  request: APIRequestContext,
  id: string,
): Promise<BattleReplayResponse> {
  const response = await request.get(`${API_BASE}/replays/${id}`);
  await expect(response).toBeOK();
  return parseApiResponse(response);
}

async function updateScenario(
  request: APIRequestContext,
  scenario: ScenarioRecord,
  name: string,
  rows = scenario.rows.map((row) => ({
    rowType: row.rowType,
    unitIds: row.assignments.map((assignment) => assignment.unitId),
  })),
): Promise<ScenarioRecord> {
  const response = await request.put(`${API_BASE}/scenarios/${scenario.id}`, {
    data: {
      name,
      rows,
    },
    headers: { "Content-Type": "application/json" },
  });
  await expect(response).toBeOK();
  return parseApiResponse(response);
}

async function ensureSelectedScenariosHaveLivingUnits(page: Page) {
  const ambush = await getScenario(page.request, AMBUSH_AT_DAWN_ID);
  expect(ambush.rows.some((row) => row.assignments.length > 0)).toBe(true);

  const castle = await getScenario(page.request, CASTLE_SIEGE_ID);
  const castleRows = castle.rows.map((row) => ({
    rowType: row.rowType,
    unitIds:
      row.rowType === "tank"
        ? [...new Set([...row.assignments.map((assignment) => assignment.unitId), TEMPLAR_ID])]
        : row.assignments.map((assignment) => assignment.unitId),
  }));
  const updatedCastle = await updateScenario(page.request, castle, castle.name, castleRows);

  expect(
    updatedCastle.rows.some(
      (row) =>
        row.rowType === "tank" &&
        row.assignments.some((assignment) => assignment.unitId === TEMPLAR_ID),
    ),
  ).toBe(true);
}

async function runSavedBattle(page: Page) {
  await ensureSelectedScenariosHaveLivingUnits(page);
  const battleLab = new BattleLabPage(page);

  await battleLab.goto();
  await battleLab.selectScenario("A", AMBUSH_AT_DAWN_ID, AMBUSH_AT_DAWN_NAME);
  await battleLab.selectScenario("B", CASTLE_SIEGE_ID, CASTLE_SIEGE_NAME);
  await battleLab.setSeed(BATTLE_LAB_SEED);
  await battleLab.run();
  const replay = await getBattleReplay(page.request, battleLab.replayId);
  await battleLab.expectResult(replay);

  return battleLab;
}

async function configureUnitTargeting(
  parallelIndex: number,
  unitId: string,
  scope: "allies" | "enemies",
  priority: "highest_health" | "lowest_health",
) {
  await runWorkerSql(
    parallelIndex,
    `UPDATE units SET target_scope = '${scope}', target_priority = '${priority}' WHERE id = '${unitId}'`,
  );
}

async function configureShieldLedgerFixture(parallelIndex: number, request: APIRequestContext) {
  const ambush = await getScenario(request, AMBUSH_AT_DAWN_ID);
  await updateScenario(
    request,
    ambush,
    ambush.name,
    ambush.rows.map((row) => ({
      rowType: row.rowType,
      unitIds: row.rowType === "support" ? [RANGER_ID] : [],
    })),
  );

  const castle = await getScenario(request, CASTLE_SIEGE_ID);
  await updateScenario(
    request,
    castle,
    castle.name,
    castle.rows.map((row) => ({
      rowType: row.rowType,
      unitIds: row.rowType === "tank" ? [TEMPLAR_ID] : [],
    })),
  );

  await runWorkerSql(parallelIndex, "DELETE FROM units_items");
  await runWorkerSql(parallelIndex, "DELETE FROM items_effects");
  await runWorkerSql(
    parallelIndex,
    `UPDATE effects
     SET shield = 15, direct_spell_dmg = NULL, bypasses_shield = false, lasts_for_actions = 4
     WHERE id = 'a0000000-0000-0000-0000-000000000009'`,
  );
  await runWorkerSql(
    parallelIndex,
    `UPDATE effects
     SET direct_spell_dmg = 10, shield = NULL, bypasses_shield = false
     WHERE id = '${ARCANE_DAMAGE_ID}'`,
  );
  await runWorkerSql(
    parallelIndex,
    `INSERT INTO items_effects (id, item_id, effect_template_id, sequence_order)
     VALUES
       ('c1000000-0000-0000-0000-000000000091', '${LEATHER_SHIELD_ID}', 'a0000000-0000-0000-0000-000000000009', 1),
       ('c1000000-0000-0000-0000-000000000092', '${IRON_SWORD_ID}', '${ARCANE_DAMAGE_ID}', 1)`,
  );
  await runWorkerSql(
    parallelIndex,
    `UPDATE units
     SET name = 'Shielded Unit', health = 100, mana = 5, melee_dmg = 0, ranged_dmg = 0,
         mana_regen = 0, spell_dmg = 0, speed = 10, dodge = 0, critical_chance = 0,
         target_scope = 'self', target_priority = 'highest_health', target_count = 1,
         selection_shape = 'individual'
     WHERE id = '${RANGER_ID}'`,
  );
  await runWorkerSql(
    parallelIndex,
    `UPDATE units
     SET name = 'Shield Breaker', health = 10, mana = 0, melee_dmg = 0, ranged_dmg = 0,
         mana_regen = 0, spell_dmg = 0, speed = 10, dodge = 0, critical_chance = 0,
         target_scope = 'self', target_priority = 'highest_health', target_count = 1,
         selection_shape = 'individual'
     WHERE id = '${TEMPLAR_ID}'`,
  );
  await runWorkerSql(
    parallelIndex,
    `INSERT INTO units_items (id, unit_id, item_id, priority)
     VALUES
       ('a1000000-0000-0000-0000-000000000091', '${RANGER_ID}', '${LEATHER_SHIELD_ID}', 1),
       ('a1000000-0000-0000-0000-000000000092', '${TEMPLAR_ID}', '${IRON_SWORD_ID}', 1)`,
  );
}

test.describe("Battle Lab", () => {
  test("shows remaining Shield in the final state ledger", async ({ gmPage }, testInfo) => {
    await configureShieldLedgerFixture(testInfo.parallelIndex, gmPage.request);
    const battleLab = new BattleLabPage(gmPage);

    await battleLab.goto();
    await battleLab.selectScenario("A", AMBUSH_AT_DAWN_ID, AMBUSH_AT_DAWN_NAME);
    await battleLab.selectScenario("B", CASTLE_SIEGE_ID, CASTLE_SIEGE_NAME);
    await battleLab.setSeed(BATTLE_LAB_SEED);
    await battleLab.run();

    await expect(battleLab.finalStateCell("Shielded Unit", "Shield")).toHaveText("15");
  });

  test("a zero-damage battle ends with action-limit language", async ({ gmPage }, testInfo) => {
    await runWorkerSql(testInfo.parallelIndex, "DELETE FROM units_items");
    await runWorkerSql(
      testInfo.parallelIndex,
      "UPDATE units SET health = 100, mana = 0, melee_dmg = 0, ranged_dmg = 0, mana_regen = 0, spell_dmg = 0, speed = 10, dodge = 0, critical_chance = 0",
    );
    await ensureSelectedScenariosHaveLivingUnits(gmPage);
    const battleLab = new BattleLabPage(gmPage);

    await battleLab.goto();
    await battleLab.selectScenario("A", AMBUSH_AT_DAWN_ID, AMBUSH_AT_DAWN_NAME);
    await battleLab.selectScenario("B", CASTLE_SIEGE_ID, CASTLE_SIEGE_NAME);
    await battleLab.setSeed(BATTLE_LAB_SEED);
    await battleLab.run();

    const replay = await getBattleReplay(gmPage.request, battleLab.replayId);
    expect(replay.result.winnerId).toBeNull();
    await expect(
      gmPage.getByText(`${replay.result.actionsResolved} actions resolved`, { exact: true }),
    ).toBeVisible();

    const eventLedger = gmPage.getByRole("list", { name: "Battle events" });
    await expect(eventLedger.getByText("Battle ended at the action limit: draw.")).toBeVisible();
    await expect(eventLedger.getByText(new RegExp(["ti", "ck"].join(""), "i"))).toHaveCount(0);
  });

  test("a multi-effect item charges exactly one nonzero cost per activation", async ({
    gmPage,
  }, testInfo) => {
    const activationManaCost = 40;
    await runWorkerSql(
      testInfo.parallelIndex,
      `UPDATE items SET activation_mana_cost = ${activationManaCost} WHERE id = '${LEATHER_SHIELD_ID}'`,
    );
    await runWorkerSql(
      testInfo.parallelIndex,
      `UPDATE units SET mana = 50, mana_regen = 0 WHERE id = '${RANGER_ID}'`,
    );

    const battleLab = await runSavedBattle(gmPage);

    expect(battleLab.replayId).toMatch(/^[0-9a-f-]{36}$/);
    const replay = await getBattleReplay(gmPage.request, battleLab.replayId);
    const shieldActivations = replay.result.log.filter(
      (entry) =>
        entry.type === "item-activation" &&
        entry.origin?.item?.name === "Leather Shield" &&
        entry.effects?.length === 2,
    );
    expect(shieldActivations).toHaveLength(1);
    expect(shieldActivations[0]?.effects).toEqual(["Mend", "Bandage"]);

    const ranger = replay.result.finalState.scenarios
      .flatMap((scenario) => Object.values(scenario.rows).flat())
      .find((unit) => unit.name === "Ranger");
    expect(ranger).toBeDefined();
    expect(ranger?.mana).toBe(
      (ranger?.baseStats.mana ?? 0) + (ranger?.itemBonusStats.mana ?? 0) - activationManaCost,
    );

    for (const unit of replay.result.finalState.scenarios.flatMap((scenario) =>
      Object.values(scenario.rows).flat(),
    )) {
      const activeMana = unit.activeEffects
        .filter((effect) => effect.statKey === "mana")
        .reduce((total, effect) => total + effect.value, 0);
      const effectiveMaximum = Math.max(
        0,
        unit.baseStats.mana + unit.itemBonusStats.mana + activeMana,
      );
      expect(unit.mana).toBeGreaterThanOrEqual(0);
      expect(unit.mana).toBeLessThanOrEqual(effectiveMaximum);
    }
  });

  test("a damage effect can target an ally", async ({ gmPage }, testInfo) => {
    await configureUnitTargeting(testInfo.parallelIndex, BARBARIAN_ID, "allies", "highest_health");
    await runWorkerSql(
      testInfo.parallelIndex,
      `UPDATE units SET health = 121 WHERE id = '${MAGE_ID}'`,
    );
    await runWorkerSql(
      testInfo.parallelIndex,
      `UPDATE units SET speed = 10 WHERE id = '${BARBARIAN_ID}'`,
    );

    const battleLab = await runSavedBattle(gmPage);
    const replay = await getBattleReplay(gmPage.request, battleLab.replayId);
    const alliedDamage = replay.result.log.find(
      (entry) =>
        entry.type === "damage" &&
        entry.origin?.item?.name === "Iron Sword" &&
        entry.origin.effect?.name === "Arcane Damage",
    );

    expect(alliedDamage).toBeDefined();
    expect(alliedDamage?.sourceId?.startsWith(`${AMBUSH_AT_DAWN_ID}:`)).toBe(true);
    expect(alliedDamage?.targetId?.startsWith(`${AMBUSH_AT_DAWN_ID}:`)).toBe(true);
    expect(alliedDamage?.target).toBe("Mage");
    expect(alliedDamage?.targetId).not.toBe(alliedDamage?.sourceId);
  });

  test("a healing effect can target an enemy", async ({ gmPage }, testInfo) => {
    await configureUnitTargeting(testInfo.parallelIndex, RANGER_ID, "enemies", "lowest_health");

    const battleLab = await runSavedBattle(gmPage);
    const replay = await getBattleReplay(gmPage.request, battleLab.replayId);
    const enemyHealing = replay.result.log.find(
      (entry) =>
        entry.type === "heal" &&
        entry.source === "Ranger" &&
        entry.origin?.item?.name === "Leather Shield" &&
        entry.origin.effect?.name === "Mend",
    );

    expect(enemyHealing).toBeDefined();
    expect(enemyHealing?.sourceId?.startsWith(`${AMBUSH_AT_DAWN_ID}:`)).toBe(true);
    expect(enemyHealing?.targetId?.startsWith(`${CASTLE_SIEGE_ID}:`)).toBe(true);
  });

  test("an adjacent multi-target activation uses its unit targeting definition", async ({
    gmPage,
  }, testInfo) => {
    const ambush = await getScenario(gmPage.request, AMBUSH_AT_DAWN_ID);
    await updateScenario(
      gmPage.request,
      ambush,
      ambush.name,
      ambush.rows.map((row) => ({
        rowType: row.rowType,
        unitIds: row.rowType === "ranged" ? [BARBARIAN_ID, MAGE_ID, SAMURAI_ID, RANGER_ID] : [],
      })),
    );

    const castle = await getScenario(gmPage.request, CASTLE_SIEGE_ID);
    await updateScenario(
      gmPage.request,
      castle,
      castle.name,
      castle.rows.map((row) => ({
        rowType: row.rowType,
        unitIds: row.rowType === "tank" ? [TEMPLAR_ID] : [],
      })),
    );

    await runWorkerSql(
      testInfo.parallelIndex,
      `UPDATE units SET target_scope = 'enemies', target_priority = 'highest_damage', target_count = 3, selection_shape = 'adjacent', speed = 10, health = 1000 WHERE id = '${TEMPLAR_ID}'`,
    );
    await runWorkerSql(
      testInfo.parallelIndex,
      `UPDATE units SET speed = 0, health = 1000, melee_dmg = 0, ranged_dmg = 0, spell_dmg = 0 WHERE id IN ('${BARBARIAN_ID}', '${MAGE_ID}', '${RANGER_ID}')`,
    );
    await runWorkerSql(
      testInfo.parallelIndex,
      `UPDATE units SET speed = 1, health = 1000, melee_dmg = 1000, ranged_dmg = 1000, spell_dmg = 1000 WHERE id = '${SAMURAI_ID}'`,
    );
    await runWorkerSql(
      testInfo.parallelIndex,
      `INSERT INTO units_items (id, unit_id, item_id, priority) VALUES ('a1000000-0000-0000-0000-000000000098', '${TEMPLAR_ID}', '${IRON_SWORD_ID}', 1)`,
    );

    const battleLab = await runSavedBattle(gmPage);
    const replay = await getBattleReplay(gmPage.request, battleLab.replayId);
    const activation = replay.result.log.find(
      (entry) =>
        entry.type === "item-activation" &&
        entry.caster === "Templar" &&
        entry.item === "Iron Sword",
    );

    expect(activation).toBeDefined();
    expect(activation?.targets).toEqual(["Mage", "Samurai", "Ranger"]);
    expect(activation?.targetIds).toEqual([
      `${AMBUSH_AT_DAWN_ID}:ranged:2`,
      `${AMBUSH_AT_DAWN_ID}:ranged:3`,
      `${AMBUSH_AT_DAWN_ID}:ranged:4`,
    ]);
  });

  test("saved replay keeps its setup and result after refresh", async ({ gmPage }) => {
    const battleLab = await runSavedBattle(gmPage);
    const replayUrl = gmPage.url();
    const replayId = battleLab.replayId;

    await gmPage.reload();

    await expect(gmPage).toHaveURL(replayUrl);
    expect(battleLab.replayId).toBe(replayId);
    await battleLab.expectSetup(
      { id: AMBUSH_AT_DAWN_ID, name: AMBUSH_AT_DAWN_NAME },
      { id: CASTLE_SIEGE_ID, name: CASTLE_SIEGE_NAME },
      BATTLE_LAB_SEED,
    );
    const refreshedReplay = await getBattleReplay(gmPage.request, replayId);
    await battleLab.expectResult(refreshedReplay);
  });

  test("same replay regenerates current scenario data after an edit", async ({ gmPage }) => {
    const battleLab = await runSavedBattle(gmPage);
    const replayUrl = gmPage.url();
    const ambush = await getScenario(gmPage.request, AMBUSH_AT_DAWN_ID);
    const renamedAmbush = "Ambush at Dusk";

    await updateScenario(gmPage.request, ambush, renamedAmbush);
    await gmPage.goto(replayUrl);

    await expect(gmPage).toHaveURL(replayUrl);
    await battleLab.expectSetup(
      { id: AMBUSH_AT_DAWN_ID, name: renamedAmbush },
      { id: CASTLE_SIEGE_ID, name: CASTLE_SIEGE_NAME },
      BATTLE_LAB_SEED,
    );
    const regeneratedReplay = await getBattleReplay(gmPage.request, battleLab.replayId);
    await battleLab.expectResult(regeneratedReplay);
  });
});
