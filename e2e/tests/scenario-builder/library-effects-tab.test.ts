// Source of truth: e2e/features/create/library-effects-tab.feature
// Also covers effect-workspace.feature deletion scenarios.
import { expect, test } from "../db-reset.fixture";
import { BARBARIAN_ROAR_ID, ZODIAC_BURST_ID } from "../helpers/seed-constants";
import { deleteEntityViaApi, listEntityIdsViaApi } from "../helpers/trpc-api";
import { LibraryTabPage } from "../pages/library-tab.page";
import { EFFECTS_TAB } from "../pages/library-tab-configs";

test.beforeEach(async ({ resetDb }) => {
  await resetDb();
});

// ─── Display ────────────────────────────────────────────────────────────────

test.describe("Effects Library Tab — Display", () => {
  test("effects are displayed with name, timing type, and effect type @smoke", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    const roar = lib.getRow("Barbarian Roar");
    await expect(roar).toBeVisible();
    await expect(roar.getByText("instant")).toBeVisible();
    await expect(roar.getByText("buff")).toBeVisible();

    const exhaust = lib.getRow("Exhaust");
    await expect(exhaust).toBeVisible();
    await expect(exhaust.getByText("instant")).toBeVisible();
    await expect(exhaust.getByText("debuff")).toBeVisible();
  });

  test("empty state is shown when no effects exist", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    const itemIds = await listEntityIdsViaApi(gmPage.request, "items");
    for (const id of itemIds) {
      const response = await deleteEntityViaApi(gmPage.request, "items", id);
      expect(response.ok()).toBeTruthy();
    }

    const spellIds = await listEntityIdsViaApi(gmPage.request, "spells");
    for (const id of spellIds) {
      const response = await deleteEntityViaApi(gmPage.request, "spells", id);
      expect(response.ok()).toBeTruthy();
    }

    const effectIds = await listEntityIdsViaApi(gmPage.request, "effects");
    for (const id of effectIds) {
      const response = await deleteEntityViaApi(gmPage.request, "effects", id);
      expect(response.ok()).toBeTruthy();
    }

    await lib.navigateToTab();
    await expect(lib.emptyList).toBeVisible();
    await expect(gmPage.getByText("No effect records yet")).toBeVisible();
    await expect(gmPage.getByRole("button", { name: "Create the first effect" })).toBeVisible();
  });
});

// ─── Pagination ─────────────────────────────────────────────────────────────

test.describe("Effects Library Tab — Pagination", () => {
  test("effects are displayed one page at a time with pagination controls @smoke", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    // Page 1 should show 20 items
    await expect(lib.rows).toHaveCount(20);

    // Pagination controls visible
    await expect(lib.nextPageButton).toBeVisible();
    await expect(lib.prevPageButton).toBeVisible();
  });

  test("navigate to the next page", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    // First page: "Arcane Damage" visible (alphabetically first)
    await expect(lib.getRow("Arcane Damage")).toBeVisible();

    await lib.clickNextPage();

    // Second page: only "Zodiac Burst" (alphabetically last)
    await expect(lib.getRow("Zodiac Burst")).toBeVisible();
    // Arcane Damage should no longer be shown
    await expect(lib.getRow("Arcane Damage")).not.toBeVisible();
  });

  test("navigate to previous page", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    // Go to page 2
    await lib.clickNextPage();
    await expect(lib.getRow("Zodiac Burst")).toBeVisible();

    // Go back to page 1
    await lib.clickPrevPage();
    await expect(lib.getRow("Arcane Damage")).toBeVisible();
  });

  test("Previous page control is disabled on the first page", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();
    await expect(lib.prevPageButton).toBeDisabled();
  });

  test("Next page control is disabled on the last page", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    await lib.clickNextPage();
    await expect(lib.nextPageButton).toBeDisabled();
  });

  test("pagination resets when sort order changes", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    // Go to page 2
    await lib.clickNextPage();
    await expect(lib.getRow("Zodiac Burst")).toBeVisible();

    // Change sort to Timing Type
    await lib.clickSortColumn("Timing Type");

    // Should be back on page 1
    await expect(lib.prevPageButton).toBeDisabled();
  });
});

// ─── Sorting ────────────────────────────────────────────────────────────────

test.describe("Effects Library Tab — Sorting", () => {
  test("default sort order is by name ascending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    // Alphabetically: Arcane Damage, Bandage, ...
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Arcane Damage");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Bandage");
  });

  test("sort by name descending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    // Click Name to toggle to descending
    await lib.clickSortColumn("Name");

    // Descending: Zodiac Burst, Zephyr Renewal, ...
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Zodiac Burst");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Zephyr Renewal");
  });

  test("sort by timing type ascending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    // Click Timing Type to sort ascending
    await lib.clickSortColumn("Timing Type");

    // instant sorts before interval alphabetically, first instant effect by name
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Arcane Damage");
  });

  test("sort by timing type descending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    // Click Timing Type twice: ascending then descending
    await lib.clickSortColumn("Timing Type");
    await lib.clickSortColumn("Timing Type");

    // interval sorts after instant, so interval records appear first when descending
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Bandage");
  });

  test("sort by effect type ascending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    // Click Effect Type to sort ascending
    await lib.clickSortColumn("Effect Type");

    // buff < damage < debuff < healing alphabetically
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Barbarian Roar");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Guardian Shield");
  });

  test("sort by effect type descending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    // Click Effect Type twice: ascending then descending
    await lib.clickSortColumn("Effect Type");
    await lib.clickSortColumn("Effect Type");

    // damage is last in enum declaration order, so first when descending
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Arcane Damage");
  });

  test("clicking the active sort column toggles direction", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    // Default: Name ascending — Arcane Damage first
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Arcane Damage");

    // Click Name to toggle to descending
    await lib.clickSortColumn("Name");
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Zodiac Burst");
  });
});

