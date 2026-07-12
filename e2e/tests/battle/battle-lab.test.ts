import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "../db-reset.fixture";
import {
  AMBUSH_AT_DAWN_ID,
  AMBUSH_AT_DAWN_NAME,
  BATTLE_LAB_SEED,
  CASTLE_SIEGE_ID,
  CASTLE_SIEGE_NAME,
  TEMPLAR_ID,
  TRPC_BASE,
} from "../helpers/seed-constants";
import { parseTrpcResponse } from "../helpers/trpc-api";
import { BattleLabPage } from "../pages/battle-lab.page";

type ScenarioRowType = "ranged" | "support" | "melee" | "tank";

interface ScenarioRecord {
  id: string;
  name: string;
  rows: {
    rowType: ScenarioRowType;
    assignments: { unitId: string }[];
  }[];
}

const initialScenarios = [
  { name: AMBUSH_AT_DAWN_NAME, unitCount: 3 },
  { name: CASTLE_SIEGE_NAME, unitCount: 1 },
];

test.beforeEach(async ({ resetDb }) => {
  await resetDb();
});

test.afterEach(async ({ resetDb }) => {
  await resetDb();
});

async function getScenario(request: APIRequestContext, id: string): Promise<ScenarioRecord> {
  const input = encodeURIComponent(JSON.stringify({ json: { id } }));
  const response = await request.get(`${TRPC_BASE}/scenarioBuilder.scenarios.get?input=${input}`);
  await expect(response).toBeOK();
  return parseTrpcResponse(response);
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
  const response = await request.post(`${TRPC_BASE}/scenarioBuilder.scenarios.update`, {
    data: {
      json: {
        id: scenario.id,
        name,
        rows,
      },
    },
    headers: { "Content-Type": "application/json" },
  });
  await expect(response).toBeOK();
  return parseTrpcResponse(response);
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
  await battleLab.expectResult(initialScenarios);

  return battleLab;
}

test.describe("Battle Lab", () => {
  test("game master runs two living scenarios with a named seed", async ({ gmPage }) => {
    const battleLab = await runSavedBattle(gmPage);

    expect(battleLab.replayId).toMatch(/^[0-9a-f-]{36}$/);
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
    await battleLab.expectResult(initialScenarios);
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
    await battleLab.expectResult([
      { name: renamedAmbush, unitCount: 3 },
      { name: CASTLE_SIEGE_NAME, unitCount: 1 },
    ]);
  });
});
