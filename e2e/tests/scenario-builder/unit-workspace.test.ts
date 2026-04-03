// Source of truth: e2e/features/create/unit-workspace.feature
import { expect, test } from "../db-reset.fixture";
import { BARBARIAN_ID } from "../helpers/seed-constants";
import { expectAllStats } from "../helpers/workspace-helpers";
import { UnitWorkspacePage } from "../pages/unit-workspace.page";

test.beforeEach(async ({ resetDb }) => {
  await resetDb();
});

test.describe("Unit Workspace", () => {
  test("create a new unit with default stats", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await unit.fillName("Bronze Sentinel");
    await unit.saveCreate();

    await expect(gmPage).toHaveURL(/unit_id=/);
    await expect(gmPage.getByTestId("entity-workspace-header")).toContainText("Unit: Bronze Sentinel");
  });

  test("name is required", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await expect(unit.saveButton).toBeDisabled();
  });

  test("stat fields default to zero", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await unit.fillName("Blank Recruit");
    await unit.saveCreate();

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

  test("create a unit with saved stats", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await unit.fillName("Storm Lancer");
    await unit.fillStats({
      meleeDmg: "18",
      health: "95",
      rangedDmg: "6",
      manaRegen: "2",
      spellDmg: "4",
      speed: "1.1",
      dodge: "7",
      criticalChance: "12",
    });
    await unit.saveCreate();

    await gmPage.reload();
    await expectAllStats(gmPage, "unit", {
      meleeDmg: "18",
      health: "95",
      rangedDmg: "6",
      manaRegen: "2",
      spellDmg: "4",
      speed: "1.1",
      dodge: "7",
      criticalChance: "12",
    });
  });

  test("stat fields accept decimal values", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await unit.fillName("Glass Runner");
    await unit.fillStats({
      health: "82.25",
      speed: "1.35",
      dodge: "6.5",
    });
    await unit.saveCreate();

    await gmPage.reload();
    await expectAllStats(gmPage, "unit", {
      health: "82.25",
      speed: "1.35",
      dodge: "6.5",
    });
  });

  test("edit an existing unit", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openById(BARBARIAN_ID);

    await unit.fillName("Barbarian Updated");
    await unit.saveUpdate();

    await gmPage.reload();
    await expect(unit.nameInput).toHaveValue("Barbarian Updated");
  });

  test("edit stat values on an existing unit", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openById(BARBARIAN_ID);

    await unit.fillStats({ health: "120" });
    await unit.saveUpdate();

    await gmPage.reload();
    await expect(gmPage.getByTestId("unit-health-input")).toHaveValue("120");
  });

  test("duplicate name shows a save error", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openById(BARBARIAN_ID);

    await unit.fillName("Mage");
    await unit.saveButton.click();

    await expect(unit.saveError).toHaveText("A unit with this name already exists");
    await expect(unit.nameInput).toHaveValue("Mage");
  });

  test("linked items are optional on create", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await unit.fillName("Barehand Adept");
    await unit.saveCreate();

    await gmPage.reload();
    await expect(unit.itemRows).toHaveCount(0);
  });

  test("add an item to a unit", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await unit.fillName("Iron Vanguard");
    await unit.linkItem("Iron Sword");
    await unit.saveCreate();

    await gmPage.reload();
    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Iron Sword");
  });

  test("add multiple items to a unit in priority order", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await unit.fillName("Field Captain");
    await unit.linkItem("Iron Sword");
    await unit.linkItem("Leather Shield");
    await unit.saveCreate();

    await gmPage.reload();
    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Iron Sword");
    await expect(gmPage.getByTestId("unit-item-row-1")).toContainText("Leather Shield");
  });

  test("search for a specific item before linking it", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await unit.itemPicker.click();
    await unit.itemPickerSearch.fill("oak");
    await expect(gmPage.getByRole("option", { name: "Oak Staff" })).toBeVisible();
  });

  test("link-item picker shows at most five options", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await unit.itemPicker.click();
    await expect(gmPage.locator('[role="listbox"] [role="option"]')).toHaveCount(5);
  });

  test("link-item picker does not include the search prompt as an option", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await unit.itemPicker.click();
    await expect(unit.itemPickerSearch).toHaveAttribute("placeholder", "Search items...");
    await expect(
      gmPage.locator('[role="listbox"] [role="option"]', { hasText: "Search items..." }),
    ).toHaveCount(0);
  });

  test("reorder linked items", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openById(BARBARIAN_ID);

    await unit.linkItem("Leather Shield");
    await unit.saveUpdate();

    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Iron Sword");
    await expect(gmPage.getByTestId("unit-item-row-1")).toContainText("Leather Shield");

    await gmPage.getByTestId("unit-item-move-down-0").click();
    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Leather Shield");
    await expect(gmPage.getByTestId("unit-item-row-1")).toContainText("Iron Sword");
    await unit.saveUpdate();

    await gmPage.reload();
    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Leather Shield");
    await expect(gmPage.getByTestId("unit-item-row-1")).toContainText("Iron Sword");
  });

  test("remove a linked item while at least one remains", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openById(BARBARIAN_ID);

    await unit.linkItem("Leather Shield");
    await unit.saveUpdate();

    await unit.removeItem(1);
    await expect(unit.itemRows).toHaveCount(1);
    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Iron Sword");
    await unit.saveUpdate();

    await gmPage.reload();
    await expect(unit.itemRows).toHaveCount(1);
    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Iron Sword");
  });

  test("removing the final linked item is allowed on edit", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openById(BARBARIAN_ID);

    await unit.removeItem(0);
    await unit.saveUpdate();

    await gmPage.reload();
    await expect(unit.itemRows).toHaveCount(0);
  });

  test("duplicate item links are allowed", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await unit.fillName("Twinblade Adept");
    await unit.linkItem("Iron Sword");
    await unit.linkItem("Iron Sword");
    await unit.saveCreate();

    await gmPage.reload();
    await expect(gmPage.getByTestId("unit-item-row-0")).toContainText("Iron Sword");
    await expect(gmPage.getByTestId("unit-item-row-1")).toContainText("Iron Sword");
  });
});
