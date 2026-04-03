import type { Page } from "@playwright/test";
import { expect, test } from "../db-reset.fixture";
import { AMBUSH_AT_DAWN_ID, CASTLE_SIEGE_ID, UNIT_IDS } from "../helpers/seed-constants";
import { openNewEntity, saveEntityAndWait } from "../helpers/workspace-helpers";

test.beforeEach(async ({ resetDb }) => {
  await resetDb();
});

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
  test("create a new empty scenario", async ({ gmPage }) => {
    await openNewEntity(gmPage, "Scenarios", "New Scenario");

    await gmPage.getByTestId("scenario-name-input").fill("Frontier Watch");
    await saveEntityAndWait(gmPage, "scenarios", "create", { saveButtonTestId: "scenario-save-button" });
    await expect(gmPage).toHaveURL(/scenario_id=/);

    await expect(gmPage.getByTestId("scenario-workspace-header")).toContainText("Scenario: Frontier Watch");
  });

  test("name is required", async ({ gmPage }) => {
    await openNewEntity(gmPage, "Scenarios", "New Scenario");
    await expect(gmPage.getByTestId("scenario-save-button")).toBeDisabled();
    await expect(gmPage.getByText("Name is required to save")).toBeVisible();
  });

  test("duplicate name shows a save error", async ({ gmPage }) => {
    await openNewEntity(gmPage, "Scenarios", "New Scenario");

    await gmPage.getByTestId("scenario-name-input").fill("Ambush at Dawn");
    await saveEntityAndWait(gmPage, "scenarios", "create", { saveButtonTestId: "scenario-save-button" });

    await expect(gmPage.getByTestId("scenario-save-error")).toHaveText(
      "A scenario with this name already exists",
    );
  });

  test("a new scenario starts with four fixed empty rows", async ({ gmPage }) => {
    await openNewEntity(gmPage, "Scenarios", "New Scenario");

    await gmPage.getByTestId("scenario-name-input").fill("Silent Outpost");
    await saveEntityAndWait(gmPage, "scenarios", "create", { saveButtonTestId: "scenario-save-button" });
    await expect(gmPage).toHaveURL(/scenario_id=/);

    await gmPage.reload();

    await expectRowEmpty(gmPage, "tank");
    await expectRowEmpty(gmPage, "melee");
    await expectRowEmpty(gmPage, "ranged");
    await expectRowEmpty(gmPage, "support");
  });

  test("create a scenario with units assigned across rows", async ({ gmPage }) => {
    await openNewEntity(gmPage, "Scenarios", "New Scenario");

    await gmPage.getByTestId("scenario-name-input").fill("Siege Breakers");
    await assignUnit(gmPage, "melee", "Barbarian");
    await assignUnit(gmPage, "ranged", "Mage");
    await assignUnit(gmPage, "support", "Ranger");
    await saveEntityAndWait(gmPage, "scenarios", "create", { saveButtonTestId: "scenario-save-button" });
    await expect(gmPage).toHaveURL(/scenario_id=/);

    await gmPage.reload();

    await expectRowUnits(gmPage, "melee", ["Barbarian"]);
    await expectRowUnits(gmPage, "ranged", ["Mage"]);
    await expectRowUnits(gmPage, "support", ["Ranger"]);
    await expectRowEmpty(gmPage, "tank");
  });

  test("edit an existing scenario name", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

    await gmPage.getByTestId("scenario-name-input").fill("Ambush at Dusk");
    await saveEntityAndWait(gmPage, "scenarios", "update", { saveButtonTestId: "scenario-save-button" });

    await gmPage.reload();
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dusk");
  });

  test("edit row assignments on an existing scenario", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);

    await assignUnit(gmPage, "tank", "Templar");
    await saveEntityAndWait(gmPage, "scenarios", "update", { saveButtonTestId: "scenario-save-button" });

    await gmPage.reload();
    await expectRowUnits(gmPage, "tank", ["Templar"]);
    await expectRowUnits(gmPage, "melee", ["Barbarian"]);
    await expectRowUnits(gmPage, "ranged", ["Mage"]);
    await expectRowUnits(gmPage, "support", ["Ranger"]);
  });

  test("add multiple units to the same row in slot order", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${CASTLE_SIEGE_ID}`);

    await assignUnit(gmPage, "melee", "Barbarian");
    await assignUnit(gmPage, "melee", "Samurai");
    await assignUnit(gmPage, "melee", "Undead Knight");
    await saveEntityAndWait(gmPage, "scenarios", "update", { saveButtonTestId: "scenario-save-button" });

    await gmPage.reload();
    await expectRowUnits(gmPage, "melee", ["Barbarian", "Samurai", "Undead Knight"]);
  });

  test("reorder units within a row", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${CASTLE_SIEGE_ID}`);

    await assignUnit(gmPage, "melee", "Barbarian");
    await assignUnit(gmPage, "melee", "Samurai");
    await saveEntityAndWait(gmPage, "scenarios", "update", { saveButtonTestId: "scenario-save-button" });

    await gmPage.getByTestId("scenario-row-melee-move-up-2").click();
    await expectRowUnits(gmPage, "melee", ["Samurai", "Barbarian"]);
    await saveEntityAndWait(gmPage, "scenarios", "update", { saveButtonTestId: "scenario-save-button" });

    await gmPage.reload();
    await expectRowUnits(gmPage, "melee", ["Samurai", "Barbarian"]);
  });

  test("remove a unit while other assignments remain", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);

    await assignUnit(gmPage, "melee", "Samurai");
    await saveEntityAndWait(gmPage, "scenarios", "update", { saveButtonTestId: "scenario-save-button" });

    await gmPage.getByTestId("scenario-row-melee-remove-2").click();
    await expectRowUnits(gmPage, "melee", ["Barbarian"]);
    await expect(gmPage.locator('[data-testid^="scenario-row-melee-slot-"]')).toHaveCount(1);
    await saveEntityAndWait(gmPage, "scenarios", "update", { saveButtonTestId: "scenario-save-button" });

    await gmPage.reload();
    await expectRowUnits(gmPage, "melee", ["Barbarian"]);
    await expect(gmPage.locator('[data-testid^="scenario-row-melee-slot-"]')).toHaveCount(1);
  });

  test("removing the final unit from a row is allowed", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);

    await gmPage.getByTestId("scenario-row-support-remove-1").click();
    await saveEntityAndWait(gmPage, "scenarios", "update", { saveButtonTestId: "scenario-save-button" });

    await gmPage.reload();
    await expectRowEmpty(gmPage, "support");
    await expectRowEmpty(gmPage, "tank");
    await expectRowUnits(gmPage, "melee", ["Barbarian"]);
    await expectRowUnits(gmPage, "ranged", ["Mage"]);
  });

  test("duplicate units in the same row are allowed", async ({ gmPage }) => {
    await openNewEntity(gmPage, "Scenarios", "New Scenario");

    await gmPage.getByTestId("scenario-name-input").fill("Mirror Line");
    await assignUnit(gmPage, "melee", "Barbarian");
    await assignUnit(gmPage, "melee", "Barbarian");
    await saveEntityAndWait(gmPage, "scenarios", "create", { saveButtonTestId: "scenario-save-button" });
    await expect(gmPage).toHaveURL(/scenario_id=/);

    await gmPage.reload();
    await expectRowUnits(gmPage, "melee", ["Barbarian", "Barbarian"]);
  });

  test("the same unit can appear in multiple rows", async ({ gmPage }) => {
    await openNewEntity(gmPage, "Scenarios", "New Scenario");

    await gmPage.getByTestId("scenario-name-input").fill("Flexible Vanguard");
    await assignUnit(gmPage, "tank", "Templar");
    await assignUnit(gmPage, "support", "Templar");
    await saveEntityAndWait(gmPage, "scenarios", "create", { saveButtonTestId: "scenario-save-button" });
    await expect(gmPage).toHaveURL(/scenario_id=/);

    await gmPage.reload();
    await expectRowUnits(gmPage, "tank", ["Templar"]);
    await expectRowUnits(gmPage, "support", ["Templar"]);
  });

  test("the row-unit picker supports search, shows at most five options, and uses the placeholder only", async ({
    gmPage,
  }) => {
    await openNewEntity(gmPage, "Scenarios", "New Scenario");

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
  }) => {
    await loadScenarioFromLibrary(gmPage, "Ambush at Dawn");

    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");
    await expectRowUnits(gmPage, "melee", ["Barbarian"]);
    await expectRowUnits(gmPage, "ranged", ["Mage"]);
    await expectRowUnits(gmPage, "support", ["Ranger"]);
  });
});
