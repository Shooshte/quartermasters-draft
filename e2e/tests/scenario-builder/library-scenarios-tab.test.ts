import { test, expect } from "../db-reset.fixture";

// All tests in this file share the same database and some mutate it,
// so they must run serially to prevent race conditions.
test.describe.configure({ mode: "serial" });

const AMBUSH_AT_DAWN_ID = "a2000000-0000-0000-0000-000000000001";
const CASTLE_SIEGE_ID = "a2000000-0000-0000-0000-000000000002";
const BASE = "/api/trpc";

/** Helper to delete a scenario via the tRPC mutation API */
async function deleteScenarioViaApi(
  request: import("@playwright/test").APIRequestContext,
  id: string,
) {
  return request.post(`${BASE}/scenarioBuilder.scenarios.delete`, {
    data: { json: { id } },
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Display ────────────────────────────────────────────────────────────────

test.describe("Scenarios Library Tab — Display", () => {
  test("scenarios are displayed with name and last update date", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();

    const ambush = gmPage.getByRole("row", { name: /Ambush at Dawn/ });
    await expect(ambush).toBeVisible();
    // Verify last update date is displayed (e.g. "Apr 1, 2025")
    await expect(ambush.getByText(/\w{3}\s+\d{1,2},\s+\d{4}/)).toBeVisible();

    const castle = gmPage.getByRole("row", { name: /Castle Siege/ });
    await expect(castle).toBeVisible();
    // Verify last update date is displayed (e.g. "May 1, 2025")
    await expect(castle.getByText(/\w{3}\s+\d{1,2},\s+\d{4}/)).toBeVisible();
  });

  test("empty state is shown when no scenarios exist", async ({
    gmPage,
    resetDb,
  }) => {
    // Delete all 21 scenarios via API
    const scenarioIds = Array.from({ length: 21 }, (_, i) =>
      `a2000000-0000-0000-0000-${String(i + 1).padStart(12, "0")}`,
    );
    for (const id of scenarioIds) {
      await deleteScenarioViaApi(gmPage.request, id);
    }

    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();
    await expect(gmPage.getByTestId("empty-list")).toBeVisible();

    // Restore DB for subsequent tests
    await resetDb();
  });
});

// ─── Pagination ─────────────────────────────────────────────────────────────

test.describe("Scenarios Library Tab — Pagination", () => {
  test("scenarios are displayed one page at a time with pagination controls", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();

    // Page 1 should show 20 items
    const options = gmPage.locator('tr[aria-selected]');
    await expect(options).toHaveCount(20);

    // Pagination controls visible
    await expect(gmPage.getByRole("button", { name: "Next page" })).toBeVisible();
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeVisible();
  });

  test("navigate to the next page", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();

    // First page: "Ambush at Dawn" visible
    await expect(gmPage.getByRole("row", { name: /Ambush at Dawn/ })).toBeVisible();

    await gmPage.getByRole("button", { name: "Next page" }).click();

    // Second page: only "Zorath Keep" (alphabetically last)
    await expect(gmPage.getByRole("row", { name: /Zorath Keep/ })).toBeVisible();
    // Ambush at Dawn should no longer be shown
    await expect(gmPage.getByRole("row", { name: /Ambush at Dawn/ })).not.toBeVisible();
  });

  test("navigate to previous page", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();

    // Go to page 2
    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("row", { name: /Zorath Keep/ })).toBeVisible();

    // Go back to page 1
    await gmPage.getByRole("button", { name: "Previous page" }).click();
    await expect(gmPage.getByRole("row", { name: /Ambush at Dawn/ })).toBeVisible();
  });

  test("Previous page control is disabled on the first page", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });

  test("Next page control is disabled on the last page", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();

    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  test("pagination resets when sort order changes", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();

    // Go to page 2
    await gmPage.getByRole("button", { name: "Next page" }).click();
    await expect(gmPage.getByRole("row", { name: /Zorath Keep/ })).toBeVisible();

    // Change sort to Last Update
    await gmPage.getByRole("button", { name: /Last Update/ }).click();

    // Should be back on page 1
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });
});

// ─── Sorting ────────────────────────────────────────────────────────────────

