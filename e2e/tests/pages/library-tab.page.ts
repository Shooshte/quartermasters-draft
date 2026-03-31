/**
 * Page Object Model for library tab interactions on the /create page.
 *
 * All 5 entity library tabs (Effects, Spells, Items, Units, Scenarios) share
 * identical UI interaction patterns for pagination, sorting, selection,
 * unsaved changes, and deletion. This page object encapsulates those shared
 * interactions, parameterized by a LibraryTabConfig.
 */
import type { Locator, Page } from "@playwright/test";

export interface LibraryTabConfig {
  /** Tab label displayed in the UI (e.g. "Effects", "Scenarios") */
  tabName: string;
  /** tRPC entity namespace (e.g. "effects", "scenarios") */
  entityType: string;
  /** URL search param name for the entity ID (e.g. "effect_id", "scenario_id") */
  idParamName: string;
  /** Test ID for the entity name input (e.g. "entity-name-input" or "scenario-name-input") */
  nameInputTestId: string;
  /** Test ID for the idle/empty workspace state (e.g. "entity-idle" or "scenario-idle") */
  idleTestId: string;
}

export class LibraryTabPage {
  readonly page: Page;
  readonly config: LibraryTabConfig;

  constructor(page: Page, config: LibraryTabConfig) {
    this.page = page;
    this.config = config;
  }

  // ─── Navigation ──────────────────────────────────────────────────────────

  /** Navigate to /create and click the tab */
  async navigateToTab(): Promise<void> {
    await this.page.goto("/create");
    await this.page.getByRole("tab", { name: this.config.tabName }).click();
  }

  /** Navigate to /create with a specific entity loaded via URL param */
  async navigateWithEntity(entityId: string): Promise<void> {
    await this.page.goto(
      `/create?tab=${this.config.tabName}&${this.config.idParamName}=${entityId}`,
    );
  }

  // ─── Row Access ──────────────────────────────────────────────────────────

  /** Get a specific row by entity name */
  getRow(name: string): Locator {
    return this.page.getByRole("row", { name });
  }

  /** Get all selectable rows (tr[aria-selected]) */
  get rows(): Locator {
    return this.page.locator("tr[aria-selected]");
  }

  /** Get the empty list state element */
  get emptyList(): Locator {
    return this.page.getByTestId("empty-list");
  }

  // ─── Pagination ──────────────────────────────────────────────────────────

  /** Next page button locator */
  get nextPageButton(): Locator {
    return this.page.getByRole("button", { name: "Next page" });
  }

  /** Previous page button locator */
  get prevPageButton(): Locator {
    return this.page.getByRole("button", { name: "Previous page" });
  }

  /** Click the "Next page" button */
  async clickNextPage(): Promise<void> {
    await this.nextPageButton.click();
  }

  /** Click the "Previous page" button */
  async clickPrevPage(): Promise<void> {
    await this.prevPageButton.click();
  }

  // ─── Sorting ─────────────────────────────────────────────────────────────

  /** Click a sort column header button */
  async clickSortColumn(columnName: string): Promise<void> {
    await this.page.getByRole("button", { name: new RegExp(columnName) }).click();
  }

  // ─── Selection ───────────────────────────────────────────────────────────

  /** Click the edit button on a row to select/load the entity */
  async editEntity(entityName: string): Promise<void> {
    const row = this.getRow(entityName);
    await row.getByRole("button", { name: /Edit/ }).click();
  }

  // ─── Workspace Locators ──────────────────────────────────────────────────

  /** The name input in the workspace */
  get nameInput(): Locator {
    return this.page.getByTestId(this.config.nameInputTestId);
  }

  /** The idle/empty workspace state */
  get idleState(): Locator {
    return this.page.getByTestId(this.config.idleTestId);
  }

  // ─── Unsaved Changes Dialog ──────────────────────────────────────────────

  /** The unsaved changes dialog locator */
  get unsavedChangesDialog(): Locator {
    return this.page.getByTestId("unsaved-changes-dialog");
  }

  /** Click Cancel in the unsaved changes dialog */
  async cancelUnsavedChanges(): Promise<void> {
    await this.page.getByRole("button", { name: "Cancel" }).click();
  }

  /** Click Discard in the unsaved changes dialog */
  async discardUnsavedChanges(): Promise<void> {
    await this.page.getByRole("button", { name: "Discard" }).click();
  }

  // ─── Deletion ────────────────────────────────────────────────────────────

  /** Click the delete button on a row */
  async clickDeleteOnRow(entityName: string): Promise<void> {
    const row = this.getRow(entityName);
    await row.getByRole("button", { name: /Delete/ }).click();
  }

  /** The delete confirmation dialog locator */
  get deleteConfirmDialog(): Locator {
    return this.page.getByTestId("delete-confirm-dialog");
  }

  /** Confirm deletion in the dialog */
  async confirmDeletion(): Promise<void> {
    await this.page.getByRole("button", { name: "Delete" }).click();
  }

  /** Cancel deletion in the dialog */
  async cancelDeletion(): Promise<void> {
    await this.page.getByRole("button", { name: "Cancel" }).click();
  }
}
