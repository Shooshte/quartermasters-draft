// Source of truth: e2e/features/create/library-spells-tab.feature
// Also covers spell-workspace.feature scenarios for effect-picker behavior and
// deletion flows.
import { test, expect } from "../db-reset.fixture";
import { FIREBALL_ID, BATTLE_CRY_ID, ZENITH_BLOOM_ID } from "../helpers/seed-constants";
import { deleteEntityViaApi, listEntityIdsViaApi } from "../helpers/trpc-api";
import { LibraryTabPage } from "../pages/library-tab.page";
import { SPELLS_TAB } from "../pages/library-tab-configs";

// All tests in this file share the same database and some mutate it,
// so they must run serially to prevent race conditions.
test.describe.configure({ mode: "serial" });

// ─── Display ────────────────────────────────────────────────────────────────

test.describe("Spells Library Tab — Display", () => {
  test("spells are displayed with name, description, target policy, and updated at", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    const fireball = lib.getRow("Fireball");
    await expect(fireball).toBeVisible();
    await expect(fireball.getByText("highest_health")).toBeVisible();
    // Verify updated_at date is displayed (locale-dependent format)
    await expect(fireball.locator("td").nth(2)).not.toBeEmpty();

    const healingTouch = lib.getRow("Healing Touch");
    await expect(healingTouch).toBeVisible();
    await expect(healingTouch.getByText("lowest_health")).toBeVisible();
    // Verify updated_at date is displayed (locale-dependent format)
    await expect(healingTouch.locator("td").nth(2)).not.toBeEmpty();
  });

  test("empty state is shown when no spells exist", async ({
    gmPage,
    resetDb,
  }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    try {
      await resetDb();

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

      await lib.navigateToTab();
      await expect(lib.emptyList).toBeVisible();
      await expect(gmPage.getByText("No spell records yet")).toBeVisible();
      await expect(
        gmPage.getByRole("button", { name: "Create the first spell" }),
      ).toBeVisible();
    } finally {
      await resetDb();
    }
  });
});

// ─── Pagination ─────────────────────────────────────────────────────────────

test.describe("Spells Library Tab — Pagination", () => {
  test("spells are displayed one page at a time with pagination controls", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    // Page 1 should show 20 items
    await expect(lib.rows).toHaveCount(20);

    // Pagination controls visible
    await expect(lib.nextPageButton).toBeVisible();
    await expect(lib.prevPageButton).toBeVisible();
  });

  test("navigate to the next page", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    // First page: "Arcane Shield" visible (alphabetically first)
    await expect(lib.getRow("Arcane Shield")).toBeVisible();

    await lib.clickNextPage();

    // Second page: only "Zenith Bloom" (alphabetically last)
    await expect(lib.getRow("Zenith Bloom")).toBeVisible();
    // Arcane Shield should no longer be shown
    await expect(lib.getRow("Arcane Shield")).not.toBeVisible();
  });

  test("navigate to previous page", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    // Go to page 2
    await lib.clickNextPage();
    await expect(lib.getRow("Zenith Bloom")).toBeVisible();

    // Go back to page 1
    await lib.clickPrevPage();
    await expect(lib.getRow("Arcane Shield")).toBeVisible();
  });

  test("Previous page control is disabled on the first page", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();
    await expect(lib.prevPageButton).toBeDisabled();
  });

  test("Next page control is disabled on the last page", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    await lib.clickNextPage();
    await expect(lib.nextPageButton).toBeDisabled();
  });

  test("pagination resets when sort order changes", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    // Go to page 2
    await lib.clickNextPage();
    await expect(lib.getRow("Zenith Bloom")).toBeVisible();

    // Change sort to Target Policy
    await lib.clickSortColumn("Target Policy");

    // Should be back on page 1
    await expect(lib.prevPageButton).toBeDisabled();
  });
});

// ─── Sorting ────────────────────────────────────────────────────────────────

