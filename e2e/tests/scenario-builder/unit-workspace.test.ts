import type { Page } from "@playwright/test";
import { expect, test } from "../db-reset.fixture";
import { BARBARIAN_ID } from "../helpers/seed-constants";
import { openNewEntity, saveEntityAndWait, expectAllStats, addLinkedEntity } from "../helpers/workspace-helpers";

test.describe.configure({ mode: "serial" });

async function saveCreatedUnitAndWaitForUrl(gmPage: Page) {
  await saveEntityAndWait(gmPage, "units", "create");
  await expect(gmPage).toHaveURL(/unit_id=/);
}

test.describe("Unit Workspace", () => {
  test("create a new unit with default stats", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewEntity(gmPage, "Units", "New Unit");

    await gmPage.getByTestId("entity-name-input").fill("Bronze Sentinel");
    await saveCreatedUnitAndWaitForUrl(gmPage);
    await expect(gmPage.getByTestId("entity-workspace-header")).toContainText("Unit: Bronze Sentinel");
  });

  test("save stays blocked until a name is present", async ({ gmPage }) => {
    await openNewEntity(gmPage, "Units", "New Unit");

    await expect(gmPage.getByTestId("entity-save-button")).toBeDisabled();
    await gmPage.getByTestId("entity-name-input").fill("Nameless No More");
    await expect(gmPage.getByTestId("entity-save-button")).toBeEnabled();
  });

  test("default zero stats persist after reload", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewEntity(gmPage, "Units", "New Unit");

    await gmPage.getByTestId("entity-name-input").fill("Blank Recruit");
    await saveCreatedUnitAndWaitForUrl(gmPage);

    await gmPage.reload();

    await expectAllStats(gmPage, "unit", {
      meleeDmg: "0",
      health: "0",
      rangedDmg: "0",
      manaRegen: "0",
      spellDmg: "0",
      speed: "0",
      dodge: "0",
      criticalChance: "0",
    });
  });

  test("saved stats and decimal values persist after reload", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewEntity(gmPage, "Units", "New Unit");

    await gmPage.getByTestId("entity-name-input").fill("Glass Runner");
    await gmPage.getByTestId("unit-meleeDmg-input").fill("18");
    await gmPage.getByTestId("unit-health-input").fill("82.25");
    await gmPage.getByTestId("unit-rangedDmg-input").fill("6");
    await gmPage.getByTestId("unit-manaRegen-input").fill("2");
    await gmPage.getByTestId("unit-spellDmg-input").fill("4");
    await gmPage.getByTestId("unit-speed-input").fill("1.35");
    await gmPage.getByTestId("unit-dodge-input").fill("6.5");
    await gmPage.getByTestId("unit-criticalChance-input").fill("12");
    await saveCreatedUnitAndWaitForUrl(gmPage);

    await gmPage.reload();

    await expectAllStats(gmPage, "unit", {
      meleeDmg: "18",
      health: "82.25",
      rangedDmg: "6",
      manaRegen: "2",
      spellDmg: "4",
      speed: "1.35",
      dodge: "6.5",
      criticalChance: "12",
    });
  });

  test("editing an existing unit persists name and stat changes", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?tab=Units&unit_id=${BARBARIAN_ID}`);

    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Barbarian");
    await gmPage.getByTestId("entity-name-input").fill("Barbarian Updated");
    await gmPage.getByTestId("unit-health-input").fill("120");
    await saveEntityAndWait(gmPage, "units", "update");

    await gmPage.reload();

    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Barbarian Updated");
    await expect(gmPage.getByTestId("unit-health-input")).toHaveValue("120");
  });

  test("duplicate unit names surface a save error", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?tab=Units&unit_id=${BARBARIAN_ID}`);

    await gmPage.getByTestId("entity-name-input").fill("Mage");
    await gmPage.getByTestId("entity-save-button").click();

    await expect(gmPage.getByTestId("entity-save-error")).toHaveText("A unit with this name already exists");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Mage");
  });

  test("a unit can save without linked items", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewEntity(gmPage, "Units", "New Unit");

    await gmPage.getByTestId("entity-name-input").fill("Barehand Adept");
    await saveCreatedUnitAndWaitForUrl(gmPage);

    await gmPage.reload();

    await expect(gmPage.locator('[data-testid^="unit-item-row-"]')).toHaveCount(0);
  });

  test("linked items persist in order after save and reload", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewEntity(gmPage, "Units", "New Unit");

    await gmPage.getByTestId("entity-name-input").fill("Field Captain");
    await addLinkedEntity(gmPage, "unit-item-picker", "unit-item-picker-search", "unit-add-item-button", "Iron Sword");
    await addLinkedEntity(gmPage, "unit-item-picker", "unit-item-picker-search", "unit-add-item-button", "Leather Shield");
    await saveCreatedUnitAndWaitForUrl(gmPage);

    await gmPage.reload();

    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Iron Sword");
    await expect(gmPage.getByTestId("unit-item-row-1")).toContainText("Leather Shield");
  });

  test("the item picker supports search, shows at most five options, and does not render the placeholder as an option", async ({
    gmPage,
  }) => {
    await openNewEntity(gmPage, "Units", "New Unit");

    await gmPage.getByTestId("entity-name-input").fill("Scout");
    await gmPage.getByTestId("unit-item-picker").click();
    await expect(gmPage.getByTestId("unit-item-picker-search")).toHaveAttribute(
      "placeholder",
      "Search items...",
    );
    await expect(gmPage.locator('[role="listbox"] [role="option"]')).toHaveCount(5);
    await expect(gmPage.locator('[role="listbox"] [role="option"]', { hasText: "Search items..." })).toHaveCount(0);

    await gmPage.getByTestId("unit-item-picker-search").fill("oak");
    await expect(gmPage.getByRole("option", { name: "Oak Staff" })).toBeVisible();
  });

  test("reordering linked items persists after save", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?tab=Units&unit_id=${BARBARIAN_ID}`);

    await addLinkedEntity(gmPage, "unit-item-picker", "unit-item-picker-search", "unit-add-item-button", "Leather Shield");
    await saveEntityAndWait(gmPage, "units", "update");

    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Iron Sword");
    await expect(gmPage.getByTestId("unit-item-row-1")).toContainText("Leather Shield");

    await gmPage.getByTestId("unit-item-move-down-0").click();
    await saveEntityAndWait(gmPage, "units", "update");
    await gmPage.reload();

    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Leather Shield");
    await expect(gmPage.getByTestId("unit-item-row-1")).toContainText("Iron Sword");
  });

  test("removing the final linked item persists after save", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?tab=Units&unit_id=${BARBARIAN_ID}`);

    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Iron Sword");
    await gmPage.getByTestId("unit-item-remove-0").click();
    await expect(gmPage.locator('[data-testid^="unit-item-row-"]')).toHaveCount(0);

    await saveEntityAndWait(gmPage, "units", "update");
    await gmPage.reload();

    await expect(gmPage.locator('[data-testid^="unit-item-row-"]')).toHaveCount(0);
  });

  test("duplicate item links are allowed and persist after reload", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewEntity(gmPage, "Units", "New Unit");

    await gmPage.getByTestId("entity-name-input").fill("Twinblade Adept");
    await addLinkedEntity(gmPage, "unit-item-picker", "unit-item-picker-search", "unit-add-item-button", "Iron Sword");
    await addLinkedEntity(gmPage, "unit-item-picker", "unit-item-picker-search", "unit-add-item-button", "Iron Sword");
    await saveCreatedUnitAndWaitForUrl(gmPage);

    await gmPage.reload();

    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Iron Sword");
    await expect(gmPage.getByTestId("unit-item-row-1")).toContainText("Iron Sword");
  });
});
