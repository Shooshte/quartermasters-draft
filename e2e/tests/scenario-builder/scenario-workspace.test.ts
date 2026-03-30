import type { Page } from "@playwright/test";
import { expect, test } from "../db-reset.fixture";

test.describe.configure({ mode: "serial" });

const AMBUSH_AT_DAWN_ID = "a2000000-0000-0000-0000-000000000001";
const CASTLE_SIEGE_ID = "a2000000-0000-0000-0000-000000000002";
const UNIT_IDS: Record<string, string> = {
  Barbarian: "f0000000-0000-0000-0000-000000000001",
  Mage: "f0000000-0000-0000-0000-000000000002",
  Ranger: "f0000000-0000-0000-0000-000000000003",
  Samurai: "f0000000-0000-0000-0000-000000000004",
  Templar: "f0000000-0000-0000-0000-000000000005",
  "Undead Knight": "f0000000-0000-0000-0000-000000000006",
};

async function openNewScenario(gmPage: Page) {
  await gmPage.goto("/create");
  await gmPage.getByRole("tab", { name: "Scenarios" }).click();
  await gmPage.getByRole("button", { name: "New Scenario" }).click();
}

async function loadScenarioFromLibrary(gmPage: Page, scenarioName: string) {
  await gmPage.goto("/create");
  await gmPage.getByRole("tab", { name: "Scenarios" }).click();
  const row = gmPage.getByRole("row", { name: scenarioName });
  await row.getByRole("button", { name: new RegExp(`Edit ${scenarioName}`) }).click();
}

async function assignUnit(
  gmPage: Page,
  rowType: "tank" | "melee" | "ranged" | "support",
  unitName: string,
  search = unitName,
) {
  const unitId = UNIT_IDS[unitName];
  await gmPage.getByTestId(`scenario-row-${rowType}-picker`).click();
  await gmPage.getByTestId(`scenario-row-${rowType}-picker-search`).fill(search);
  await expect(gmPage.getByTestId(`scenario-row-${rowType}-picker-option-${unitId}`)).toBeVisible();
  await gmPage.getByTestId(`scenario-row-${rowType}-picker-option-${unitId}`).click();
  await gmPage.getByTestId(`scenario-row-${rowType}-picker-add`).click();
}

async function saveScenarioAndWait(
  gmPage: Page,
  mutation: "create" | "update",
  options?: { waitForCreatedUrl?: boolean },
) {
  await Promise.all([
    gmPage.waitForResponse((response) =>
      response.url().includes(`/api/trpc/scenarioBuilder.scenarios.${mutation}`) &&
      response.request().method() === "POST",
    ),
    gmPage.getByTestId("scenario-save-button").click(),
  ]);

  if (mutation === "create" && options?.waitForCreatedUrl) {
    await expect(gmPage).toHaveURL(/scenario_id=/);
  }
}

async function expectRowEmpty(
  gmPage: Page,
  rowType: "tank" | "melee" | "ranged" | "support",
) {
  await expect(gmPage.locator(`[data-testid^="scenario-row-${rowType}-slot-"]`)).toHaveCount(0);
  await expect(gmPage.getByTestId(`scenario-row-${rowType}`)).toContainText("No units assigned");
}

async function expectRowUnits(
  gmPage: Page,
  rowType: "tank" | "melee" | "ranged" | "support",
  unitNames: string[],
) {
  for (const [index, unitName] of unitNames.entries()) {
    await expect(gmPage.getByTestId(`scenario-row-${rowType}-slot-${index + 1}`)).toContainText(unitName);
  }
}

