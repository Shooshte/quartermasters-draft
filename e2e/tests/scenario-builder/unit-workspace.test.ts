import type { Page } from "@playwright/test";
import { expect, test } from "../db-reset.fixture";

test.describe.configure({ mode: "serial" });

const BARBARIAN_ID = "f0000000-0000-0000-0000-000000000001";

async function openNewUnit(gmPage: Page) {
  await gmPage.goto("/create");
  await gmPage.getByRole("tab", { name: "Units" }).click();
  await gmPage.getByRole("button", { name: "New Unit" }).click();
}

async function addLinkedItem(
  gmPage: Page,
  itemName: string,
  search?: string,
) {
  await gmPage.getByTestId("unit-item-picker").click();
  await gmPage.getByTestId("unit-item-picker-search").fill(search ?? itemName);
  await expect(gmPage.getByRole("option", { name: itemName })).toBeVisible();
  await gmPage.getByRole("option", { name: itemName }).click();
  await gmPage.getByTestId("unit-add-item-button").click();
}

async function expectAllStats(gmPage: Page, values: Record<string, string>) {
  for (const [field, value] of Object.entries(values)) {
    await expect(gmPage.getByTestId(`unit-${field}-input`)).toHaveValue(value);
  }
}

async function saveUnitAndWait(gmPage: Page, mutation: "create" | "update") {
  await Promise.all([
    gmPage.waitForResponse((response) =>
      response.url().includes(`/api/trpc/scenarioBuilder.units.${mutation}`) &&
      response.request().method() === "POST" &&
      response.ok(),
    ),
    gmPage.getByTestId("entity-save-button").click(),
  ]);
}

async function saveCreatedUnitAndWaitForUrl(gmPage: Page) {
  await saveUnitAndWait(gmPage, "create");
  await expect(gmPage).toHaveURL(/unit_id=/);
}

test.describe("Unit Workspace", () => {
  test("create a new unit with default stats", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewUnit(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("Bronze Sentinel");
    await saveCreatedUnitAndWaitForUrl(gmPage);
    await expect(gmPage.getByTestId("entity-workspace-header")).toContainText("Unit: Bronze Sentinel");
  });

  test("save stays blocked until a name is present", async ({ gmPage }) => {
    await openNewUnit(gmPage);

    await expect(gmPage.getByTestId("entity-save-button")).toBeDisabled();
    await gmPage.getByTestId("entity-name-input").fill("Nameless No More");
    await expect(gmPage.getByTestId("entity-save-button")).toBeEnabled();
  });

  test("default zero stats persist after reload", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewUnit(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("Blank Recruit");
    await saveCreatedUnitAndWaitForUrl(gmPage);

    await gmPage.reload();

    await expectAllStats(gmPage, {
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
    await openNewUnit(gmPage);

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

    await expectAllStats(gmPage, {
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
    await saveUnitAndWait(gmPage, "update");

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
    await openNewUnit(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("Barehand Adept");
    await saveCreatedUnitAndWaitForUrl(gmPage);

    await gmPage.reload();

    await expect(gmPage.locator('[data-testid^="unit-item-row-"]')).toHaveCount(0);
  });

  test("linked items persist in order after save and reload", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewUnit(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("Field Captain");
    await addLinkedItem(gmPage, "Iron Sword");
    await addLinkedItem(gmPage, "Leather Shield");
    await saveCreatedUnitAndWaitForUrl(gmPage);

    await gmPage.reload();

    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Iron Sword");
    await expect(gmPage.getByTestId("unit-item-row-1")).toContainText("Leather Shield");
  });

  test("the item picker supports search, shows at most five options, and does not render the placeholder as an option", async ({
    gmPage,
  }) => {
    await openNewUnit(gmPage);

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

    await addLinkedItem(gmPage, "Leather Shield");
    await saveUnitAndWait(gmPage, "update");

    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Iron Sword");
    await expect(gmPage.getByTestId("unit-item-row-1")).toContainText("Leather Shield");

    await gmPage.getByTestId("unit-item-move-down-0").click();
    await saveUnitAndWait(gmPage, "update");
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

    await saveUnitAndWait(gmPage, "update");
    await gmPage.reload();

    await expect(gmPage.locator('[data-testid^="unit-item-row-"]')).toHaveCount(0);
  });

  test("duplicate item links are allowed and persist after reload", async ({ gmPage, resetDb }) => {
    await resetDb();
    await openNewUnit(gmPage);

    await gmPage.getByTestId("entity-name-input").fill("Twinblade Adept");
    await addLinkedItem(gmPage, "Iron Sword");
    await addLinkedItem(gmPage, "Iron Sword");
    await saveCreatedUnitAndWaitForUrl(gmPage);

    await gmPage.reload();

    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Iron Sword");
    await expect(gmPage.getByTestId("unit-item-row-1")).toContainText("Iron Sword");
  });
});
