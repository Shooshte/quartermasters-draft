import { test, expect } from "../db-reset.fixture";

// All tests in this file share the same database and some mutate it,
// so they must run serially to prevent race conditions.
test.describe.configure({ mode: "serial" });

const FIREBALL_ID = "b0000000-0000-0000-0000-000000000001";
const BATTLE_CRY_ID = "b0000000-0000-0000-0000-000000000002";
const ZENITH_BLOOM_ID = "b0000000-0000-0000-0000-000000000021";
const BASE = "/api/trpc";

async function parseTrpcResponse(
  response: Awaited<ReturnType<import("@playwright/test").APIRequestContext["get"]>>,
) {
  const body = await response.json();
  return body.result.data.json;
}

/** Helper to delete a spell via the tRPC mutation API */
async function deleteSpellViaApi(
  request: import("@playwright/test").APIRequestContext,
  id: string,
) {
  return request.post(`${BASE}/scenarioBuilder.spells.delete`, {
    data: { json: { id } },
    headers: { "Content-Type": "application/json" },
  });
}

async function listSpellIdsViaApi(
  request: import("@playwright/test").APIRequestContext,
) {
  const input = encodeURIComponent(JSON.stringify({
    json: {
      page: 1,
      limit: 500,
      sortBy: "name",
      sortDir: "asc",
    },
  }));
  const response = await request.get(`${BASE}/scenarioBuilder.spells.list?input=${input}`);
  expect(response.ok()).toBeTruthy();
  const data = await parseTrpcResponse(response);
  return data.items.map((item: { id: string }) => item.id);
}

async function listItemIdsViaApi(
  request: import("@playwright/test").APIRequestContext,
) {
  const input = encodeURIComponent(JSON.stringify({
    json: {
      page: 1,
      limit: 500,
      sortBy: "name",
      sortDir: "asc",
    },
  }));
  const response = await request.get(`${BASE}/scenarioBuilder.items.list?input=${input}`);
  expect(response.ok()).toBeTruthy();
  const data = await parseTrpcResponse(response);
  return data.items.map((item: { id: string }) => item.id);
}

async function deleteItemViaApi(
  request: import("@playwright/test").APIRequestContext,
  id: string,
) {
  return request.post(`${BASE}/scenarioBuilder.items.delete`, {
    data: { json: { id } },
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Display ────────────────────────────────────────────────────────────────

test.describe("Spells Library Tab — Display", () => {
  test("spells are displayed with name, description, target policy, and updated at", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    const fireball = gmPage.getByRole("row", { name: /Fireball/ });
    await expect(fireball).toBeVisible();
    await expect(fireball.getByText("highest_health")).toBeVisible();
    // Verify updated_at date is displayed (locale-dependent format)
    await expect(fireball.locator("td").nth(2)).not.toBeEmpty();

    const healingTouch = gmPage.getByRole("row", { name: /Healing Touch/ });
    await expect(healingTouch).toBeVisible();
    await expect(healingTouch.getByText("lowest_health")).toBeVisible();
    // Verify updated_at date is displayed (locale-dependent format)
    await expect(healingTouch.locator("td").nth(2)).not.toBeEmpty();
  });

  test("empty state is shown when no spells exist", async ({
    gmPage,
    resetDb,
  }) => {
    try {
      await resetDb();

      const itemIds = await listItemIdsViaApi(gmPage.request);
      for (const id of itemIds) {
        const response = await deleteItemViaApi(gmPage.request, id);
        expect(response.ok()).toBeTruthy();
      }

      const spellIds = await listSpellIdsViaApi(gmPage.request);
      for (const id of spellIds) {
        const response = await deleteSpellViaApi(gmPage.request, id);
        expect(response.ok()).toBeTruthy();
      }

      await gmPage.goto("/create");
      await gmPage.getByRole("tab", { name: "Spells" }).click();
      await expect(gmPage.getByTestId("empty-list")).toBeVisible();
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
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    // Page 1 should show 20 items
    const rows = gmPage.locator('tr[aria-selected]');
    await expect(rows).toHaveCount(20);

    // Pagination controls visible
    await expect(gmPage.getByRole("button", { name: "Next page" })).toBeVisible();
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeVisible();
  });

  test("navigate to the next page", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    // First page: "Arcane Shield" visible (alphabetically first)
    await expect(gmPage.getByRole("row", { name: /Arcane Shield/ })).toBeVisible();

    await gmPage.getByRole("button", { name: "Next page" }).click();

    // Second page: only "Zenith Bloom" (alphabetically last)
    await expect(gmPage.getByRole("row", { name: /Zenith Bloom/ })).toBeVisible();
    // Arcane Shield should no longer be shown
    await expect(gmPage.getByRole("row", { name: /Arcane Shield/ })).not.toBeVisible();
  });

  test("navigate to previous page", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    // Go to page 2
    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("row", { name: /Zenith Bloom/ })).toBeVisible();

    // Go back to page 1
    await gmPage.getByRole("button", { name: "Previous page" }).click();
    await expect(gmPage.getByRole("row", { name: /Arcane Shield/ })).toBeVisible();
  });

  test("Previous page control is disabled on the first page", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });

  test("Next page control is disabled on the last page", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  test("pagination resets when sort order changes", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    // Go to page 2
    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("row", { name: /Zenith Bloom/ })).toBeVisible();

    // Change sort to Target Policy
    await gmPage.getByRole("button", { name: /Target Policy/ }).click();

    // Should be back on page 1
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });
});

