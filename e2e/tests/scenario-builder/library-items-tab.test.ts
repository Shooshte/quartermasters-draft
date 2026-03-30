import { test, expect } from "../db-reset.fixture";
import { IRON_SWORD_ID, LEATHER_SHIELD_ID, generateEntityIds } from "../helpers/seed-constants";
import { deleteEntityViaApi } from "../helpers/trpc-api";
import { LibraryTabPage } from "../pages/library-tab.page";
import { ITEMS_TAB } from "../pages/library-tab-configs";

// All tests in this file share the same database and some mutate it,
// so they must run serially to prevent race conditions.
test.describe.configure({ mode: "serial" });

// ─── Display ────────────────────────────────────────────────────────────────

test.describe("Items Library Tab — Display", () => {
  test("items are displayed with name and updated at", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();

    const ironSword = lib.getRow("Iron Sword");
    await expect(ironSword).toBeVisible();
    await expect(ironSword.getByText("Iron Sword")).toBeVisible();
    await expect(ironSword.getByText(/\w{3}\s+\d{1,2},\s+\d{4}/)).toBeVisible();

    const oakStaff = lib.getRow("Oak Staff");
    await expect(oakStaff).toBeVisible();
    await expect(oakStaff.getByText("Oak Staff")).toBeVisible();
    await expect(oakStaff.getByText(/\w{3}\s+\d{1,2},\s+\d{4}/)).toBeVisible();
  });

  test("empty state is shown when no items exist", async ({
    gmPage,
    resetDb,
  }) => {
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    const itemIds = generateEntityIds("items", 21);
    for (const id of itemIds) {
      const response = await deleteEntityViaApi(gmPage.request, "items", id);
      expect(response.ok()).toBeTruthy();
    }

    await lib.navigateToTab();
    await expect(lib.emptyList).toBeVisible();

    await resetDb();
  });
});

// ─── Pagination ─────────────────────────────────────────────────────────────

test.describe("Items Library Tab — Pagination", () => {
  test("items are displayed one page at a time with pagination controls", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();

    await expect(lib.rows).toHaveCount(20);
    await expect(lib.nextPageButton).toBeVisible();
    await expect(lib.prevPageButton).toBeVisible();
  });

  test("navigate to the next page", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();

    await expect(lib.getRow("Iron Sword")).toBeVisible();
    await lib.clickNextPage();

    await expect(lib.getRow("Zircon Crown")).toBeVisible();
    await expect(lib.getRow("Iron Sword")).not.toBeVisible();
  });

  test("navigate to previous page", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();

    await lib.clickNextPage();
    await expect(lib.getRow("Zircon Crown")).toBeVisible();

    await lib.clickPrevPage();
    await expect(lib.getRow("Iron Sword")).toBeVisible();
  });

  test("Previous page control is disabled on the first page", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();
    await expect(lib.prevPageButton).toBeDisabled();
  });

  test("Next page control is disabled on the last page", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();

    await lib.clickNextPage();
    await expect(lib.nextPageButton).toBeDisabled();
  });

  test("pagination resets when sort order changes", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();

    await lib.clickNextPage();
    await expect(lib.getRow("Zircon Crown")).toBeVisible();

    await lib.clickSortColumn("Updated At");

    await expect(lib.prevPageButton).toBeDisabled();
  });
});

// ─── Sorting ────────────────────────────────────────────────────────────────

test.describe("Items Library Tab — Sorting", () => {
  test("default sort order is by name ascending", async ({ gmPage, resetDb }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();

    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Iron Sword");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Jade Lantern");
  });

  test("sort by name descending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();

    await lib.clickSortColumn("Name");

    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Zircon Crown");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Yew Longbow");
  });

  test("sort by updated at ascending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();

    await lib.clickSortColumn("Updated At");

    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Iron Sword");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Oak Staff");
  });

  test("sort by updated at descending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();

    await lib.clickSortColumn("Updated At");
    await lib.clickSortColumn("Updated At");

    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Wyrm Scale");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Venom Blade");
  });

  test("clicking the active sort column toggles direction", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();

    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Iron Sword");

    await lib.clickSortColumn("Name");
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Zircon Crown");
  });
});

