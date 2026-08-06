// Source of truth: e2e/features/create/unit-workspace.feature
import { expect, test } from "../db-reset.fixture";
import { BARBARIAN_ID } from "../helpers/seed-constants";
import { expectAllStats } from "../helpers/workspace-helpers";
import { UnitWorkspacePage } from "../pages/unit-workspace.page";

test.beforeEach(async ({ resetDb }) => {
  await resetDb();
});

test.describe("Unit Workspace", () => {
  test("create a new unit with default stats @smoke", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await unit.fillName("Bronze Sentinel");
    await unit.saveCreate();

    await expect(gmPage).toHaveURL(/unit_id=/);
    await expect(gmPage.getByTestId("entity-workspace-header")).toContainText(
      "Unit: Bronze Sentinel",
    );

    await gmPage.reload();
    await expect(unit.targetSideSelect).toHaveValue("enemies");
    await expect(unit.targetPolicySelect).toHaveValue("highest_health");
    await expect(unit.targetRowCountButton(1)).toHaveAttribute("aria-pressed", "true");
    await expect(unit.maxTargetsPerRowInput).toHaveValue("1");
    await expect(unit.positionRuleButton("any")).toHaveAttribute("aria-pressed", "true");
    for (const row of ["tank", "melee", "ranged", "support"] as const) {
      await expect(unit.allowedRowButton(row)).toHaveAttribute("aria-pressed", "true");
    }
  });

  test("name is required", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await expect(unit.saveButton).toBeDisabled();
  });

  test("mana defaults to 100 and other stat fields default to zero", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await unit.fillName("Blank Recruit");
    await unit.saveCreate();

    await gmPage.reload();
    await expectAllStats(gmPage, "unit", {
      meleeDmg: "0",
      health: "0",
      mana: "100",
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
      mana: "200",
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
      mana: "200",
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

  for (const { name, side, policy } of [
    { name: "Ally Vanguard", side: "allies", policy: "lowest_health" },
    { name: "Enemy Hunter", side: "enemies", policy: "highest_damage" },
    { name: "Self Warder", side: "self", policy: "self" },
  ] as const) {
    test(`explicit ${side} targeting persists`, async ({ gmPage }) => {
      const unit = new UnitWorkspacePage(gmPage);
      await unit.openNew();
      await unit.fillName(name);
      await unit.setTargeting(side, policy);
      await unit.saveCreate();

      await gmPage.reload();
      await expect(unit.targetSideSelect).toHaveValue(side);
      await expect(unit.targetPolicySelect).toHaveValue(policy);
    });
  }

  test("target policy offers all five options", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await expect(unit.targetPolicySelect.locator('option:not([value=""])')).toHaveText([
      "highest_health",
      "lowest_health",
      "highest_damage",
      "random",
      "self",
    ]);
  });

  test("self policy is invalid for enemies", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();
    await unit.fillName("Confused Duelist");
    await unit.setTargeting("enemies", "self");

    await expect(unit.saveButton).toBeDisabled();
    await expect(
      gmPage.getByText("Self priority cannot be used when targeting enemies"),
    ).toBeVisible();
  });

  test("targeting summary comes only from the unit configuration", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openById(BARBARIAN_ID);
    await unit.setTargeting("allies", "lowest_health");

    await expect(unit.targetingSummary).toContainText("Target side: Allies.");
    await expect(unit.targetingSummary).toContainText("Lowest health");
    await expect(unit.targetingSummary).not.toContainText(/first (linked )?effect/i);
    await expect(unit.targetingSummary).not.toContainText(/effect.*determine/i);
  });

  test("target row count offers one through four rows", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    for (const count of [1, 2, 3, 4] as const) {
      await expect(unit.targetRowCountButton(count)).toBeVisible();
    }
  });

  test("whole-row targeting persists", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();
    await unit.fillName("Formation Breaker");
    await unit.setTargeting("enemies", "random");
    await unit.setTargetRowCount(2);
    await unit.setPerRowMode("all");
    await unit.saveCreate();

    await gmPage.reload();
    await expect(unit.targetRowCountButton(2)).toHaveAttribute("aria-pressed", "true");
    await expect(unit.perRowModeButton("all")).toHaveAttribute("aria-pressed", "true");
    await expect(unit.maxTargetsPerRowInput).toHaveCount(0);
  });

  test("adjacent targeting requires a limited count of at least two", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    await unit.setMaxTargetsPerRow(1);
    await expect(unit.positionRuleButton("adjacent")).toBeDisabled();
    await unit.setMaxTargetsPerRow(3);
    await expect(unit.positionRuleButton("adjacent")).toBeEnabled();
    await unit.setPositionRule("adjacent");
    await expect(unit.positionRuleButton("adjacent")).toHaveAttribute("aria-pressed", "true");
    await unit.setPerRowMode("all");
    await expect(unit.positionRuleButton("adjacent")).toBeDisabled();
    await expect(unit.positionRuleButton("any")).toHaveAttribute("aria-pressed", "true");
  });

  test("allowed rows default to all and persist restrictions", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openNew();

    for (const row of ["tank", "melee", "ranged", "support"] as const) {
      await expect(unit.allowedRowButton(row)).toHaveAttribute("aria-pressed", "true");
    }
    await expect(unit.targetingSummary).toContainText(
      "Eligible rows: Tank, Melee, Ranged, and Support.",
    );

    await unit.fillName("Tank Buster");
    await unit.setTargeting("enemies", "highest_health");
    await unit.setAllowedRows(["tank", "melee"]);
    await unit.saveCreate();

    await gmPage.reload();
    await expect(unit.allowedRowButton("tank")).toHaveAttribute("aria-pressed", "true");
    await expect(unit.allowedRowButton("melee")).toHaveAttribute("aria-pressed", "true");
    await expect(unit.allowedRowButton("ranged")).toHaveAttribute("aria-pressed", "false");
    await expect(unit.allowedRowButton("support")).toHaveAttribute("aria-pressed", "false");
    await expect(unit.targetingSummary).toContainText("Eligible rows: Tank and Melee.");
  });

  test("edit a linked item", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openById(BARBARIAN_ID);

    await unit.editItem(0);

    await expect(gmPage.getByRole("tab", { name: "Items" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Iron Sword");
    await expect(gmPage).toHaveURL(/tab=Items/);
    await expect(gmPage).toHaveURL(/item_id=/);
    await expect(gmPage).not.toHaveURL(/unit_id=/);
  });

  test("cancel or discard linked-item navigation with unsaved unit changes", async ({ gmPage }) => {
    const unit = new UnitWorkspacePage(gmPage);
    await unit.openById(BARBARIAN_ID);
    await unit.fillName("Barbarian Updated");

    await unit.editItem(0);
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();

    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).not.toBeVisible();
    await expect(gmPage.getByRole("tab", { name: "Units" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(unit.nameInput).toHaveValue("Barbarian Updated");

    await unit.editItem(0);
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();
    await gmPage.getByRole("button", { name: "Discard" }).click();

    await expect(gmPage.getByRole("tab", { name: "Items" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Iron Sword");
    await expect(gmPage).toHaveURL(/tab=Items/);
    await expect(gmPage).toHaveURL(/item_id=/);
    await expect(gmPage).not.toHaveURL(/unit_id=/);
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
