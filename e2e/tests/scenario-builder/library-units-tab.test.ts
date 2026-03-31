import { test, expect } from "../db-reset.fixture";
import { BARBARIAN_ID, RANGER_ID, ZEPHYR_MONK_ID, generateEntityIds } from "../helpers/seed-constants";
import { deleteEntityViaApi } from "../helpers/trpc-api";
import { LibraryTabPage } from "../pages/library-tab.page";
import { UNITS_TAB } from "../pages/library-tab-configs";

// All tests in this file share the same database and some mutate it,
// so they must run serially to prevent race conditions.
test.describe.configure({ mode: "serial" });


// ─── Display ────────────────────────────────────────────────────────────────

test.describe("Units Library Tab — Display", () => {
  test("units are displayed with name and updated at", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();

    const barbarian = lib.getRow("Barbarian");
    await expect(barbarian).toBeVisible();
    await expect(barbarian.getByText("Barbarian")).toBeVisible();
    // Verify updated_at date is displayed (e.g. "Jan 1, 2025")
    await expect(barbarian.getByText(/\w{3}\s+\d{1,2},\s+\d{4}/)).toBeVisible();

    const ranger = lib.getRow("Ranger");
    await expect(ranger).toBeVisible();
    await expect(ranger.getByText("Ranger")).toBeVisible();
    // Verify updated_at date is displayed (e.g. "Mar 1, 2025")
    await expect(ranger.getByText(/\w{3}\s+\d{1,2},\s+\d{4}/)).toBeVisible();
  });

  test("empty state is shown when no units exist", async ({
    gmPage,
    resetDb,
  }) => {
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    // Delete all 21 units via API
    const unitIds = generateEntityIds("units", 21);
    for (const id of unitIds) {
      const response = await deleteEntityViaApi(gmPage.request, "units", id);
      expect(response.ok()).toBeTruthy();
    }

    await lib.navigateToTab();
    await expect(lib.emptyList).toBeVisible();

    // Restore DB for subsequent tests
    await resetDb();
  });
});

// ─── Pagination ─────────────────────────────────────────────────────────────

test.describe("Units Library Tab — Pagination", () => {
  test("units are displayed one page at a time with pagination controls", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();

    // Page 1 should show 20 units
    await expect(lib.rows).toHaveCount(20);

    // Pagination controls visible
    await expect(lib.nextPageButton).toBeVisible();
    await expect(lib.prevPageButton).toBeVisible();
  });

  test("navigate to the next page", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();

    // First page: "Barbarian" visible (alphabetically first)
    await expect(lib.getRow("Barbarian")).toBeVisible();

    await lib.clickNextPage();

    // Second page: only "Zircon Juggernaut" (alphabetically last)
    await expect(lib.getRow("Zircon Juggernaut")).toBeVisible();
    // Barbarian should no longer be shown
    await expect(lib.getRow("Barbarian")).not.toBeVisible();
  });

  test("navigate to previous page", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();

    // Go to page 2
    await lib.clickNextPage();
    await expect(lib.getRow("Zircon Juggernaut")).toBeVisible();

    // Go back to page 1
    await lib.clickPrevPage();
    await expect(lib.getRow("Barbarian")).toBeVisible();
  });

  test("Previous page control is disabled on the first page", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();
    await expect(lib.prevPageButton).toBeDisabled();
  });

  test("Next page control is disabled on the last page", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();

    await lib.clickNextPage();
    await expect(lib.nextPageButton).toBeDisabled();
  });

  test("pagination resets when sort order changes", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();

    // Go to page 2
    await lib.clickNextPage();
    await expect(lib.getRow("Zircon Juggernaut")).toBeVisible();

    // Change sort to Updated At
    await lib.clickSortColumn("Updated At");

    // Should be back on page 1
    await expect(lib.prevPageButton).toBeDisabled();
  });
});

// ─── Sorting ────────────────────────────────────────────────────────────────

test.describe("Units Library Tab — Sorting", () => {
  test("default sort order is by name ascending", async ({ gmPage, resetDb }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();

    // Alphabetically: Barbarian, Mage, ...
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Barbarian");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Mage");
  });

  test("sort by name descending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();

    // Click Name to toggle to descending
    await lib.clickSortColumn("Name");

    // Descending: Zircon Juggernaut, Zephyr Monk, ...
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Zircon Juggernaut");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Zephyr Monk");
  });

  test("sort by updated at ascending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();

    // Click Updated At to sort ascending
    await lib.clickSortColumn("Updated At");

    // Barbarian was updated before Mage (2025-01-01 vs 2025-02-01)
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Barbarian");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Mage");
  });

  test("sort by updated at descending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();

    // Click Updated At twice: ascending then descending
    await lib.clickSortColumn("Updated At");
    await lib.clickSortColumn("Updated At");

    // Zephyr Monk was updated last (2025-11-01)
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Zephyr Monk");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Yeti Rider");
  });

  test("clicking the active sort column toggles direction", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();

    // Default: Name ascending — Barbarian first
    await expect(lib.rows.nth(0)).toHaveAttribute(
      "aria-label",
      "Barbarian",
    );

    // Click Name to toggle to descending
    await lib.clickSortColumn("Name");
    await expect(lib.rows.nth(0)).toHaveAttribute(
      "aria-label",
      "Zircon Juggernaut",
    );
  });
});