// ─── Selection ──────────────────────────────────────────────────────────────

test.describe("Effects Library Tab — Selection", () => {
  test("select an effect from the list via edit button", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    await lib.editEntity("Barbarian Roar");

    // Selected in list
    await expect(lib.getRow("Barbarian Roar")).toHaveAttribute("aria-selected", "true");

    // Loaded in workspace
    await expect(lib.nameInput).toHaveValue("Barbarian Roar");

    // URL updated
    await expect(gmPage).toHaveURL(new RegExp(`effect_id=${BARBARIAN_ROAR_ID}`));
  });
});

// ─── Unsaved Changes ────────────────────────────────────────────────────────

test.describe("Effects Library Tab — Unsaved Changes", () => {
  test("warn before opening a different effect with unsaved changes", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateWithEntity(BARBARIAN_ROAR_ID);
    await expect(lib.nameInput).toHaveValue("Barbarian Roar");

    // Make changes
    await lib.nameInput.fill("Barbarian Roar Updated");

    // Try to select Exhaust via edit button
    await lib.editEntity("Exhaust");

    // Dialog appears
    await expect(lib.unsavedChangesDialog).toBeVisible();

    // Cancel preserves state
    await lib.cancelUnsavedChanges();
    await expect(lib.unsavedChangesDialog).not.toBeVisible();
    await expect(lib.getRow("Barbarian Roar")).toHaveAttribute("aria-selected", "true");
    await expect(lib.nameInput).toHaveValue("Barbarian Roar Updated");
  });

  test("discard unsaved changes and open a different effect", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateWithEntity(BARBARIAN_ROAR_ID);
    await expect(lib.nameInput).toHaveValue("Barbarian Roar");

    await lib.nameInput.fill("Barbarian Roar Updated");
    await lib.editEntity("Exhaust");

    await expect(lib.unsavedChangesDialog).toBeVisible();
    await lib.discardUnsavedChanges();

    await expect(lib.getRow("Exhaust")).toHaveAttribute("aria-selected", "true");
    await expect(lib.nameInput).toHaveValue("Exhaust");
  });
});

// ─── Deletion ────────────────────────────────────────────────────────────────

test.describe("Effects Library Tab — Deletion", () => {
  test("delete an effect that is not currently open", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();
    await lib.clickNextPage();
    await expect(lib.getRow("Zodiac Burst")).toBeVisible();

    await lib.clickDeleteOnRow("Zodiac Burst");

    // Confirmation dialog
    await expect(lib.deleteConfirmDialog).toBeVisible();

    // Confirm
    await lib.confirmDeletion();

    await expect(lib.getRow("Zodiac Burst")).not.toBeVisible();

    await expect(lib.idleState).toBeVisible();
  });

  test("cancel deletion of an effect", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    await lib.clickNextPage();

    await lib.clickDeleteOnRow("Zodiac Burst");

    await expect(lib.deleteConfirmDialog).toBeVisible();
    await lib.cancelDeletion();

    await expect(lib.getRow("Zodiac Burst")).toBeVisible();
  });

  test("cannot delete an effect that is linked to a spell", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateWithEntity(BARBARIAN_ROAR_ID);
    await expect(lib.nameInput).toHaveValue("Barbarian Roar");

    await lib.clickDeleteOnRow("Barbarian Roar");

    await lib.confirmDeletion();

    await expect(lib.deleteConfirmDialog).toBeVisible();
    await expect(
      gmPage.getByText("Cannot delete effect while it is linked to one or more spells."),
    ).toBeVisible();
    await expect(lib.nameInput).toHaveValue("Barbarian Roar");
    expect(gmPage.url()).toContain(`effect_id=${BARBARIAN_ROAR_ID}`);

    await lib.cancelDeletion();
    await expect(lib.getRow("Barbarian Roar")).toBeVisible();
  });

  test("delete the currently open unlinked effect", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();
    await lib.clickNextPage();

    await lib.editEntity("Zodiac Burst");
    await expect(lib.nameInput).toHaveValue("Zodiac Burst");
    await expect(gmPage).toHaveURL(new RegExp(`effect_id=${ZODIAC_BURST_ID}`));

    await lib.clickDeleteOnRow("Zodiac Burst");

    await lib.confirmDeletion();

    await expect(lib.getRow("Zodiac Burst")).not.toBeVisible();
    await expect(lib.idleState).toBeVisible();
    expect(gmPage.url()).not.toContain("effect_id");
  });

  test("deleting the last effect on a page returns to the previous page", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, EFFECTS_TAB);
    await lib.navigateToTab();

    // Verify we have 2 pages
    await expect(lib.rows).toHaveCount(20);

    // Go to page 2
    await lib.clickNextPage();

    // Only Zodiac Burst on page 2
    await expect(lib.getRow("Zodiac Burst")).toBeVisible();
    await expect(lib.rows).toHaveCount(1);

    // Delete it
    await lib.clickDeleteOnRow("Zodiac Burst");
    await lib.confirmDeletion();

    // Should be returned to page 1
    await expect(lib.prevPageButton).toBeDisabled();
    await expect(lib.getRow("Arcane Damage")).toBeVisible();
    await expect(lib.getRow("Zodiac Burst")).not.toBeVisible();
  });
});
