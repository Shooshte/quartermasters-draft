import { test, expect } from "../db-reset.fixture";

// All tests in this file share the same database and some mutate it,
// so they must run serially to prevent race conditions.
test.describe.configure({ mode: "serial" });

const BARBARIAN_ROAR_ID = "a0000000-0000-0000-0000-000000000001";
const EXHAUST_ID = "a0000000-0000-0000-0000-000000000003";
const BASE = "/api/trpc";

/** Helper to delete an effect via the tRPC mutation API */
async function deleteEffectViaApi(
  request: import("@playwright/test").APIRequestContext,
  id: string,
) {
  return request.post(`${BASE}/scenarioBuilder.effects.delete`, {
    data: { json: { id } },
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Display ────────────────────────────────────────────────────────────────

test.describe("Effects Library Tab — Display", () => {
  test("effects are displayed with name, timing type, and effect type", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    const roar = gmPage.getByRole("row", { name: /Barbarian Roar/ });
    await expect(roar).toBeVisible();
    await expect(roar.getByText("instant")).toBeVisible();
    await expect(roar.getByText("buff")).toBeVisible();

    const exhaust = gmPage.getByRole("row", { name: /Exhaust/ });
    await expect(exhaust).toBeVisible();
    await expect(exhaust.getByText("instant")).toBeVisible();
    await expect(exhaust.getByText("debuff")).toBeVisible();
  });

  test("empty state is shown when no effects exist", async ({
    gmPage,
    resetDb,
  }) => {
    // Delete all 11 effects via API
    const effectIds = Array.from({ length: 11 }, (_, i) =>
      `a0000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
    );
    for (const id of effectIds) {
      await deleteEffectViaApi(gmPage.request, id);
    }

    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();
    await expect(gmPage.getByTestId("empty-list")).toBeVisible();

    // Restore DB for subsequent tests
    await resetDb();
  });
});

// ─── Pagination ─────────────────────────────────────────────────────────────

test.describe("Effects Library Tab — Pagination", () => {
  test("effects are displayed one page at a time with pagination controls", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    // Page 1 should show 10 items
    const rows = gmPage.locator('tr[aria-selected]');
    await expect(rows).toHaveCount(10);

    // Pagination controls visible
    await expect(gmPage.getByRole("button", { name: "Next page" })).toBeVisible();
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeVisible();
  });

  test("navigate to the next page", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    // First page: "Arcane Damage" visible (alphabetically first)
    await expect(gmPage.getByRole("row", { name: /Arcane Damage/ })).toBeVisible();

    await gmPage.getByRole("button", { name: "Next page" }).click();

    // Second page: only "Sizzling Flesh" (alphabetically last)
    await expect(gmPage.getByRole("row", { name: /Sizzling Flesh/ })).toBeVisible();
    // Arcane Damage should no longer be shown
    await expect(gmPage.getByRole("row", { name: /Arcane Damage/ })).not.toBeVisible();
  });

  test("navigate to previous page", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    // Go to page 2
    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("row", { name: /Sizzling Flesh/ })).toBeVisible();

    // Go back to page 1
    await gmPage.getByRole("button", { name: "Previous page" }).click();
    await expect(gmPage.getByRole("row", { name: /Arcane Damage/ })).toBeVisible();
  });

  test("Previous page control is disabled on the first page", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });

  test("Next page control is disabled on the last page", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  test("pagination resets when sort order changes", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    // Go to page 2
    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("row", { name: /Sizzling Flesh/ })).toBeVisible();

    // Change sort to Timing Type
    await gmPage.getByRole("button", { name: /Timing Type/ }).click();

    // Should be back on page 1
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });
});

// ─── Sorting ────────────────────────────────────────────────────────────────

test.describe("Effects Library Tab — Sorting", () => {
  test("default sort order is by name ascending", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    const first = await rows.nth(0).getAttribute("aria-label");
    const second = await rows.nth(1).getAttribute("aria-label");
    // Alphabetically: Arcane Damage, Bandage, ...
    expect(first).toBe("Arcane Damage");
    expect(second).toBe("Bandage");
  });

  test("sort by name descending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    // Click Name to toggle to descending
    await gmPage.getByRole("button", { name: /Name/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    const first = await rows.nth(0).getAttribute("aria-label");
    const second = await rows.nth(1).getAttribute("aria-label");
    // Descending: Sizzling Flesh, Rejuvenation, ...
    expect(first).toBe("Sizzling Flesh");
    expect(second).toBe("Rejuvenation");
  });

  test("sort by timing type ascending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    // Click Timing Type to sort ascending
    await gmPage.getByRole("button", { name: /Timing Type/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    const first = await rows.nth(0).getAttribute("aria-label");
    // instant sorts before interval alphabetically, first instant effect by name
    expect(first).toBe("Arcane Damage");
  });

  test("sort by timing type descending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    // Click Timing Type twice: ascending then descending
    await gmPage.getByRole("button", { name: /Timing Type/ }).click();
    await gmPage.getByRole("button", { name: /Timing Type/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    const first = await rows.nth(0).getAttribute("aria-label");
    // interval sorts after instant, so interval records appear first when descending
    expect(first).toBe("Bandage");
  });

  test("sort by effect type ascending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    // Click Effect Type to sort ascending
    await gmPage.getByRole("button", { name: /Effect Type/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    const first = await rows.nth(0).getAttribute("aria-label");
    const second = await rows.nth(1).getAttribute("aria-label");
    // buff < damage < debuff < healing alphabetically
    expect(first).toBe("Barbarian Roar");
    expect(second).toBe("Guardian Shield");
  });

  test("sort by effect type descending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    // Click Effect Type twice: ascending then descending
    await gmPage.getByRole("button", { name: /Effect Type/ }).click();
    await gmPage.getByRole("button", { name: /Effect Type/ }).click();

    const rows = gmPage.locator('tr[aria-selected]');
    const first = await rows.nth(0).getAttribute("aria-label");
    // damage is last in enum declaration order, so first when descending
    expect(first).toBe("Arcane Damage");
  });

  test("clicking the active sort column toggles direction", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    // Default: Name ascending — Arcane Damage first
    await expect(gmPage.locator('tr[aria-selected]').nth(0)).toHaveAttribute(
      "aria-label",
      "Arcane Damage",
    );

    // Click Name to toggle to descending
    await gmPage.getByRole("button", { name: /Name/ }).click();
    await expect(gmPage.locator('tr[aria-selected]').nth(0)).toHaveAttribute(
      "aria-label",
      "Sizzling Flesh",
    );
  });
});

// ─── Selection ──────────────────────────────────────────────────────────────

test.describe("Effects Library Tab — Selection", () => {
  test("select an effect from the list via edit button", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    const roarRow = gmPage.getByRole("row", { name: "Barbarian Roar" });
    await roarRow.getByRole("button", { name: /Edit/ }).click();

    // Selected in list
    await expect(
      gmPage.getByRole("row", { name: "Barbarian Roar" }),
    ).toHaveAttribute("aria-selected", "true");

    // Loaded in workspace
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Barbarian Roar",
    );

    // URL updated
    await expect(gmPage).toHaveURL(new RegExp(`effect_id=${BARBARIAN_ROAR_ID}`));
  });
});

// ─── Unsaved Changes ────────────────────────────────────────────────────────

test.describe("Effects Library Tab — Unsaved Changes", () => {
  test("warn before opening a different effect with unsaved changes", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?tab=Effects&effect_id=${BARBARIAN_ROAR_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Barbarian Roar",
    );

    // Make changes
    await gmPage.getByTestId("entity-name-input").fill("Barbarian Roar Updated");

    // Try to select Exhaust via edit button
    const exhaustRow = gmPage.getByRole("row", { name: "Exhaust" });
    await exhaustRow.getByRole("button", { name: /Edit/ }).click();

    // Dialog appears
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();

    // Cancel preserves state
    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).not.toBeVisible();
    await expect(
      gmPage.getByRole("row", { name: "Barbarian Roar" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Barbarian Roar Updated",
    );
  });

  test("discard unsaved changes and open a different effect", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?tab=Effects&effect_id=${BARBARIAN_ROAR_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Barbarian Roar",
    );

    await gmPage.getByTestId("entity-name-input").fill("Barbarian Roar Updated");
    const exhaustRow = gmPage.getByRole("row", { name: "Exhaust" });
    await exhaustRow.getByRole("button", { name: /Edit/ }).click();

    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();
    await gmPage.getByRole("button", { name: "Discard" }).click();

    await expect(
      gmPage.getByRole("row", { name: "Exhaust" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Exhaust",
    );
  });
});

// ─── Deletion (serial to prevent DB race conditions) ────────────────────────

test.describe.serial("Effects Library Tab — Deletion", () => {
  test("delete an effect that is not currently open", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();
    await expect(gmPage.getByRole("row", { name: "Exhaust" })).toBeVisible();

    // Click delete on Exhaust
    const exhaustRow = gmPage.getByRole("row", { name: "Exhaust" });
    await exhaustRow.getByRole("button", { name: /Delete/ }).click();

    // Confirmation dialog
    await expect(gmPage.getByTestId("delete-confirm-dialog")).toBeVisible();

    // Confirm
    await gmPage.getByRole("button", { name: "Delete" }).click();

    // Exhaust gone
    await expect(gmPage.getByRole("row", { name: "Exhaust" })).not.toBeVisible();

    // Workspace should remain idle
    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();
  });

  test("cancel deletion of an effect", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    const exhaustRow = gmPage.getByRole("row", { name: "Exhaust" });
    await exhaustRow.getByRole("button", { name: /Delete/ }).click();

    await expect(gmPage.getByTestId("delete-confirm-dialog")).toBeVisible();
    await gmPage.getByRole("button", { name: "Cancel" }).click();

    // Exhaust should still be visible
    await expect(gmPage.getByRole("row", { name: "Exhaust" })).toBeVisible();
  });

  test("delete the currently open effect", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?tab=Effects&effect_id=${BARBARIAN_ROAR_ID}`);
    await expect(gmPage.getByTestId("entity-name-input")).toHaveValue(
      "Barbarian Roar",
    );

    const roarRow = gmPage.getByRole("row", { name: "Barbarian Roar" });
    await roarRow.getByRole("button", { name: /Delete/ }).click();

    await gmPage.getByRole("button", { name: "Delete" }).click();

    // Should be gone from list
    await expect(gmPage.getByRole("row", { name: "Barbarian Roar" })).not.toBeVisible();

    // Workspace cleared
    await expect(gmPage.getByTestId("entity-idle")).toBeVisible();

    // URL should not contain effect_id
    expect(gmPage.url()).not.toContain("effect_id");
  });

  test("deleting the last effect on a page returns to the previous page", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Effects" }).click();

    // Verify we have 2 pages
    await expect(gmPage.locator('tr[aria-selected]')).toHaveCount(10);

    // Go to page 2
    await gmPage.getByRole("button", { name: "Next page" }).click();

    // Only Sizzling Flesh on page 2
    await expect(gmPage.getByRole("row", { name: /Sizzling Flesh/ })).toBeVisible();
    await expect(gmPage.locator('tr[aria-selected]')).toHaveCount(1);

    // Delete it
    const sizzlingRow = gmPage.getByRole("row", { name: /Sizzling Flesh/ });
    await sizzlingRow.getByRole("button", { name: /Delete/ }).click();
    await gmPage.getByRole("button", { name: "Delete" }).click();

    // Should be returned to page 1
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await expect(gmPage.getByRole("row", { name: /Arcane Damage/ })).toBeVisible();
    await expect(gmPage.getByRole("row", { name: /Sizzling Flesh/ })).not.toBeVisible();

    // Restore DB for subsequent test files
    await resetDb();
  });
});
