import type { Page } from "@playwright/test";
import { expect, test } from "../db-reset.fixture";
import { AMBUSH_AT_DAWN_ID, BARBARIAN_ID, CASTLE_SIEGE_ID } from "../helpers/seed-constants";
import { saveEntityAndWait } from "../helpers/workspace-helpers";
import { ScenarioWorkspacePage } from "../pages/scenario-workspace.page";

test.beforeEach(async ({ resetDb }) => {
  await resetDb();
});

async function loadScenarioFromLibrary(gmPage: Page, scenarioName: string) {
  await gmPage.goto("/create");
  await gmPage.getByRole("tab", { name: "Scenarios" }).click();
  const row = gmPage.getByRole("row", { name: scenarioName });
  await row.getByRole("button", { name: new RegExp(`Edit ${scenarioName}`) }).click();
}

test.describe("Scenario Workspace", () => {
  test("create a new empty scenario @smoke", async ({ gmPage }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await scenario.openNew();

    await scenario.fillName("Frontier Watch");
    await scenario.saveCreate();

    await expect(scenario.workspaceHeader).toContainText("Scenario: Frontier Watch");
  });

  test("name is required", async ({ gmPage }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await scenario.openNew();
    await expect(scenario.saveButton).toBeDisabled();
    await expect(gmPage.getByText("Name is required to save")).toBeVisible();
  });

  test("duplicate name shows a save error", async ({ gmPage }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await scenario.openNew();

    await scenario.fillName("Ambush at Dawn");
    await saveEntityAndWait(gmPage, "scenarios", "create", {
      saveButtonTestId: "scenario-save-button",
    });

    await expect(scenario.saveError).toHaveText("A scenario with this name already exists");
  });

  test("a new scenario starts with four fixed empty rows", async ({ gmPage }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await scenario.openNew();

    await scenario.fillName("Silent Outpost");
    await scenario.saveCreate();

    await gmPage.reload();

    await scenario.expectRowEmpty("tank");
    await scenario.expectRowEmpty("melee");
    await scenario.expectRowEmpty("ranged");
    await scenario.expectRowEmpty("support");
  });

  test("create a scenario with units assigned across rows", async ({ gmPage }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await scenario.openNew();

    await scenario.fillName("Siege Breakers");
    await scenario.assignUnit("melee", "Barbarian");
    await scenario.assignUnit("ranged", "Mage");
    await scenario.assignUnit("support", "Ranger");
    await scenario.saveCreate();

    await gmPage.reload();

    await scenario.expectRowUnits("melee", ["Barbarian"]);
    await scenario.expectRowUnits("ranged", ["Mage"]);
    await scenario.expectRowUnits("support", ["Ranger"]);
    await scenario.expectRowEmpty("tank");
  });

  test("edit an existing scenario name", async ({ gmPage }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await scenario.openById(AMBUSH_AT_DAWN_ID);
    await expect(scenario.nameInput).toHaveValue("Ambush at Dawn");

    await scenario.fillName("Ambush at Dusk");
    await scenario.saveUpdate();

    await gmPage.reload();
    await expect(scenario.nameInput).toHaveValue("Ambush at Dusk");
  });

  test("edit row assignments on an existing scenario", async ({ gmPage }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await scenario.openById(AMBUSH_AT_DAWN_ID);

    await scenario.assignUnit("tank", "Templar");
    await scenario.saveUpdate();

    await gmPage.reload();
    await scenario.expectRowUnits("tank", ["Templar"]);
    await scenario.expectRowUnits("melee", ["Barbarian"]);
    await scenario.expectRowUnits("ranged", ["Mage"]);
    await scenario.expectRowUnits("support", ["Ranger"]);
  });

  test("edit a linked unit while preserving the scenario workspace and URL context", async ({
    gmPage,
  }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await scenario.openById(AMBUSH_AT_DAWN_ID);

    await scenario.editUnit("melee", 1);

    await expect(gmPage.getByRole("tab", { name: "Units" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Barbarian");
    await expect(scenario.nameInput).toHaveValue("Ambush at Dawn");
    await expect(gmPage).toHaveURL(new RegExp(`scenario_id=${AMBUSH_AT_DAWN_ID}`));
    await expect(gmPage).toHaveURL(new RegExp(`unit_id=${BARBARIAN_ID}`));
    await expect(gmPage).toHaveURL(/tab=Units/);
  });

  test("add multiple units to the same row in slot order", async ({ gmPage }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await scenario.openById(CASTLE_SIEGE_ID);

    await scenario.assignUnit("melee", "Barbarian");
    await scenario.assignUnit("melee", "Samurai");
    await scenario.assignUnit("melee", "Undead Knight");
    await scenario.saveUpdate();

    await gmPage.reload();
    await scenario.expectRowUnits("melee", ["Barbarian", "Samurai", "Undead Knight"]);
  });

  test("reorder units within a row", async ({ gmPage }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await scenario.openById(CASTLE_SIEGE_ID);

    await scenario.assignUnit("melee", "Barbarian");
    await scenario.assignUnit("melee", "Samurai");
    await scenario.saveUpdate();

    await scenario.moveUnitUp("melee", 2);
    await scenario.expectRowUnits("melee", ["Samurai", "Barbarian"]);
    await scenario.saveUpdate();

    await gmPage.reload();
    await scenario.expectRowUnits("melee", ["Samurai", "Barbarian"]);
  });

  test("remove a unit while other assignments remain", async ({ gmPage }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await scenario.openById(AMBUSH_AT_DAWN_ID);

    await scenario.assignUnit("melee", "Samurai");
    await scenario.saveUpdate();

    await scenario.removeUnit("melee", 2);
    await scenario.expectRowUnits("melee", ["Barbarian"]);
    await expect(gmPage.locator('[data-testid^="scenario-row-melee-slot-"]')).toHaveCount(1);
    await scenario.saveUpdate();

    await gmPage.reload();
    await scenario.expectRowUnits("melee", ["Barbarian"]);
    await expect(gmPage.locator('[data-testid^="scenario-row-melee-slot-"]')).toHaveCount(1);
  });

  test("removing the final unit from a row is allowed", async ({ gmPage }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await scenario.openById(AMBUSH_AT_DAWN_ID);

    await scenario.removeUnit("support", 1);
    await scenario.saveUpdate();

    await gmPage.reload();
    await scenario.expectRowEmpty("support");
    await scenario.expectRowEmpty("tank");
    await scenario.expectRowUnits("melee", ["Barbarian"]);
    await scenario.expectRowUnits("ranged", ["Mage"]);
  });

  test("duplicate units in the same row are allowed", async ({ gmPage }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await scenario.openNew();

    await scenario.fillName("Mirror Line");
    await scenario.assignUnit("melee", "Barbarian");
    await scenario.assignUnit("melee", "Barbarian");
    await scenario.saveCreate();

    await gmPage.reload();
    await scenario.expectRowUnits("melee", ["Barbarian", "Barbarian"]);
  });

  test("the same unit can appear in multiple rows", async ({ gmPage }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await scenario.openNew();

    await scenario.fillName("Flexible Vanguard");
    await scenario.assignUnit("tank", "Templar");
    await scenario.assignUnit("support", "Templar");
    await scenario.saveCreate();

    await gmPage.reload();
    await scenario.expectRowUnits("tank", ["Templar"]);
    await scenario.expectRowUnits("support", ["Templar"]);
  });

  test("the row-unit picker supports search, shows at most five options, and uses the placeholder only", async ({
    gmPage,
  }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await scenario.openNew();

    await gmPage.getByTestId("scenario-row-melee-picker").click();
    await expect(scenario.pickerSearch("melee")).toHaveAttribute("placeholder", "Search units...");
    await expect(scenario.pickerOptions).toHaveCount(5, {
      timeout: 15_000,
    });
    await expect(scenario.pickerOptions.filter({ hasText: "Search units..." })).toHaveCount(0);

    await scenario.pickerSearch("melee").fill("sam");
    await expect(gmPage.getByRole("option", { name: "Samurai" })).toBeVisible();
  });

  test("loading an existing scenario from the library preserves the create workspace flow", async ({
    gmPage,
  }) => {
    const scenario = new ScenarioWorkspacePage(gmPage);
    await loadScenarioFromLibrary(gmPage, "Ambush at Dawn");

    await expect(scenario.nameInput).toHaveValue("Ambush at Dawn");
    await scenario.expectRowUnits("melee", ["Barbarian"]);
    await scenario.expectRowUnits("ranged", ["Mage"]);
    await scenario.expectRowUnits("support", ["Ranger"]);
  });
});