test.describe("Scenarios Library Tab — Sorting", () => {
  test("default sort order is by name ascending", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();

    const options = gmPage.locator('tr[aria-selected]');
    await expect(options.nth(0)).toHaveAttribute("aria-label", "Ambush at Dawn");
    await expect(options.nth(1)).toHaveAttribute("aria-label", "Bridge Defense");
  });

  test("sort by name descending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();

    // Click Name to toggle to descending
    await gmPage.getByRole("button", { name: /Name/ }).click();

    const options = gmPage.locator('tr[aria-selected]');
    // Descending: Zombie Horde, Jungle Trek, ...
    await expect(options.nth(0)).toHaveAttribute("aria-label", "Zorath Keep");
    await expect(options.nth(1)).toHaveAttribute("aria-label", "Zombie Horde");
  });

  test("sort by last update date ascending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();

    // Click Last Update to sort by updatedAt ascending
    await gmPage.getByRole("button", { name: /Last Update/ }).click();

    const options = gmPage.locator('tr[aria-selected]');
    // Oldest first: Ambush at Dawn (2025-04), Castle Siege (2025-05), Zombie Horde (2025-06)
    await expect(options.nth(0)).toHaveAttribute("aria-label", "Ambush at Dawn");
    await expect(options.nth(1)).toHaveAttribute("aria-label", "Castle Siege");
    await expect(options.nth(2)).toHaveAttribute("aria-label", "Zombie Horde");
  });

  test("sort by last update date descending", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();

    // Click Last Update to sort ascending, then click again for descending
    await gmPage.getByRole("button", { name: /Last Update/ }).click();
    await gmPage.getByRole("button", { name: /Last Update/ }).click();

    const options = gmPage.locator('tr[aria-selected]');
    // Newest first: Jungle Trek (2026-02), Ice Cavern (2026-01)
    await expect(options.nth(0)).toHaveAttribute("aria-label", "Jungle Trek");
    await expect(options.nth(1)).toHaveAttribute("aria-label", "Ice Cavern");
  });

  test("clicking the active sort column toggles direction", async ({
    gmPage,
  }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();

    // Default: Name ascending — Ambush at Dawn first
    await expect(gmPage.locator('tr[aria-selected]').nth(0)).toHaveAttribute(
      "aria-label",
      "Ambush at Dawn",
    );

    // Click Name to toggle to descending
    await gmPage.getByRole("button", { name: /Name/ }).click();
    await expect(gmPage.locator('tr[aria-selected]').nth(0)).toHaveAttribute(
      "aria-label",
      "Zorath Keep",
    );
  });
});

// ─── Selection ──────────────────────────────────────────────────────────────

test.describe("Scenarios Library Tab — Selection", () => {
  test("select a scenario from the list via edit button", async ({ gmPage }) => {
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();

    const ambushRow = gmPage.getByRole("row", { name: "Ambush at Dawn" });
    await ambushRow.getByRole("button", { name: /Edit/ }).click();

    // Selected in list
    await expect(
      gmPage.getByRole("row", { name: "Ambush at Dawn" }),
    ).toHaveAttribute("aria-selected", "true");

    // Loaded in workspace
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn",
    );

    // URL updated
    await expect(gmPage).toHaveURL(new RegExp(`scenario_id=${AMBUSH_AT_DAWN_ID}`));
  });
});

// ─── Unsaved Changes ────────────────────────────────────────────────────────