// ─── Selection ──────────────────────────────────────────────────────────────

test.describe("Items Library Tab — Selection", () => {
  test("select an item from the list via edit button", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();

    await lib.editEntity("Iron Sword");

    await expect(lib.getRow("Iron Sword")).toHaveAttribute("aria-selected", "true");
    await expect(lib.nameInput).toHaveValue("Iron Sword");
    await expect(gmPage).toHaveURL(new RegExp(`item_id=${IRON_SWORD_ID}`));
  });
});

// ─── Unsaved Changes ────────────────────────────────────────────────────────

test.describe("Items Library Tab — Unsaved Changes", () => {
  test("warn before opening a different item with unsaved changes", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateWithEntity(IRON_SWORD_ID);
    await expect(lib.nameInput).toHaveValue("Iron Sword");

    await lib.nameInput.fill("Iron Sword Updated");

    await lib.editEntity("Leather Shield");

    await expect(lib.unsavedChangesDialog).toBeVisible();

    await lib.cancelUnsavedChanges();
    await expect(lib.unsavedChangesDialog).not.toBeVisible();
    await expect(lib.getRow("Iron Sword")).toHaveAttribute("aria-selected", "true");
    await expect(lib.nameInput).toHaveValue("Iron Sword Updated");
  });

  test("discard unsaved changes and open a different item", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateWithEntity(IRON_SWORD_ID);
    await expect(lib.nameInput).toHaveValue("Iron Sword");

    await lib.nameInput.fill("Iron Sword Updated");
    await lib.editEntity("Leather Shield");

    await expect(lib.unsavedChangesDialog).toBeVisible();
    await lib.discardUnsavedChanges();

    await expect(lib.getRow("Leather Shield")).toHaveAttribute("aria-selected", "true");
    await expect(lib.nameInput).toHaveValue("Leather Shield");
  });
});

// ─── Deletion (serial to prevent DB race conditions) ────────────────────────

test.describe.serial("Items Library Tab — Deletion", () => {
  test("delete an item that is not currently open", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();
    await expect(lib.getRow("Leather Shield")).toBeVisible();

    await lib.clickDeleteOnRow("Leather Shield");

    await expect(lib.deleteConfirmDialog).toBeVisible();

    await lib.confirmDeletion();

    await expect(lib.getRow("Leather Shield")).not.toBeVisible();
    await expect(lib.idleState).toBeVisible();
  });

  test("cancel deletion of an item", async ({ gmPage, resetDb }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();

    await lib.clickDeleteOnRow("Leather Shield");

    await expect(lib.deleteConfirmDialog).toBeVisible();
    await lib.cancelDeletion();

    await expect(lib.getRow("Leather Shield")).toBeVisible();
  });

  test("delete the currently open item", async ({ gmPage, resetDb }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateWithEntity(IRON_SWORD_ID);
    await expect(lib.nameInput).toHaveValue("Iron Sword");

    await lib.clickDeleteOnRow("Iron Sword");
    await lib.confirmDeletion();

    await expect(lib.getRow("Iron Sword")).not.toBeVisible();
    await expect(lib.idleState).toBeVisible();
    expect(gmPage.url()).not.toContain("item_id");
  });

  test("deleting the last item on a page returns to the previous page", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, ITEMS_TAB);
    await lib.navigateToTab();

    await expect(lib.rows).toHaveCount(20);

    await lib.clickNextPage();

    await expect(lib.getRow("Zircon Crown")).toBeVisible();
    await expect(lib.rows).toHaveCount(1);

    await lib.clickDeleteOnRow("Zircon Crown");
    await lib.confirmDeletion();

    await expect(lib.prevPageButton).toBeDisabled();
    await expect(lib.getRow("Iron Sword")).toBeVisible();
    await expect(lib.getRow("Zircon Crown")).not.toBeVisible();

    await resetDb();
  });
});