test.describe("Spells Library Tab — Sorting", () => {
  test("default sort order is by name ascending", async ({ gmPage, resetDb }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    // Alphabetically: Arcane Shield, Battle Cry, ...
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Arcane Shield");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Battle Cry");
  });

  test("sort by name descending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    // Click Name to toggle to descending
    await lib.clickSortColumn("Name");

    // Descending: Ignite, Holy Light, ...
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Zenith Bloom");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Rune Cascade");
  });

  test("sort by target policy ascending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    // Click Target Policy to sort ascending
    await lib.clickSortColumn("Target Policy");

    // PostgreSQL sorts enums by declaration order, not alphabetically
    // Enum order: highest_health, lowest_health, highest_damage, random
    // highest_health: Dark Pact, Fireball
    // Secondary sort by name asc within same policy
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Dark Pact");
  });

  test("sort by target policy descending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    // Click Target Policy twice: ascending then descending
    await lib.clickSortColumn("Target Policy");
    await lib.clickSortColumn("Target Policy");

    // random is last in enum declaration order, so first when descending
    // random: Battle Cry, Earthquake — secondary sort by name asc
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Battle Cry");
  });

  test("sort by updated at ascending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    // Click Updated At to sort ascending
    await lib.clickSortColumn("Updated At");

    // Oldest first: Fireball (Jan), Battle Cry (Feb), ...
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Fireball");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Battle Cry");
  });

  test("sort by updated at descending", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    // Click Updated At twice: ascending then descending
    await lib.clickSortColumn("Updated At");
    await lib.clickSortColumn("Updated At");

    // Newest first: Ignite (Nov), Holy Light (Oct), ...
    await expect(lib.rows.nth(0)).toHaveAttribute("aria-label", "Ignite");
    await expect(lib.rows.nth(1)).toHaveAttribute("aria-label", "Holy Light");
  });

  test("clicking the active sort column toggles direction", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    // Default: Name ascending — Arcane Shield first
    await expect(lib.rows.nth(0)).toHaveAttribute(
      "aria-label",
      "Arcane Shield",
    );

    // Click Name to toggle to descending
    await lib.clickSortColumn("Name");
    await expect(lib.rows.nth(0)).toHaveAttribute(
      "aria-label",
      "Zenith Bloom",
    );
  });
});

// ─── Selection ──────────────────────────────────────────────────────────────

test.describe("Spells Library Tab — Selection", () => {
  test("select a spell from the list via edit button", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    await lib.editEntity("Fireball");

    // Selected in list
    await expect(lib.getRow("Fireball")).toHaveAttribute("aria-selected", "true");

    // Loaded in workspace
    await expect(lib.nameInput).toHaveValue("Fireball");

    // URL updated
    await expect(gmPage).toHaveURL(new RegExp(`spell_id=${FIREBALL_ID}`));
  });
});

// ─── Effect Picker ───────────────────────────────────────────────────────────

test.describe("Spell Workspace — Effect Picker", () => {
  test("save stays blocked until at least one effect is linked", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();
    await gmPage.getByRole("button", { name: "New Spell" }).click();

    await lib.nameInput.fill("No Effect Spell");
    await gmPage.getByTestId("spell-target-policy-select").selectOption("random");

    await expect(gmPage.getByTestId("entity-save-button")).toBeDisabled();
    await expect(gmPage.getByText("At least one linked effect is required")).toBeVisible();
  });

  test("opening the effect picker shows at most five options and keeps the search prompt out of the list", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();
    await gmPage.getByRole("button", { name: "New Spell" }).click();

    await gmPage.getByTestId("spell-effect-picker").click();

    await expect(gmPage.getByTestId("spell-effect-picker-search")).toHaveAttribute(
      "placeholder",
      "Search effects...",
    );
    const pickerOptions = gmPage.locator('[role="listbox"] [role="option"]');
    await expect(pickerOptions).toHaveCount(5);
    await expect(gmPage.locator('[role="listbox"] [role="option"]', { hasText: "Search effects..." })).toHaveCount(0);
  });

  test("search narrows the effect picker results", async ({ gmPage }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();
    await gmPage.getByRole("button", { name: "New Spell" }).click();

    await gmPage.getByTestId("spell-effect-picker").click();
    await gmPage.getByTestId("spell-effect-picker-search").fill("tect");

    const pickerOptions = gmPage.locator('[role="listbox"] [role="option"]');
    await expect(pickerOptions).toHaveCount(1);
    await expect(gmPage.locator('[role="listbox"] [role="option"]', { hasText: "Tectonic Pulse" })).toBeVisible();
  });

  test("a searched effect can be added to a spell and persists after saving", async ({
    gmPage,
    resetDb,
  }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await resetDb();
    await lib.navigateToTab();
    await gmPage.getByRole("button", { name: "New Spell" }).click();

    await lib.nameInput.fill("Searchable Link Spell");
    await gmPage.getByTestId("spell-target-policy-select").selectOption("random");
    await gmPage.getByTestId("spell-effect-picker").click();
    await gmPage.getByTestId("spell-effect-picker-search").fill("tect");
    await gmPage.getByRole("option", { name: "Tectonic Pulse" }).click();
    await gmPage.getByTestId("spell-add-effect-button").click();

    await expect(gmPage.getByTestId("spell-effect-row-0")).toContainText("Tectonic Pulse");

    await gmPage.getByTestId("entity-save-button").click();
    await expect(gmPage).toHaveURL(/spell_id=/);

    await gmPage.reload();

    await expect(gmPage.getByTestId("spell-effect-row-0")).toContainText("Tectonic Pulse");
  });

  test("removing the final linked effect blocks saving until another is added", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateWithEntity(BATTLE_CRY_ID);

    await expect(gmPage.getByTestId("spell-effect-row-0")).toContainText("Barbarian Roar");

    await gmPage.getByTestId("spell-effect-remove-0").click();

    await expect(gmPage.getByTestId("entity-save-button")).toBeDisabled();
    await expect(gmPage.getByText("At least one linked effect is required")).toBeVisible();
  });
});