test.describe("Scenarios Library Tab — Unsaved Changes", () => {
  test("warn before opening a different scenario with unsaved changes", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn",
    );

    // Make changes
    await gmPage.getByTestId("scenario-name-input").fill("Ambush at Dawn Updated");

    // Try to select Castle Siege via edit button
    const castleRow = gmPage.getByRole("row", { name: "Castle Siege" });
    await castleRow.getByRole("button", { name: /Edit/ }).click();

    // Dialog appears
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();

    // Cancel preserves state
    await gmPage.getByRole("button", { name: "Cancel" }).click();
    await expect(gmPage.getByTestId("unsaved-changes-dialog")).not.toBeVisible();
    await expect(
      gmPage.getByRole("row", { name: "Ambush at Dawn" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn Updated",
    );
  });

  test("discard unsaved changes and open a different scenario", async ({
    gmPage,
  }) => {
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn",
    );

    await gmPage.getByTestId("scenario-name-input").fill("Ambush at Dawn Updated");
    const castleRow2 = gmPage.getByRole("row", { name: "Castle Siege" });
    await castleRow2.getByRole("button", { name: /Edit/ }).click();

    await expect(gmPage.getByTestId("unsaved-changes-dialog")).toBeVisible();
    await gmPage.getByRole("button", { name: "Discard" }).click();

    await expect(
      gmPage.getByRole("row", { name: "Castle Siege" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Castle Siege",
    );
  });
});

// ─── Deletion (serial to prevent DB race conditions) ────────────────────────

test.describe.serial("Scenarios Library Tab — Deletion", () => {
  test("delete a scenario that is not currently open", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();
    await expect(gmPage.getByRole("row", { name: "Castle Siege" })).toBeVisible();

    // Click delete on Castle Siege
    const castleRow = gmPage.getByRole("row", { name: "Castle Siege" });
    await castleRow.getByRole("button", { name: /Delete/ }).click();

    // Confirmation dialog
    await expect(gmPage.getByTestId("delete-confirm-dialog")).toBeVisible();

    // Confirm
    await gmPage.getByRole("button", { name: "Delete" }).click();

    // Castle Siege gone
    await expect(gmPage.getByRole("row", { name: "Castle Siege" })).not.toBeVisible();

    // Workspace should remain idle
    await expect(gmPage.getByTestId("scenario-idle")).toBeVisible();
  });

  test("cancel deletion of a scenario", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();

    const castleRow = gmPage.getByRole("row", { name: "Castle Siege" });
    await castleRow.getByRole("button", { name: /Delete/ }).click();

    await expect(gmPage.getByTestId("delete-confirm-dialog")).toBeVisible();
    await gmPage.getByRole("button", { name: "Cancel" }).click();

    // Castle Siege should still be visible
    await expect(gmPage.getByRole("row", { name: "Castle Siege" })).toBeVisible();
  });

  test("delete the currently open scenario", async ({ gmPage, resetDb }) => {
    await resetDb();
    await gmPage.goto(`/create?scenario_id=${AMBUSH_AT_DAWN_ID}`);
    await expect(gmPage.getByTestId("scenario-name-input")).toHaveValue(
      "Ambush at Dawn",
    );

    const ambushRow = gmPage.getByRole("row", { name: "Ambush at Dawn" });
    await ambushRow.getByRole("button", { name: /Delete/ }).click();

    await gmPage.getByRole("button", { name: "Delete" }).click();

    // Should be gone from list
    await expect(gmPage.getByRole("row", { name: "Ambush at Dawn" })).not.toBeVisible();

    // Workspace cleared
    await expect(gmPage.getByTestId("scenario-idle")).toBeVisible();

    // URL should not contain scenario_id
    expect(gmPage.url()).not.toContain("scenario_id");
  });

  test("deleting the last scenario on a page returns to the previous page", async ({
    gmPage,
    resetDb,
  }) => {
    await resetDb();
    await gmPage.goto("/create");
    await gmPage.getByRole("tab", { name: "Scenarios" }).click();

    // Verify we have 2 pages
    await expect(gmPage.locator('tr[aria-selected]')).toHaveCount(20);

    // Go to page 2
    await gmPage.getByRole("button", { name: "Next page" }).click();

    // Only Zorath Keep on page 2
    await expect(gmPage.getByRole("row", { name: /Zorath Keep/ })).toBeVisible();
    await expect(gmPage.locator('tr[aria-selected]')).toHaveCount(1);

    // Delete it
    const zorathRow = gmPage.getByRole("row", { name: /Zorath Keep/ });
    await zorathRow.getByRole("button", { name: /Delete/ }).click();
    await gmPage.getByRole("button", { name: "Delete" }).click();

    // Should be returned to page 1
    await expect(gmPage.getByRole("button", { name: "Previous page" })).toBeDisabled();
    await expect(gmPage.getByRole("row", { name: /Ambush at Dawn/ })).toBeVisible();
    await expect(gmPage.getByRole("row", { name: /Zorath Keep/ })).not.toBeVisible();

    // Restore DB for subsequent test files
    await resetDb();
  });
});
