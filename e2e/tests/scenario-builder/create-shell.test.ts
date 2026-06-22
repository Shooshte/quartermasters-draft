import { expect, test } from "../auth/auth.fixtures";
import { test as dbTest } from "../db-reset.fixture";

import {
  AMBUSH_AT_DAWN_ID,
  BARBARIAN_ID,
  BARBARIAN_ROAR_ID,
  BATTLE_CRY_ID,
  CASTLE_SIEGE_ID,
  FIREBALL_ID,
  generateEntityIds,
  IRON_SWORD_ID,
  TRPC_BASE,
  UNKNOWN_UUID,
} from "../helpers/seed-constants";
import { deleteEntityViaApi } from "../helpers/trpc-api";

// ─── Core Shell Layout ───────────────────────────────────────────────────────

test.describe("Create Shell — Layout", () => {
  test("shows scenario workspace above entity workspace and tabbed library", async ({ gmPage }) => {
    await gmPage.goto("/create");
    const scenarioWorkspace = gmPage.getByTestId("scenario-workspace");
    const entityWorkspace = gmPage.getByTestId("entity-workspace");
    const divider = gmPage.getByTestId("workspace-divider");

    await expect(scenarioWorkspace).toBeVisible();
    await expect(entityWorkspace).toBeVisible();
    await expect(divider).toBeVisible();
    await expect(gmPage.getByTestId("library-panel")).toBeVisible();
    for (const tab of ["Effects", "Spells", "Items", "Units", "Scenarios"]) {
      await expect(gmPage.getByRole("tab", { name: tab })).toBeVisible();
    }

    const layout = await gmPage.evaluate(() => {
      const scenario = document.querySelector('[data-testid="scenario-workspace"]');
      const entity = document.querySelector('[data-testid="entity-workspace"]');
      const divider = document.querySelector('[data-testid="workspace-divider"]');

      if (
        !(scenario instanceof HTMLElement) ||
        !(entity instanceof HTMLElement) ||
        !(divider instanceof HTMLElement)
      ) {
        return null;
      }

      const scenarioRect = scenario.getBoundingClientRect();
      const entityRect = entity.getBoundingClientRect();
      const dividerRect = divider.getBoundingClientRect();

      return {
        scenarioTop: scenarioRect.top,
        scenarioBottom: scenarioRect.bottom,
        scenarioHeight: scenarioRect.height,
        entityTop: entityRect.top,
        entityHeight: entityRect.height,
        dividerTop: dividerRect.top,
        dividerBottom: dividerRect.bottom,
      };
    });

    expect(layout).not.toBeNull();
    expect(layout?.scenarioTop ?? 0).toBeLessThan(layout?.entityTop ?? 0);
    expect(layout?.scenarioBottom ?? 0).toBeLessThanOrEqual(layout?.entityTop ?? 0);
    expect(layout?.dividerTop ?? 0).toBeGreaterThanOrEqual(layout?.scenarioBottom ?? 0);
    expect(layout?.dividerBottom ?? 0).toBeLessThanOrEqual(layout?.entityTop ?? 0);
    expect(layout?.scenarioHeight ?? 0).toBeLessThan(layout?.entityHeight ?? 0);
  });

  test("library tabs header matches scenario and entity header heights", async ({ gmPage }) => {
    await gmPage.goto("/create");

    const headerHeights = await gmPage.evaluate(() => {
      const libraryHeader = document.querySelector('[data-testid="library-tabs-header"]');
      const scenarioHeader = document.querySelector('[data-testid="scenario-workspace-header"]');
      const entityHeader = document.querySelector('[data-testid="entity-workspace-header"]');

      if (
        !(libraryHeader instanceof HTMLElement) ||
        !(scenarioHeader instanceof HTMLElement) ||
        !(entityHeader instanceof HTMLElement)
      ) {
        return null;
      }

      return {
        library: libraryHeader.getBoundingClientRect().height,
        scenario: scenarioHeader.getBoundingClientRect().height,
        entity: entityHeader.getBoundingClientRect().height,
      };
    });

    expect(headerHeights).not.toBeNull();
    expect(
      Math.abs((headerHeights?.library ?? 0) - (headerHeights?.scenario ?? 0)),
    ).toBeLessThanOrEqual(0.5);
    expect(
      Math.abs((headerHeights?.library ?? 0) - (headerHeights?.entity ?? 0)),
    ).toBeLessThanOrEqual(0.5);
  });

  test("scenario workspace sizes to content instead of scrolling its body", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);

    const scenarioContent = await gmPage.getByTestId("scenario-workspace").evaluate((workspace) => {
      const body = workspace.lastElementChild;

      if (!(workspace instanceof HTMLElement) || !(body instanceof HTMLElement)) {
        return null;
      }

      const bodyStyles = window.getComputedStyle(body);

      return {
        workspaceHeight: workspace.getBoundingClientRect().height,
        bodyClientHeight: body.clientHeight,
        bodyScrollHeight: body.scrollHeight,
        bodyOverflowY: bodyStyles.overflowY,
      };
    });

    expect(scenarioContent).not.toBeNull();
    expect(scenarioContent?.bodyOverflowY).not.toBe("auto");
    expect(scenarioContent?.bodyOverflowY).not.toBe("scroll");
    expect(
      Math.abs((scenarioContent?.bodyClientHeight ?? 0) - (scenarioContent?.bodyScrollHeight ?? 0)),
    ).toBeLessThanOrEqual(1);
    expect(scenarioContent?.workspaceHeight ?? 0).toBeGreaterThan(0);
  });

  test("library list fills available height and scrolls on overflow", async ({ gmPage }) => {
    await gmPage.goto("/create");
    const libraryPanel = gmPage.getByTestId("library-panel");
    const activeTabPanel = gmPage.locator('[data-slot="tabs-content"][data-state="active"]');
    const tableContainer = activeTabPanel.locator('[data-slot="table-container"]');

    await expect(libraryPanel).toBeVisible();
    await expect(activeTabPanel).toBeVisible();
    await expect(tableContainer).toBeVisible();

    const layout = await activeTabPanel.evaluate((panel) => {
      const action = panel.querySelector('button[aria-label="New Scenario"], button');
      const pagerText = Array.from(panel.querySelectorAll("span")).find((node) =>
        node.textContent?.includes("Page 1 of "),
      );
      const paginationRow = pagerText?.parentElement;
      const tableContainer = panel.querySelector('[data-slot="table-container"]');
      const scrollRegion = tableContainer?.parentElement;

      if (!action || !paginationRow || !tableContainer || !scrollRegion) {
        return null;
      }

      const panelRect = panel.getBoundingClientRect();
      const actionRect = action.getBoundingClientRect();
      const paginationRect = paginationRow.getBoundingClientRect();
      const scrollRect = scrollRegion.getBoundingClientRect();
      const tableStyles = window.getComputedStyle(tableContainer);
      const scrollStyles = window.getComputedStyle(scrollRegion);

      return {
        panelHeight: panelRect.height,
        actionBottom: actionRect.bottom,
        paginationTop: paginationRect.top,
        scrollTop: scrollRect.top,
        scrollBottom: scrollRect.bottom,
        scrollHeight: scrollRect.height,
        tableOverflowX: tableStyles.overflowX,
        scrollOverflowY: scrollStyles.overflowY,
        hasHorizontalOverflow: tableContainer.scrollWidth > tableContainer.clientWidth,
      };
    });

    expect(layout).not.toBeNull();
    expect(layout?.scrollOverflowY).toBe("auto");
    expect(layout?.tableOverflowX).toBe("auto");
    expect(layout?.hasHorizontalOverflow).toBe(false);
    expect(layout?.scrollHeight ?? 0).toBeGreaterThan(0);
    expect(Math.abs((layout?.scrollTop ?? 0) - (layout?.actionBottom ?? 0))).toBeLessThanOrEqual(
      24,
    );
    expect(
      Math.abs((layout?.scrollBottom ?? 0) - (layout?.paginationTop ?? 0)),
    ).toBeLessThanOrEqual(24);
    expect((layout?.panelHeight ?? 0) > (layout?.scrollHeight ?? 0)).toBe(true);
  });
});

