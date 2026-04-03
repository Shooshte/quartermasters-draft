import { test, expect } from "../db-reset.fixture";
import { AMBUSH_AT_DAWN_ID, CASTLE_SIEGE_ID } from "../helpers/seed-constants";
import { deleteEntityViaApi, listEntityIdsViaApi } from "../helpers/trpc-api";
import { LibraryTabPage } from "../pages/library-tab.page";
import { SCENARIOS_TAB } from "../pages/library-tab-configs";

// All tests in this file share the same database and some mutate it,
// so they must run serially to prevent race conditions.
test.describe.configure({ mode: "serial" });

// ─── Display ────────────────────────────────────────────────────────────────

test.describe("Scenarios Library Tab — Display", () => {
  test("scenarios are displayed with name and last update date", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();

    const ambush = lib.getRow("Ambush at Dawn");
    await expect(ambush).toBeVisible();
    // Verify last update date is displayed (e.g. "Apr 1, 2025")
    await expect(ambush.getByText(/\w{3}\s+\d{1,2},\s+\d{4}/)).toBeVisible();

    const castle = lib.getRow("Castle Siege");
    await expect(castle).toBeVisible();
    // Verify last update date is displayed (e.g. "May 1, 2025")
    await expect(castle.getByText(/\w{3}\s+\d{1,2},\s+\d{4}/)).toBeVisible();
  });

  test("empty state is shown when no scenarios exist", async ({
    gmPage,
    resetDb,
  }) => {
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    try {
      const scenarioIds = await listEntityIdsViaApi(gmPage.request, "scenarios");
      for (const id of scenarioIds) {
        const response = await deleteEntityViaApi(gmPage.request, "scenarios", id);
        expect(response.ok()).toBeTruthy();
      }

      await lib.navigateToTab();
      await expect(lib.emptyList).toBeVisible();
    } finally {
      await resetDb();
    }
  });
});

// ─── Pagination ─────────────────────────────────────────────────────────────

test.describe("Scenarios Library Tab — Pagination", () => {
  test("scenarios are displayed one page at a time with pagination controls", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();

    // Page 1 should show 20 items
    await expect(lib.rows).toHaveCount(20);

    // Pagination controls visible
    await expect(lib.nextPageButton).toBeVisible();
    await expect(lib.prevPageButton).toBeVisible();
  });

  test("navigate to the next page", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();

    // First page: "Ambush at Dawn" visible
    await expect(lib.getRow("Ambush at Dawn")).toBeVisible();

    await lib.clickNextPage();

    // Second page: only "Zorath Keep" (alphabetically last)
    await expect(lib.getRow("Zorath Keep")).toBeVisible();
    // Ambush at Dawn should no longer be shown
    await expect(lib.getRow("Ambush at Dawn")).not.toBeVisible();
  });

  test("navigate to previous page", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();

    // Go to page 2
    await lib.clickNextPage();
    await expect(lib.getRow("Zorath Keep")).toBeVisible();

    // Go back to page 1
    await lib.clickPrevPage();
    await expect(lib.getRow("Ambush at Dawn")).toBeVisible();
  });

  test("Previous page control is disabled on the first page", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();
    await expect(lib.prevPageButton).toBeDisabled();
  });

  test("Next page control is disabled on the last page", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();

    await lib.clickNextPage();
    await expect(lib.nextPageButton).toBeDisabled();
  });

  test("pagination resets when sort order changes", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();

    // Go to page 2
    await lib.clickNextPage();
    await expect(lib.getRow("Zorath Keep")).toBeVisible();

    // Change sort to Last Update
    await lib.clickSortColumn("Last Update");

    // Should be back on page 1
    await expect(lib.prevPageButton).toBeDisabled();
  });
});

// ─── Sorting ────────────────────────────────────────────────────────────────

test.describe("Scenarios Library Tab — Sorting", () => {
  test("default sort order is by name ascending", async ({ gmPage, resetDb }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();

    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Ambush at Dawn");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Bridge Defense");
  });

  test("sort by name descending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();

    // Click Name to toggle to descending
    await lib.clickSortColumn("Name");

    // Descending: Zombie Horde, Jungle Trek, ...
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Zorath Keep");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Zombie Horde");
  });

  test("sort by last update date ascending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();

    // Click Last Update to sort by updatedAt ascending
    await lib.clickSortColumn("Last Update");

    // Oldest first: Ambush at Dawn (2025-04), Castle Siege (2025-05), Zombie Horde (2025-06)
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Ambush at Dawn");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Castle Siege");
    await expect(lib.rows.nth(2)).toHaveAttribute("aria-label", "Zombie Horde");
  });

  test("sort by last update date descending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();

    // Click Last Update to sort ascending, then click again for descending
    await lib.clickSortColumn("Last Update");
    await lib.clickSortColumn("Last Update");

    // Newest first: Jungle Trek (2026-02), Ice Cavern (2026-01)
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Jungle Trek");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Ice Cavern");
  });

  test("clicking the active sort column toggles direction", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();

    // Default: Name ascending — Ambush at Dawn first
    await expect(lib.rows.nth(0)).toHaveAttribute(
      "aria-label",
      "Ambush at Dawn",
    );

    // Click Name to toggle to descending
    await lib.clickSortColumn("Name");
    await expect(lib.rows.nth(0)).toHaveAttribute(
      "aria-label",
      "Zorath Keep",
    );
  });
});