// ─── Unsaved Changes ────────────────────────────────────────────────────────

test.describe("Spells Library Tab — Unsaved Changes", () => {
  test("warn before opening a different spell with unsaved changes", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateWithEntity(FIREBALL_ID);
    await expect(lib.nameInput).toHaveValue("Fireball");

    // Make changes
    await lib.nameInput.fill("Fireball Updated");

    // Try to select Battle Cry via edit button
    await lib.editEntity("Battle Cry");

    // Dialog appears
    await expect(lib.unsavedChangesDialog).toBeVisible();

    // Cancel preserves state
    await lib.cancelUnsavedChanges();
    await expect(lib.unsavedChangesDialog).not.toBeVisible();
    await expect(lib.getRow("Fireball")).toHaveAttribute("aria-selected", "true");
    await expect(lib.nameInput).toHaveValue("Fireball Updated");
  });

  test("discard unsaved changes and open a different spell", async ({
    gmPage,
  }) => {
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateWithEntity(FIREBALL_ID);
    await expect(lib.nameInput).toHaveValue("Fireball");

    await lib.nameInput.fill("Fireball Updated");
    await lib.editEntity("Battle Cry");

    await expect(lib.unsavedChangesDialog).toBeVisible();
    await lib.discardUnsavedChanges();

    await expect(lib.nameInput).toHaveValue("Battle Cry");
    await expect(lib.getRow("Battle Cry")).toHaveAttribute("aria-selected", "true");
  });
});

// ─── Deletion (serial to prevent DB race conditions) ────────────────────────

test.describe.serial("Spells Library Tab — Deletion", () => {
  test("delete a spell that is not currently open", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();
    await lib.clickNextPage();
    await expect(lib.getRow("Zenith Bloom")).toBeVisible();

    await lib.clickDeleteOnRow("Zenith Bloom");

    // Confirmation dialog
    await expect(lib.deleteConfirmDialog).toBeVisible();

    // Confirm
    await lib.confirmDeletion();

    await expect(lib.getRow("Zenith Bloom")).not.toBeVisible();

    await expect(lib.idleState).toBeVisible();
  });

  test("cancel deletion of a spell", async ({ gmPage, resetDb }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    await lib.clickNextPage();

    await lib.clickDeleteOnRow("Zenith Bloom");

    await expect(lib.deleteConfirmDialog).toBeVisible();
    await lib.cancelDeletion();

    await expect(lib.getRow("Zenith Bloom")).toBeVisible();
  });

  test("cannot delete a spell that is linked to an item", async ({ gmPage, resetDb }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateWithEntity(FIREBALL_ID);
    await expect(lib.nameInput).toHaveValue("Fireball");

    await lib.clickDeleteOnRow("Fireball");

    await lib.confirmDeletion();

    await expect(lib.deleteConfirmDialog).toBeVisible();
    await expect(gmPage.getByText("Cannot delete spell while it is linked to one or more items.")).toBeVisible();
    await expect(lib.nameInput).toHaveValue("Fireball");
    expect(gmPage.url()).toContain(`spell_id=${FIREBALL_ID}`);

    await lib.cancelDeletion();
    await expect(lib.getRow("Fireball")).toBeVisible();
  });

  test("delete the currently open unlinked spell", async ({ gmPage, resetDb }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();
    await lib.clickNextPage();

    await lib.editEntity("Zenith Bloom");
    await expect(lib.nameInput).toHaveValue("Zenith Bloom");
    await expect(gmPage).toHaveURL(new RegExp(`spell_id=${ZENITH_BLOOM_ID}`));

    await lib.clickDeleteOnRow("Zenith Bloom");

    await lib.confirmDeletion();

    await expect(lib.getRow("Zenith Bloom")).not.toBeVisible();
    await expect(lib.idleState).toBeVisible();
    expect(gmPage.url()).not.toContain("spell_id");
  });

  test("deleting the last spell on a page returns to the previous page", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    const lib = new LibraryTabPage(gmPage, SPELLS_TAB);
    await lib.navigateToTab();

    // Verify we have 2 pages
    await expect(lib.rows).toHaveCount(20);

    // Go to page 2
    await lib.clickNextPage();

    // Only Zenith Bloom on page 2
    await expect(lib.getRow("Zenith Bloom")).toBeVisible();
    await expect(lib.rows).toHaveCount(1);

    // Delete it
    await lib.clickDeleteOnRow("Zenith Bloom");
    await lib.confirmDeletion();

    // Should be returned to page 1
    await expect(lib.prevPageButton).toBeDisabled();
    await expect(lib.getRow("Arcane Shield")).toBeVisible();
    await expect(lib.getRow("Zenith Bloom")).not.toBeVisible();

    // Restore DB for subsequent test files
    await resetDb();
  });
});