// ─── Selection ──────────────────────────────────────────────────────────────

test.describe("Units Library Tab — Selection", () => {
  test("select a unit from the list via edit button", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();

    await lib.editEntity("Barbarian");

    // Selected in list
    await expect(lib.getRow("Barbarian")).toHaveAttribute("aria-selected", "true");

    // Loaded in workspace
    await expect(lib.nameInput).toHaveValue("Barbarian");

    // URL updated
    await expect(gmPage).toHaveURL(new RegExp(`unit_id=${BARBARIAN_ID}`));
  });
});

// ─── Unsaved Changes ────────────────────────────────────────────────────────

test.describe("Units Library Tab — Unsaved Changes", () => {
  test("warn before opening a different unit with unsaved changes", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateWithEntity(BARBARIAN_ID);
    await expect(lib.nameInput).toHaveValue("Barbarian");

    // Make changes
    await lib.nameInput.fill("Barbarian Updated");

    // Try to select Mage via edit button
    await lib.editEntity("Mage");

    // Dialog appears
    await expect(lib.unsavedChangesDialog).toBeVisible();

    // Cancel preserves state
    await lib.cancelUnsavedChanges();
    await expect(lib.unsavedChangesDialog).not.toBeVisible();
    await expect(lib.getRow("Barbarian")).toHaveAttribute("aria-selected", "true");
    await expect(lib.nameInput).toHaveValue("Barbarian Updated");
  });

  test("discard unsaved changes and open a different unit", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateWithEntity(BARBARIAN_ID);
    await expect(lib.nameInput).toHaveValue("Barbarian");

    await lib.nameInput.fill("Barbarian Updated");
    await lib.editEntity("Mage");

    await expect(lib.unsavedChangesDialog).toBeVisible();
    await lib.discardUnsavedChanges();

    await expect(lib.getRow("Mage")).toHaveAttribute("aria-selected", "true");
    await expect(lib.nameInput).toHaveValue("Mage");
  });
});

// ─── Deletion (serial to prevent DB race conditions) ────────────────────────

test.describe.serial("Units Library Tab — Deletion", () => {
  test("delete a unit that is not currently open", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();
    await expect(lib.getRow("Ranger")).toBeVisible();

    // Click delete on Ranger
    await lib.clickDeleteOnRow("Ranger");

    // Confirmation dialog
    await expect(lib.deleteConfirmDialog).toBeVisible();

    // Confirm
    await lib.confirmDeletion();

    // Ranger gone
    await expect(lib.getRow("Ranger")).not.toBeVisible();

    // Workspace should remain idle
    await expect(lib.idleState).toBeVisible();
  });

  test("cancel deletion of a unit", async ({ gmPage, resetDb }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();

    await lib.clickDeleteOnRow("Ranger");

    await expect(lib.deleteConfirmDialog).toBeVisible();
    await lib.cancelDeletion();

    // Ranger should still be visible
    await expect(lib.getRow("Ranger")).toBeVisible();
  });

  test("delete the currently open unit", async ({ gmPage, resetDb }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateWithEntity(BARBARIAN_ID);
    await expect(lib.nameInput).toHaveValue("Barbarian");

    await lib.clickDeleteOnRow("Barbarian");
    await lib.confirmDeletion();

    // Should be gone from list
    await expect(lib.getRow("Barbarian")).not.toBeVisible();

    // Workspace cleared
    await expect(lib.idleState).toBeVisible();

    // URL should not contain unit_id
    expect(gmPage.url()).not.toContain("unit_id");
  });

  test("deleting the last unit on a page returns to the previous page", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, UNITS_TAB);
    await lib.navigateToTab();

    // Verify we have 2 pages
    await expect(lib.rows).toHaveCount(20);

    // Go to page 2
    await lib.clickNextPage();

    // Only Zircon Juggernaut on page 2
    await expect(lib.getRow("Zircon Juggernaut")).toBeVisible();
    await expect(lib.rows).toHaveCount(1);

    // Delete it
    await lib.clickDeleteOnRow("Zircon Juggernaut");
    await lib.confirmDeletion();

    // Should be returned to page 1
    await expect(lib.prevPageButton).toBeDisabled();
    await expect(lib.getRow("Barbarian")).toBeVisible();
    await expect(lib.getRow("Zircon Juggernaut")).not.toBeVisible();

    // Restore DB for subsequent test files
    await resetDb();
  });
});