// ─── URL Parameters ──────────────────────────────────────────────────────────

test.describe("Create Shell — URL Parameters", () => {
  test("no params: Scenarios tab selected, workspaces idle", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await expect(gmPage.getByRole("tab", { name: "Scenarios" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();
    await expect(gmPage.getByTestId("scenario-idle")).toBeVisible();
    // No record should be selected
    const selectedRows = gmPage.locator('tr[aria-selected="true"]');
    await expect(selectedRows).toHaveCount(0);
  });

  test("tab=Spells: Spells tab selected", async ({ gmPage }) => {
    await gmPage.goto("/create?tab=Spells");
    await expect(gmPage.getByRole("tab", { name: "Spells" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();
    await expect(gmPage.getByTestId("scenario-idle")).toBeVisible();
    // No record should be selected
    const selectedRows = gmPage.locator('tr[aria-selected="true"]');
    await expect(selectedRows).toHaveCount(0);
  });

  test("scenario_id: loads scenario in workspace", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByRole("tab", { name: "Scenarios" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");
    // Scenario should be selected in library
    await expect(gmPage.getByRole("row", { name: "Ambush at Dawn" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();
  });

  test("entity_id (effect): auto-selects Effects tab and loads entity", async ({ gmPage }) => {
    await gmPage.goto(`/create?entity_id=${BARBARIAN_ROAR_ID}`);
    await expect(gmPage.getByRole("tab", { name: "Effects" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Barbarian Roar");
    await expect(gmPage.getByRole("row", { name: "Barbarian Roar" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(gmPage.getByTestId("scenario-idle")).toBeVisible();
  });

  test("entity_id (spell): auto-selects Spells tab and loads entity", async ({ gmPage }) => {
    await gmPage.goto(`/create?entity_id=${FIREBALL_ID}`);
    await expect(gmPage.getByRole("tab", { name: "Spells" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");
    await expect(gmPage.getByRole("row", { name: "Fireball" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("item_id: auto-selects Items tab and loads entity", async ({ gmPage }) => {
    await gmPage.goto(`/create?item_id=${IRON_SWORD_ID}`);
    await expect(gmPage.getByRole("tab", { name: "Items" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Iron Sword");
    await expect(gmPage.getByRole("row", { name: "Iron Sword" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("unit_id: auto-selects Units tab and loads entity", async ({ gmPage }) => {
    await gmPage.goto(`/create?unit_id=${BARBARIAN_ID}`);
    await expect(gmPage.getByRole("tab", { name: "Units" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Barbarian");
    await expect(gmPage.getByRole("row", { name: "Barbarian" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("tab=Spells + scenario_id: Spells tab with scenario loaded", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByRole("tab", { name: "Spells" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");
    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();
    // No record should be selected in the Spells library
    const selectedRows = gmPage.locator('tr[aria-selected="true"]');
    await expect(selectedRows).toHaveCount(0);

    await gmPage.getByRole("tab", { name: "Scenarios" }).click();
    await expect(gmPage.getByRole("row", { name: "Ambush at Dawn" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("tab + matching entity_id: correct tab and entity loaded", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${FIREBALL_ID}`);
    await expect(gmPage.getByRole("tab", { name: "Spells" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");
    await expect(gmPage.getByRole("row", { name: "Fireball" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("tab + item_id + scenario_id: all three loaded", async ({ gmPage }) => {
    await gmPage.goto(
      `/create?tab=Items&item_id=${IRON_SWORD_ID}&scenario_id=${AMBUSH_AT_DAWN_ID}`,
    );
    await expect(gmPage.getByRole("tab", { name: "Items" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Iron Sword");
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");
    await expect(gmPage.getByRole("row", { name: "Iron Sword" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    await gmPage.getByRole("tab", { name: "Scenarios" }).click();
    await expect(gmPage.getByRole("row", { name: "Ambush at Dawn" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("tab mismatch: entity loaded but not selected in library", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Items&entity_id=${BATTLE_CRY_ID}`);
    await expect(gmPage.getByRole("tab", { name: "Items" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Battle Cry");
    // No item should be selected
    const rows = gmPage.locator("tr[aria-selected]");
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toHaveAttribute("aria-selected", "false");
    }
  });

  test("invalid tab falls back to Scenarios", async ({ gmPage }) => {
    await gmPage.goto("/create?tab=Unknown");
    await expect(gmPage.getByRole("tab", { name: "Scenarios" })).toHaveAttribute(
      "data-state",
      "active",
    );
  });

  test("unknown entity_id shows not-found", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${UNKNOWN_UUID}`);
    await expect(gmPage.getByRole("tab", { name: "Spells" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-not-found")).toBeVisible();
  });

  test("unknown scenario_id shows not-found", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${UNKNOWN_UUID}`);
    await expect(gmPage.getByTestId("scenario-not-found")).toBeVisible();
  });
});

// ─── Browsing by Tab ─────────────────────────────────────────────────────────

test.describe("Create Shell — Browsing by Tab", () => {
  test("Effects tab shows records and New button", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();
    await expect(gmPage.getByRole("tab", { name: "Effects" })).toHaveAttribute(
      "data-state",
      "active",
    );
    for (const name of ["Barbarian Roar", "Rage"]) {
      await expect(gmPage.getByRole("row", { name })).toBeVisible();
    }
    await expect(gmPage.getByRole("button", { name: "New Effect" })).toBeVisible();
  });

  test("Spells tab shows records and New button", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();
    await expect(gmPage.getByRole("tab", { name: "Spells" })).toHaveAttribute(
      "data-state",
      "active",
    );
    for (const name of ["Battle Cry", "Fireball"]) {
      await expect(gmPage.getByRole("row", { name })).toBeVisible();
    }
    await expect(gmPage.getByRole("button", { name: "New Spell" })).toBeVisible();
  });

  const entityTabTests = [
    { tab: "Items", records: ["Iron Sword", "Oak Staff"], singular: "Item" },
    { tab: "Units", records: ["Barbarian", "Mage"], singular: "Unit" },
  ] as const;

  for (const { tab, records, singular } of entityTabTests) {
    test(`${tab} tab shows records and New button`, async ({ gmPage }) => {
      await gmPage.goto("/create");
      await gmPage.getByRole("tab", { name: tab }).click();
      await expect(gmPage.getByRole("tab", { name: tab })).toHaveAttribute("data-state", "active");
      for (const name of records) {
        await expect(gmPage.getByRole("row", { name })).toBeVisible();
      }
      await expect(gmPage.getByRole("button", { name: `New ${singular}` })).toBeVisible();
    });
  }

  test("Scenarios tab shows records and New button", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();
    await expect(gmPage.getByRole("tab", { name: "Scenarios" })).toHaveAttribute(
      "data-state",
      "active",
    );
    for (const name of ["Ambush at Dawn", "Castle Siege"]) {
      await expect(gmPage.getByRole("row", { name })).toBeVisible();
    }
    await expect(gmPage.getByRole("button", { name: "New Scenario" })).toBeVisible();
  });
});

// ─── Empty Tab State (uses db-reset fixture) ────────────────────────────────

dbTest.describe("Create Shell — Empty Tab State", () => {
  dbTest("empty state is shown when no effects exist", async ({ gmPage, resetDb }) => {
    try {
      const itemIds = generateEntityIds("items", 21);
      for (const id of itemIds) {
        const response = await deleteEntityViaApi(gmPage.request, "items", id);
        expect(response.ok()).toBeTruthy();
      }

      const spellIds = generateEntityIds("spells", 21);
      for (const id of spellIds) {
        const response = await deleteEntityViaApi(gmPage.request, "spells", id);
        expect(response.ok()).toBeTruthy();
      }

      const effectIds = generateEntityIds("effects", 21);
      for (const id of effectIds) {
        const response = await deleteEntityViaApi(gmPage.request, "effects", id);
        expect(response.ok()).toBeTruthy();
      }

      await gmPage.goto("/create");
      await gmPage.getByRole("tab", { name: "Effects" }).click();

      await expect(gmPage.getByTestId("empty-list")).toBeVisible();
      await expect(gmPage.getByText("No effect records yet")).toBeVisible();
      await expect(gmPage.getByRole("button", { name: "Create the first effect" })).toBeVisible();

      const selectedRows = gmPage.locator('tr[aria-selected="true"]');
      await expect(selectedRows).toHaveCount(0);
    } finally {
      await resetDb();
    }
  });
});

// ─── Tab Switching Memory ────────────────────────────────────────────────────

test.describe("Create Shell — Tab Switching Memory", () => {
  test("switching back to a tab restores the selected record", async ({ gmPage }) => {
    await gmPage.goto("/create");

    // Select Fireball on Spells tab
    await gmPage.getByRole("tab", { name: "Spells" }).click();
    const fireballRow = gmPage.getByRole("row", { name: "Fireball" });
    await fireballRow.getByRole("button", { name: /Edit/ }).click();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");

    // Select Iron Sword on Items tab
    await gmPage.getByRole("tab", { name: "Items" }).click();
    await gmPage
      .getByRole("row", { name: "Iron Sword" })
      .getByRole("button", { name: /Edit/ })
      .click();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Iron Sword");

    // Switch back to Spells
    await gmPage.getByRole("tab", { name: "Spells" }).click();
    await expect(gmPage.getByRole("row", { name: "Fireball" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("switching tabs does not clear loaded workspaces", async ({ gmPage }) => {
    await gmPage.goto(
      `/create?tab=Spells&entity_id=${FIREBALL_ID}&scenario_id=${AMBUSH_AT_DAWN_ID}`,
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

    // Switch to Items tab
    await gmPage.getByRole("tab", { name: "Items" }).click();
    await expect(gmPage.getByRole("tab", { name: "Items" })).toHaveAttribute(
      "data-state",
      "active",
    );
    // Workspaces should still show the loaded data
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");
  });

  test("switching back to a second tab restores the selected record", async ({ gmPage }) => {
    await gmPage.goto("/create");

    // Select Fireball on Spells tab
    await gmPage.getByRole("tab", { name: "Spells" }).click();
    const fireballRow = gmPage.getByRole("row", { name: "Fireball" });
    await fireballRow.getByRole("button", { name: /Edit/ }).click();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");

    // Select Iron Sword on Items tab
    await gmPage.getByRole("tab", { name: "Items" }).click();
    await gmPage
      .getByRole("row", { name: "Iron Sword" })
      .getByRole("button", { name: /Edit/ })
      .click();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Iron Sword");

    // Switch to Spells tab (away from Items)
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    // Switch back to Items
    await gmPage.getByRole("tab", { name: "Items" }).click();
    await expect(gmPage.getByRole("tab", { name: "Items" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByRole("row", { name: "Iron Sword" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

// ─── Record Selection ────────────────────────────────────────────────────────

test.describe("Create Shell — Record Selection", () => {
  test("selecting Barbarian Roar on Effects tab loads entity workspace", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

    await gmPage.getByRole("tab", { name: "Effects" }).click();
    const roarRow = gmPage.getByRole("row", { name: "Barbarian Roar" });
    await roarRow.getByRole("button", { name: /Edit/ }).click();

    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Barbarian Roar");
    await expect(gmPage.getByRole("row", { name: "Barbarian Roar" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // Scenario workspace unchanged
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");
  });

  test("selecting Fireball on Spells tab loads entity workspace", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

    await gmPage.getByRole("tab", { name: "Spells" }).click();
    const fireballRow = gmPage.getByRole("row", { name: "Fireball" });
    await fireballRow.getByRole("button", { name: /Edit/ }).click();

    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");
    await expect(gmPage.getByRole("row", { name: "Fireball" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    // Scenario workspace unchanged
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");
  });

  const entityTests = [
    { tab: "Items", name: "Iron Sword" },
    { tab: "Units", name: "Barbarian" },
  ] as const;

  for (const { tab, name } of entityTests) {
    test(`selecting ${name} on ${tab} tab loads entity workspace`, async ({ gmPage }) => {
      // Pre-load a scenario first
      await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
      await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

      await gmPage.getByRole("tab", { name: tab }).click();
      await gmPage.getByRole("row", { name }).getByRole("button", { name: /Edit/ }).click();

      await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(name);
      await expect(gmPage.getByRole("row", { name })).toHaveAttribute("aria-selected", "true");
      // Scenario workspace unchanged
      await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");
    });
  }

  test("selecting a scenario loads scenario workspace only", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");

    await gmPage.getByRole("tab", { name: "Scenarios" }).click();
    const ambushRow = gmPage.getByRole("row", { name: "Ambush at Dawn" });
    await ambushRow.getByRole("button", { name: /Edit/ }).click();

    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");
    // Entity workspace unchanged
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");
  });
});

// ─── Create Actions ──────────────────────────────────────────────────────────

test.describe("Create Shell — Create Actions", () => {
  test("New Effect clears selection and opens create mode", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

    await gmPage.getByRole("tab", { name: "Effects" }).click();
    const roarRow = gmPage.getByRole("row", { name: "Barbarian Roar" });
    await roarRow.getByRole("button", { name: /Edit/ }).click();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Barbarian Roar");

    await gmPage.getByRole("button", { name: "New Effect" }).click();
    // Selection cleared
    const rows = gmPage.locator("tr[aria-selected]");
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toHaveAttribute("aria-selected", "false");
    }
    // Entity workspace in create mode with empty name
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("");
    // Scenario workspace unchanged
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");
  });

  test("New Spell clears selection and opens create mode", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

    await gmPage.getByRole("tab", { name: "Spells" }).click();
    const fireballRow = gmPage.getByRole("row", { name: "Fireball" });
    await fireballRow.getByRole("button", { name: /Edit/ }).click();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");

    await gmPage.getByRole("button", { name: "New Spell" }).click();
    // Selection cleared
    const rows = gmPage.locator("tr[aria-selected]");
    const count = await rows.count();
    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i)).toHaveAttribute("aria-selected", "false");
    }
    // Entity workspace in create mode with empty name
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("");
    // Scenario workspace unchanged
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");
  });

  const entityTests = [
    { tab: "Items", singular: "Item", record: "Iron Sword" },
    { tab: "Units", singular: "Unit", record: "Barbarian" },
  ] as const;

  for (const { tab, singular, record } of entityTests) {
    test(`New ${singular} clears selection and opens create mode`, async ({ gmPage }) => {
      await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
      await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

      await gmPage.getByRole("tab", { name: tab }).click();
      await gmPage.getByRole("row", { name: record }).getByRole("button", { name: /Edit/ }).click();
      await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(record);

      await gmPage.getByRole("button", { name: `New ${singular}` }).click();
      // Selection cleared
      const rows = gmPage.locator("tr[aria-selected]");
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        await expect(rows.nth(i)).toHaveAttribute("aria-selected", "false");
      }
      // Entity workspace in create mode with empty name
      await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("");
      // Scenario workspace unchanged
      await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");
    });
  }

  test("New Scenario clears selection and opens create mode with 4 rows", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");

    await gmPage.getByRole("tab", { name: "Scenarios" }).click();
    const ambushRow2 = gmPage.getByRole("row", { name: "Ambush at Dawn" });
    await ambushRow2.getByRole("button", { name: /Edit/ }).click();
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

    await gmPage.getByRole("button", { name: "New Scenario" }).click();
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("");
    await expect(gmPage.getByTestId("scenario-row-tank")).toBeVisible();
    await expect(gmPage.getByTestId("scenario-row-melee")).toBeVisible();
    await expect(gmPage.getByTestId("scenario-row-ranged")).toBeVisible();
    await expect(gmPage.getByTestId("scenario-row-support")).toBeVisible();
    // Entity workspace unchanged
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");
  });
});

// ─── Unsaved Changes ─────────────────────────────────────────────────────────

test.describe("Create Shell — Unsaved Changes", () => {
  test("switching tabs does NOT warn on unsaved entity changes", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");

    await gmPage.getByTestId("entity-name-input").fill("Fireball Updated");
    await gmPage.getByRole("tab", { name: "Items" }).click();

    // No dialog
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).not.toBeVisible();
    await expect(gmPage.getByRole("tab", { name: "Items" })).toHaveAttribute(
      "data-state",
      "active",
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball Updated");
  });

  test("switching tabs does NOT warn on unsaved scenario changes", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

    await gmPage.getByTestId("scenario-name-input").fill("Ambush at Dawn Updated");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    await expect(gmPage.getByTestId("unsaved-changes-dialog")).not.toBeVisible();
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn Updated");
  });

  test("warn before selecting different entity with unsaved changes, cancel preserves", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");

    await gmPage.getByTestId("entity-name-input").fill("Fireball Updated");
    const battleCryRow = gmPage.getByRole("row", { name: "Battle Cry" });
    await battleCryRow.getByRole("button", { name: /Edit/ }).click();

    // Dialog appears
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();

    // Cancel
    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).not.toBeVisible();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball Updated");
    await expect(gmPage.getByRole("row", { name: "Fireball" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("discard unsaved entity changes and load different entity", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");

    await gmPage.getByTestId("entity-name-input").fill("Fireball Updated");
    const battleCryRow = gmPage.getByRole("row", { name: "Battle Cry" });
    await battleCryRow.getByRole("button", { name: /Edit/ }).click();

    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();
    await gmPage.getByRole("button", { name: "Discard" }).click();

    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Battle Cry");
    await expect(gmPage.getByRole("row", { name: "Battle Cry" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("warn before New Spell with unsaved changes", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");

    await gmPage.getByTestId("entity-name-input").fill("Fireball Updated");
    await gmPage.getByRole("button", { name: "New Spell" }).click();

    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();

    // Cancel preserves
    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball Updated");
  });

  test("warn before New Item (different type) with unsaved entity changes", async ({ gmPage }) => {
    await gmPage.goto(`/create?tab=Spells&entity_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");

    await gmPage.getByTestId("entity-name-input").fill("Fireball Updated");
    // Switch to Items tab (no warning)
    await gmPage.getByRole("tab", { name: "Items" }).click();
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).not.toBeVisible();

    // Click New Item (warning!)
    await gmPage.getByRole("button", { name: "New Item" }).click();
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();

    // Cancel preserves
    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball Updated");
  });

  test("warn before selecting different scenario with unsaved changes, cancel preserves", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

    await gmPage.getByTestId("scenario-name-input").fill("Ambush at Dawn Updated");
    const castleRow = gmPage.getByRole("row", { name: "Castle Siege" });
    await castleRow.getByRole("button", { name: /Edit/ }).click();

    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();

    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn Updated");
    await expect(gmPage.getByRole("row", { name: "Ambush at Dawn" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("discard unsaved scenario changes and load different scenario", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

    await gmPage.getByTestId("scenario-name-input").fill("Ambush at Dawn Updated");
    const castleRow2 = gmPage.getByRole("row", { name: "Castle Siege" });
    await castleRow2.getByRole("button", { name: /Edit/ }).click();

    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();
    await gmPage.getByRole("button", { name: "Discard" }).click();

    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Castle Siege");
    await expect(gmPage.getByRole("row", { name: "Castle Siege" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  test("warn before New Scenario with unsaved changes", async ({ gmPage }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

    await gmPage.getByTestId("scenario-name-input").fill("Ambush at Dawn Updated");
    await gmPage.getByRole("button", { name: "New Scenario" }).click();

    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();

    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn Updated");
  });
});

// ─── URL Updates ──────────────────────────────────────────────────────────────

test.describe("Create Shell — URL Updates", () => {
  test("tab click updates URL param", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();
    await expect(gmPage.getByRole("tab", { name: "Spells" })).toHaveAttribute(
      "data-state",
      "active",
    );

    const url = new URL(gmPage.url());
    expect(url.searchParams.get("tab")).toBe("Spells");
  });

  const entityUrlTests = [
    {
      tab: "Effects",
      entityType: "effect",
      recordName: "Barbarian Roar",
      urlParam: "effect_id",
      id: BARBARIAN_ROAR_ID,
    },
    {
      tab: "Spells",
      entityType: "spell",
      recordName: "Fireball",
      urlParam: "spell_id",
      id: FIREBALL_ID,
    },
    {
      tab: "Items",
      entityType: "item",
      recordName: "Iron Sword",
      urlParam: "item_id",
      id: IRON_SWORD_ID,
    },
    {
      tab: "Units",
      entityType: "unit",
      recordName: "Barbarian",
      urlParam: "unit_id",
      id: BARBARIAN_ID,
    },
  ] as const;

  for (const { tab, entityType, recordName, urlParam, id } of entityUrlTests) {
    test(`selecting ${entityType} updates URL with ${urlParam}`, async ({ gmPage }) => {
      await gmPage.goto("/create");
      await gmPage.getByRole("tab", { name: tab }).click();
      await gmPage
        .getByRole("row", { name: recordName })
        .getByRole("button", { name: /Edit/ })
        .click();

      // Wait for entity to load before checking URL
      await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(recordName);

      const url = new URL(gmPage.url());
      expect(url.searchParams.has(urlParam)).toBe(true);
      expect(url.searchParams.get(urlParam)).toBe(id);
    });
  }

  test("selecting a scenario updates scenario_id URL param", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();
    await gmPage
      .getByRole("row", { name: "Ambush at Dawn" })
      .getByRole("button", { name: /Edit/ })
      .click();

    // Wait for scenario to load before checking URL
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

    const url = new URL(gmPage.url());
    expect(url.searchParams.has("scenario_id")).toBe(true);
    expect(url.searchParams.get("scenario_id")).toBe(AMBUSH_AT_DAWN_ID);
  });

  test("new entity removes ID from URL", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();
    await gmPage
      .getByRole("row", { name: "Fireball" })
      .getByRole("button", { name: /Edit/ })
      .click();

    // Wait for entity to load
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");

    // Confirm spell_id is in URL
    let url = new URL(gmPage.url());
    expect(url.searchParams.has("spell_id")).toBe(true);

    // Click New Spell
    await gmPage.getByRole("button", { name: "New Spell" }).click();

    // Wait for create mode
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("");

    url = new URL(gmPage.url());
    expect(url.searchParams.has("spell_id")).toBe(false);
  });

  test("new scenario removes scenario_id from URL", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();
    await gmPage
      .getByRole("row", { name: "Ambush at Dawn" })
      .getByRole("button", { name: /Edit/ })
      .click();

    // Wait for scenario to load
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

    // Confirm scenario_id is in URL
    let url = new URL(gmPage.url());
    expect(url.searchParams.has("scenario_id")).toBe(true);

    // Click New Scenario
    await gmPage.getByRole("button", { name: "New Scenario" }).click();

    // Wait for create mode
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("");

    url = new URL(gmPage.url());
    expect(url.searchParams.has("scenario_id")).toBe(false);
  });

  test("tab change preserves existing entity and scenario params", async ({ gmPage }) => {
    await gmPage.goto(
      `/create?tab=Spells&spell_id=${FIREBALL_ID}&scenario_id=${AMBUSH_AT_DAWN_ID}`,
    );
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");

    // Switch to Items tab
    await gmPage.getByRole("tab", { name: "Items" }).click();

    const url = new URL(gmPage.url());
    expect(url.searchParams.get("tab")).toBe("Items");
    // Spell ID param should still be present
    expect(url.searchParams.has("spell_id")).toBe(true);
    // Scenario ID param should still be present
    expect(url.searchParams.has("scenario_id")).toBe(true);
    expect(url.searchParams.get("scenario_id")).toBe(AMBUSH_AT_DAWN_ID);
  });

  test("URL updates use replace (no new history entry)", async ({ gmPage }) => {
    // Navigate to a known starting page first
    await gmPage.goto("/create?tab=Effects");
    await expect(gmPage.getByRole("tab", { name: "Effects" })).toHaveAttribute(
      "data-state",
      "active",
    );

    // Navigate to /create (this creates a history entry)
    await gmPage.goto("/create");
    await expect(gmPage.getByRole("tab", { name: "Scenarios" })).toHaveAttribute(
      "data-state",
      "active",
    );

    // Click Spells tab (should use replaceState, NOT pushState)
    await gmPage.getByRole("tab", { name: "Spells" }).click();
    await expect(gmPage.getByRole("tab", { name: "Spells" })).toHaveAttribute(
      "data-state",
      "active",
    );

    // Go back — should return to the Effects page (before /create), not the Scenarios default
    await gmPage.goBack();
    await expect(gmPage).toHaveURL(/tab=Effects/);
  });
});