// ─── Selection ──────────────────────────────────────────────────────────────

test.describe("Scenarios Library Tab — Selection", () => {
  test("select a scenario from the list via edit button", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();

    await lib.editEntity("Ambush at Dawn");

    // Selected in list
    await expect(lib.getRow("Ambush at Dawn")).toHaveAttribute("aria-selected", "true");

    // Loaded in workspace
    await expect(lib.nameInput).toHaveValue("Ambush at Dawn");

    // URL updated
    await expect(gmPage).toHaveURL(new RegExp(`scenario_id=${AMBUSH_AT_DAWN_ID}`));
  });
});

// ─── Unsaved Changes ────────────────────────────────────────────────────────

test.describe("Scenarios Library Tab — Unsaved Changes", () => {
  test("warn before opening a different scenario with unsaved changes", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateWithEntity(AMBUSH_AT_DAWN_ID);
    await expect(lib.nameInput).toHaveValue("Ambush at Dawn");

    // Make changes
    await lib.nameInput.fill("Ambush at Dawn Updated");

    // Try to select Castle Siege via edit button
    await lib.editEntity("Castle Siege");

    // Dialog appears
    await expect(lib.unsavedChangesDialog).toBeVisible();

    // Cancel preserves state
    await lib.cancelUnsavedChanges();
    await expect(lib.unsavedChangesDialog).not.toBeVisible();
    await expect(lib.getRow("Ambush at Dawn")).toHaveAttribute("aria-selected", "true");
    await expect(lib.nameInput).toHaveValue("Ambush at Dawn Updated");
  });

  test("discard unsaved changes and open a different scenario", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateWithEntity(AMBUSH_AT_DAWN_ID);
    await expect(lib.nameInput).toHaveValue("Ambush at Dawn");

    await lib.nameInput.fill("Ambush at Dawn Updated");
    await lib.editEntity("Castle Siege");

    await expect(lib.unsavedChangesDialog).toBeVisible();
    await lib.discardUnsavedChanges();

    await expect(lib.getRow("Castle Siege")).toHaveAttribute("aria-selected", "true");
    await expect(lib.nameInput).toHaveValue("Castle Siege");
  });
});

// ─── Deletion (serial to prevent DB race conditions) ────────────────────────

test.describe.serial("Scenarios Library Tab — Deletion", () => {
  test("delete a scenario that is not currently open", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();
    await expect(lib.getRow("Castle Siege")).toBeVisible();

    // Click delete on Castle Siege
    await lib.clickDeleteOnRow("Castle Siege");

    // Confirmation dialog
    await expect(lib.deleteConfirmDialog).toBeVisible();

    // Confirm
    await lib.confirmDeletion();

    // Castle Siege gone
    await expect(lib.getRow("Castle Siege")).not.toBeVisible();

    // Workspace should remain idle
    await expect(lib.idleState).toBeVisible();
  });

  test("cancel deletion of a scenario", async ({ gmPage, resetDb }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();

    await lib.clickDeleteOnRow("Castle Siege");

    await expect(lib.deleteConfirmDialog).toBeVisible();
    await lib.cancelDeletion();

    // Castle Siege should still be visible
    await expect(lib.getRow("Castle Siege")).toBeVisible();
  });

  test("delete the currently open scenario", async ({ gmPage, resetDb }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateWithEntity(AMBUSH_AT_DAWN_ID);
    await expect(lib.nameInput).toHaveValue("Ambush at Dawn");

    await lib.clickDeleteOnRow("Ambush at Dawn");
    await lib.confirmDeletion();

    // Should be gone from list
    await expect(lib.getRow("Ambush at Dawn")).not.toBeVisible();

    // Workspace cleared
    await expect(lib.idleState).toBeVisible();

    // URL should not contain scenario_id
    expect(gmPage.url()).not.toContain("scenario_id");
  });

  test("deleting the last scenario on a page returns to the previous page", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, SCENARIOS_TAB);
    await lib.navigateToTab();

    // Verify we have 2 pages
    await expect(lib.rows).toHaveCount(20);

    // Go to page 2
    await lib.clickNextPage();

    // Only Zorath Keep on page 2
    await expect(lib.getRow("Zorath Keep")).toBeVisible();
    await expect(lib.rows).toHaveCount(1);

    // Delete it
    await lib.clickDeleteOnRow("Zorath Keep");
    await lib.confirmDeletion();

    // Should be returned to page 1
    await expect(lib.prevPageButton).toBeDisabled();
    await expect(lib.getRow("Ambush at Dawn")).toBeVisible();
    await expect(lib.getRow("Zorath Keep")).not.toBeVisible();

    // Restore DB for subsequent test files
    await resetDb();
  });
});