test.describe("Scenario Workspace", () => {
  test("create a new empty scenario", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewScenario(gmPage);

    await gmPage.getByTestId("scenario-name-input").fill("Frontier Watch");
    await saveScenarioAndWait(gmPage, "create", { waitForCreatedUrl: true });

    await expect(gmPage).toHaveURL(/scenario_id=/);
    await expect(gmPage.getByTestId("scenario-workspace-header")).toContainText("Scenario: Frontier Watch");
  });

  test("name is required", async ({ gmPage }) => {
    await openNewScenario(gmPage);
    await expect(gmPage.getByTestId("scenario-save-button")).toBeDisabled();
    await expect(gmPage.getByText("Name is required to save")).toBeVisible();
  });

  test("duplicate name shows a save error", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewScenario(gmPage);

    await gmPage.getByTestId("scenario-name-input").fill("Ambush at Dawn");
    await saveScenarioAndWait(gmPage, "create");

    await expect(gmPage.getByTestId("scenario-save-error")).toHaveText(
      "A scenario with this name already exists",
    );
  });

  test("a new scenario starts with four fixed empty rows", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewScenario(gmPage);

    await gmPage.getByTestId("scenario-name-input").fill("Silent Outpost");
    await saveScenarioAndWait(gmPage, "create", { waitForCreatedUrl: true });
    await expect(gmPage).toHaveURL(/scenario_id=/);

    await gmPage.reload();

    await expectRowEmpty(gmPage, "tank");
    await expectRowEmpty(gmPage, "melee");
    await expectRowEmpty(gmPage, "ranged");
    await expectRowEmpty(gmPage, "support");
  });

  test("create a scenario with units assigned across rows", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewScenario(gmPage);

    await gmPage.getByTestId("scenario-name-input").fill("Siege Breakers");
    await assignUnit(gmPage, "melee", "Barbarian");
    await assignUnit(gmPage, "ranged", "Mage");
    await assignUnit(gmPage, "support", "Ranger");
    await saveScenarioAndWait(gmPage, "create", { waitForCreatedUrl: true });

    await gmPage.reload();

    await expectRowUnits(gmPage, "melee", ["Barbarian"]);
    await expectRowUnits(gmPage, "ranged", ["Mage"]);
    await expectRowUnits(gmPage, "support", ["Ranger"]);
    await expectRowEmpty(gmPage, "tank");
  });

  test("edit an existing scenario name", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

    await gmPage.getByTestId("scenario-name-input").fill("Ambush at Dusk");
    await saveScenarioAndWait(gmPage, "update");

    await gmPage.reload();
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dusk");
  });

  test("edit row assignments on an existing scenario", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);

    await assignUnit(gmPage, "tank", "Templar");
    await saveScenarioAndWait(gmPage, "update");

    await gmPage.reload();
    await expectRowUnits(gmPage, "tank", ["Templar"]);
    await expectRowUnits(gmPage, "melee", ["Barbarian"]);
    await expectRowUnits(gmPage, "ranged", ["Mage"]);
    await expectRowUnits(gmPage, "support", ["Ranger"]);
  });

  test("add multiple units to the same row in slot order", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?scenario_id=${CASTLE_SIEGE_ID}`);

    await assignUnit(gmPage, "melee", "Barbarian");
    await assignUnit(gmPage, "melee", "Samurai");
    await assignUnit(gmPage, "melee", "Undead Knight");
    await saveScenarioAndWait(gmPage, "update");

    await gmPage.reload();
    await expectRowUnits(gmPage, "melee", ["Barbarian", "Samurai", "Undead Knight"]);
  });

  test("reorder units within a row", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?scenario_id=${CASTLE_SIEGE_ID}`);

    await assignUnit(gmPage, "melee", "Barbarian");
    await assignUnit(gmPage, "melee", "Samurai");
    await saveScenarioAndWait(gmPage, "update");

    await gmPage.getByTestId("scenario-row-melee-move-up-2").click();
    await saveScenarioAndWait(gmPage, "update");

    await gmPage.reload();
    await expectRowUnits(gmPage, "melee", ["Samurai", "Barbarian"]);
  });

  test("remove a unit while other assignments remain", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);

    await assignUnit(gmPage, "melee", "Samurai");
    await saveScenarioAndWait(gmPage, "update");

    await gmPage.getByTestId("scenario-row-melee-remove-2").click();
    await saveScenarioAndWait(gmPage, "update");

    await gmPage.reload();
    await expectRowUnits(gmPage, "melee", ["Barbarian"]);
    await expect(gmPage.locator('[data-testid^="scenario-row-melee-slot-"]')).toHaveCount(1);
  });

  test("removing the final unit from a row is allowed", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);

    await gmPage.getByTestId("scenario-row-support-remove-1").click();
    await saveScenarioAndWait(gmPage, "update");

    await gmPage.reload();
    await expectRowEmpty(gmPage, "support");
    await expectRowEmpty(gmPage, "tank");
    await expectRowUnits(gmPage, "melee", ["Barbarian"]);
    await expectRowUnits(gmPage, "ranged", ["Mage"]);
  });

  test("duplicate units in the same row are allowed", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewScenario(gmPage);

    await gmPage.getByTestId("scenario-name-input").fill("Mirror Line");
    await assignUnit(gmPage, "melee", "Barbarian");
    await assignUnit(gmPage, "melee", "Barbarian");
    await saveScenarioAndWait(gmPage, "create", { waitForCreatedUrl: true });

    await gmPage.reload();
    await expectRowUnits(gmPage, "melee", ["Barbarian", "Barbarian"]);
  });

  test("the same unit can appear in multiple rows", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewScenario(gmPage);

    await gmPage.getByTestId("scenario-name-input").fill("Flexible Vanguard");
    await assignUnit(gmPage, "tank", "Templar");
    await assignUnit(gmPage, "support", "Templar");
    await saveScenarioAndWait(gmPage, "create", { waitForCreatedUrl: true });

    await gmPage.reload();
    await expectRowUnits(gmPage, "tank", ["Templar"]);
    await expectRowUnits(gmPage, "support", ["Templar"]);
  });

  test("the row-unit picker supports search, shows at most five options, and uses the placeholder only", async ({
    gmPage,
  }) => {
    await openNewScenario(gmPage);

    await gmPage.getByTestId("scenario-row-melee-picker").click();
    await expect(gmPage.getByTestId("scenario-row-melee-picker-search")).toHaveAttribute(
      "placeholder",
      "Search units...",
    );
    await expect(gmPage.locator('[role="listbox"] [role="option"]')).toHaveCount(5);
    await expect(gmPage.locator('[role="listbox"] [role="option"]', { hasText: "Search units..." })).toHaveCount(0);

    await gmPage.getByTestId("scenario-row-melee-picker-search").fill("sam");
    await expect(gmPage.getByRole("option", { name: "Samurai" })).toBeVisible();
  });

  test("loading an existing scenario from the library preserves the create workspace flow", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    await loadScenarioFromLibrary(gmPage, "Ambush at Dawn");

    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");
    await expectRowUnits(gmPage, "melee", ["Barbarian"]);
    await expectRowUnits(gmPage, "ranged", ["Mage"]);
    await expectRowUnits(gmPage, "support", ["Ranger"]);
  });
});