// ─── Sorting ────────────────────────────────────────────────────────────────

test.describe("Spells Library Tab — Sorting", () => {
  test("default sort order is by name ascending", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    // Alphabetically: Arcane Shield, Battle Cry, ...
    await expect(rows.nth(0)).toHaveAttribute("aria-label", "Arcane Shield");
    await expect(rows.nth(1)).toHaveAttribute("aria-label", "Battle Cry");
  });

  test("sort by name descending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    // Click Name to toggle to descending
    await gmPage.getByRole("button", { name: /Name/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    // Descending: Ignite, Holy Light, ...
    await expect(rows.nth(0)).toHaveAttribute("aria-label", "Zenith Bloom");
    await expect(rows.nth(1)).toHaveAttribute("aria-label", "Rune Cascade");
  });

  test("sort by target policy ascending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    // Click Target Policy to sort ascending
    await gmPage.getByRole("button", { name: /Target Policy/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    // PostgreSQL sorts enums by declaration order, not alphabetically
    // Enum order: highest_health, lowest_health, highest_damage, random
    // highest_health: Dark Pact, Fireball
    // Secondary sort by name asc within same policy
    await expect(rows.nth(0)).toHaveAttribute("aria-label", "Dark Pact");
  });

  test("sort by target policy descending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    // Click Target Policy twice: ascending then descending
    await gmPage.getByRole("button", { name: /Target Policy/ }).click();
    await gmPage.getByRole("button", { name: /Target Policy/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    // random is last in enum declaration order, so first when descending
    // random: Battle Cry, Earthquake — secondary sort by name asc
    await expect(rows.nth(0)).toHaveAttribute("aria-label", "Battle Cry");
  });

  test("sort by updated at ascending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    // Click Updated At to sort ascending
    await gmPage.getByRole("button", { name: /Updated At/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    // Oldest first: Fireball (Jan), Battle Cry (Feb), ...
    await expect(rows.nth(0)).toHaveAttribute("aria-label", "Fireball");
    await expect(rows.nth(1)).toHaveAttribute("aria-label", "Battle Cry");
  });

  test("sort by updated at descending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    // Click Updated At twice: ascending then descending
    await gmPage.getByRole("button", { name: /Updated At/ }).click();
    await gmPage.getByRole("button", { name: /Updated At/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    // Newest first: Ignite (Nov), Holy Light (Oct), ...
    await expect(rows.nth(0)).toHaveAttribute("aria-label", "Ignite");
    await expect(rows.nth(1)).toHaveAttribute("aria-label", "Holy Light");
  });

  test("clicking the active sort column toggles direction", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    // Default: Name ascending — Arcane Shield first
    await expect(gmPage.locator('tr[aria-selected]').nth(0)).toHaveAttribute(
      "aria-label",
      "Arcane Shield",
    );

    // Click Name to toggle to descending
    await gmPage.getByRole("button", { name: /Name/ }).click();
    await expect(gmPage.locator('tr[aria-selected]').nth(0)).toHaveAttribute(
      "aria-label",
      "Zenith Bloom",
    );
  });
});

// ─── Selection ──────────────────────────────────────────────────────────────

test.describe("Spells Library Tab — Selection", () => {
  test("select a spell from the list via edit button", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    const fireballRow = gmPage.getByRole("row", { name: "Fireball" });
    await fireballRow.getByRole("button", { name: /Edit/ }).click();

    // Selected in list
    await expect(
      gmPage.getByRole("row", { name: "Fireball" }),
    ).toHaveAttribute("aria-selected", "true");

    // Loaded in workspace
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );

    // URL updated
    await expect(gmPage).toHaveURL(new RegExp(`spell_id=${FIREBALL_ID}`));
  });
});

// ─── Effect Picker ───────────────────────────────────────────────────────────

test.describe("Spell Workspace — Effect Picker", () => {
  test("save stays blocked until at least one effect is linked", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();
    await gmPage.getByRole("button", { name: "New Spell" }).click();

    await gmPage.getByTestId("entity-name-input").fill("No Effect Spell");
    await gmPage.getByTestId("spell-target-policy-select").selectOption("random");

    await expect(gmPage.getByTestId("entity-save-button")).toBeDisabled();
    await expect(gmPage.getByText("At least one linked effect is required")).toBeVisible();
  });

  test("opening the effect picker shows at most five options and keeps the search prompt out of the list", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();
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
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();
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
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();
    await gmPage.getByRole("button", { name: "New Spell" }).click();

    await gmPage.getByTestId("entity-name-input").fill("Searchable Link Spell");
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
    await gmPage.goto(`/create?tab=Spells&spell_id=${BATTLE_CRY_ID}`);

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
    await gmPage.goto(`/create?tab=Spells&spell_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );

    // Make changes
    await gmPage.getByTestId("entity-name-input").fill("Fireball Updated");

    // Try to select Battle Cry via edit button
    const battleCryRow = gmPage.getByRole("row", { name: "Battle Cry" });
    await battleCryRow.getByRole("button", { name: /Edit/ }).click();

    // Dialog appears
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();

    // Cancel preserves state
    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).not.toBeVisible();
    await expect(
      gmPage.getByRole("row", { name: "Fireball" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball Updated",
    );
  });

  test("discard unsaved changes and open a different spell", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?tab=Spells&spell_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );

    await gmPage.getByTestId("entity-name-input").fill("Fireball Updated");
    const battleCryRow = gmPage.getByRole("row", { name: "Battle Cry" });
    await battleCryRow.getByRole("button", { name: /Edit/ }).click();

    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();
    await gmPage.getByRole("button", { name: "Discard" }).click();

    await expect(
      gmPage.getByRole("row", { name: "Battle Cry" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Battle Cry",
    );
  });
});

// ─── Deletion (serial to prevent DB race conditions) ────────────────────────

test.describe.serial("Spells Library Tab — Deletion", () => {
  test("delete a spell that is not currently open", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();
    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("row", { name: "Zenith Bloom" })).toBeVisible();

    const zenithBloomRow = gmPage.getByRole("row", { name: "Zenith Bloom" });
    await zenithBloomRow.getByRole("button", { name: /Delete/ }).click();

    // Confirmation dialog
    await expect(gmPage.getByTestId("delete-confirm-dialog")).toBeVisible();

    // Confirm
    await gmPage.getByRole("button", { name: "Delete" }).click();

    await expect(gmPage.getByRole("row", { name: "Zenith Bloom" })).not.toBeVisible();

    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();
  });

  test("cancel deletion of a spell", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    await gmPage.getByRole("button", { name: "Next page" }).click();

    const zenithBloomRow = gmPage.getByRole("row", { name: "Zenith Bloom" });
    await zenithBloomRow.getByRole("button", { name: /Delete/ }).click();

    await expect(gmPage.getByTestId("delete-confirm-dialog")).toBeVisible();
    await gmPage.getByRole("button", { name: "Cancel" }).click();

    await expect(gmPage.getByRole("row", { name: "Zenith Bloom" })).toBeVisible();
  });

  test("cannot delete a spell that is linked to an item", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?tab=Spells&spell_id=${FIREBALL_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Fireball",
    );

    const fireballRow = gmPage.getByRole("row", { name: "Fireball" });
    await fireballRow.getByRole("button", { name: /Delete/ }).click();

    await gmPage.getByRole("button", { name: "Delete" }).click();

    await expect(gmPage.getByTestId("delete-confirm-dialog")).toBeVisible();
    await expect(gmPage.getByText("Cannot delete spell while it is linked to one or more items.")).toBeVisible();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Fireball");
    expect(gmPage.url()).toContain(`spell_id=${FIREBALL_ID}`);

    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByRole("row", { name: "Fireball" })).toBeVisible();
  });

  test("delete the currently open unlinked spell", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();
    await gmPage.getByRole("button", { name: "Next page" }).click();

    const zenithBloomRow = gmPage.getByRole("row", { name: "Zenith Bloom" });
    await zenithBloomRow.getByRole("button", { name: /Edit/ }).click();
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue("Zenith Bloom");
    await expect(gmPage).toHaveURL(new RegExp(`spell_id=${ZENITH_BLOOM_ID}`));

    await zenithBloomRow.getByRole("button", { name: /Delete/ }).click();

    await gmPage.getByRole("button", { name: "Delete" }).click();

    await expect(gmPage.getByRole("row", { name: "Zenith Bloom" })).not.toBeVisible();
    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();
    expect(gmPage.url()).not.toContain("spell_id");
  });

  test("deleting the last spell on a page returns to the previous page", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Spells" }).click();

    // Verify we have 2 pages
    await expect(gmPage.locator('tr[aria-selected]')).toHaveCount(20);

    // Go to page 2
    await gmPage.getByRole("button", { name: "Next page" }).click();

    // Only Zenith Bloom on page 2
    await expect(gmPage.getByRole("row", { name: /Zenith Bloom/ })).toBeVisible();
    await expect(gmPage.locator('tr[aria-selected]')).toHaveCount(1);

    // Delete it
    const zenithBloomRow = gmPage.getByRole("row", { name: /Zenith Bloom/ });
    await zenithBloomRow.getByRole("button", { name: /Delete/ }).click();
    await gmPage.getByRole("button", { name: "Delete" }).click();

    // Should be returned to page 1
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await expect(gmPage.getByRole("row", { name: /Arcane Shield/ })).toBeVisible();
    await expect(gmPage.getByRole("row", { name: /Zenith Bloom/ })).not.toBeVisible();

    // Restore DB for subsequent test files
    await resetDb();
  });
});
