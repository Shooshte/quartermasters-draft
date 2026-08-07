import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { UnitFormValues } from "~/components/create/unit-form";
import { UnitWorkspaceForm } from "~/components/create/unit-workspace-form";

const defaultFormValues: UnitFormValues = {
  name: "",
  meleeDmg: "0",
  health: "0",
  mana: "100",
  rangedDmg: "0",
  manaRegen: "0",
  spellDmg: "0",
  speed: "0",
  dodge: "0",
  criticalChance: "0",
  itemIds: [],
  targetScope: "enemies",
  targetPriority: "highest_health",
  targetCount: 1,
  selectionShape: "individual",
};

const sampleItemOptions = [
  { id: "it-1", name: "Iron Sword" },
  { id: "it-2", name: "Oak Staff" },
  { id: "it-3", name: "Leather Shield" },
  { id: "it-4", name: "Arcane Charm" },
  { id: "it-5", name: "Battle Helm" },
  { id: "it-6", name: "Rune Dagger" },
];

function renderForm(
  overrides: {
    formValues?: Partial<UnitFormValues>;
    itemOptions?: typeof sampleItemOptions;
    onFieldChange?: (field: string, value: unknown) => void;
    onSave?: () => void;
    onEditItem?: (itemId: string) => void;
    isSaving?: boolean;
    saveError?: string | null;
    mode?: "create" | "edit";
  } = {},
) {
  const props = {
    mode: overrides.mode ?? "create",
    formValues: { ...defaultFormValues, ...overrides.formValues } as UnitFormValues,
    itemOptions: overrides.itemOptions ?? sampleItemOptions,
    onFieldChange: overrides.onFieldChange ?? vi.fn(),
    onSave: overrides.onSave ?? vi.fn(),
    onEditItem: overrides.onEditItem ?? vi.fn(),
    isSaving: overrides.isSaving ?? false,
    saveError: overrides.saveError ?? null,
  };

  return { ...render(<UnitWorkspaceForm {...props} />), props };
}

describe("UnitWorkspaceForm", () => {
  it("renders all unit sections and fields", () => {
    renderForm();

    expect(screen.getByText("Linked Items")).toBeInTheDocument();
    expect(screen.getByText("Targeting")).toBeInTheDocument();
    expect(screen.getByText("Combat Stats")).toBeInTheDocument();
    expect(screen.getByText("Vital Stats")).toBeInTheDocument();
    expect(screen.getByTestId("unit-item-picker")).toBeInTheDocument();
    expect(screen.getByTestId("unit-meleeDmg-input")).toBeInTheDocument();
    expect(screen.getByTestId("unit-health-input")).toBeInTheDocument();
    expect(screen.getByTestId("unit-mana-input")).toBeInTheDocument();
    expect(screen.getByTestId("unit-target-scope-select")).toHaveValue("enemies");
    expect(screen.getByTestId("unit-target-priority-select")).toHaveValue("highest_health");
    expect(screen.getByTestId("entity-save-button")).toHaveTextContent("Create Unit");
  });

  it("disables save when the name is missing", () => {
    renderForm();

    expect(screen.getByTestId("entity-save-button")).toBeDisabled();
  });

  it("enables save when a valid name is present even without linked items", () => {
    renderForm({
      formValues: { name: "Bronze Sentinel", itemIds: [] },
    });

    expect(screen.getByTestId("entity-save-button")).toBeEnabled();
  });

  it("adds a linked item through the picker", async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();
    renderForm({ onFieldChange, formValues: { name: "Iron Vanguard" } });

    await user.click(screen.getByTestId("unit-item-picker"));
    await user.click(screen.getByTestId("unit-item-picker-option-it-1"));
    await user.click(screen.getByTestId("unit-add-item-button"));

    expect(onFieldChange).toHaveBeenCalledWith("itemIds", ["it-1"]);
  });

  it("allows duplicate linked items", async () => {
    const user = userEvent.setup();
    renderForm({
      formValues: { name: "Twinblade Adept", itemIds: ["it-1"] },
    });

    await user.click(screen.getByTestId("unit-item-picker"));

    expect(screen.getByTestId("unit-item-picker-option-it-1")).toBeInTheDocument();
    expect(screen.getByTestId("unit-item-picker-option-it-2")).toBeInTheDocument();
  });

  it("limits the visible picker options to five and uses the search prompt only as a placeholder", async () => {
    const user = userEvent.setup();
    renderForm({ formValues: { name: "Field Captain" } });

    await user.click(screen.getByTestId("unit-item-picker"));

    const listbox = screen.getByRole("listbox", { name: "Unit item options" });
    expect(within(listbox).getAllByRole("option")).toHaveLength(5);
    expect(screen.getByTestId("unit-item-picker-search")).toHaveAttribute(
      "placeholder",
      "Search items...",
    );
    expect(screen.queryByRole("option", { name: "Search items..." })).not.toBeInTheDocument();
  });

  it("calls onFieldChange when a numeric field changes", async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();
    renderForm({ onFieldChange, formValues: { name: "Storm Lancer" } });

    await user.type(screen.getByTestId("unit-health-input"), "5");

    expect(onFieldChange).toHaveBeenCalledWith("health", "5");
  });

  it("renders linked items with sequence numbers and reorder controls", () => {
    renderForm({
      formValues: { name: "Barbarian", itemIds: ["it-1", "it-3"] },
    });

    expect(screen.getByTestId("unit-item-row-0")).toBeInTheDocument();
    expect(screen.getByTestId("unit-item-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("unit-item-move-up-1")).toBeInTheDocument();
    expect(screen.getByTestId("unit-item-move-down-0")).toBeInTheDocument();
  });

  it("edits a linked item without changing the unit form", async () => {
    const user = userEvent.setup();
    const onEditItem = vi.fn();
    const onFieldChange = vi.fn();
    renderForm({
      formValues: { name: "Barbarian", itemIds: ["it-1"] },
      onEditItem,
      onFieldChange,
    });

    await user.click(screen.getByTestId("unit-item-edit-0"));

    expect(screen.getByRole("button", { name: "Edit Iron Sword" })).toBeInTheDocument();
    expect(onEditItem).toHaveBeenCalledWith("it-1");
    expect(onFieldChange).not.toHaveBeenCalled();
  });

  it("shows a save error when provided", () => {
    renderForm({
      formValues: { name: "Barbarian" },
      saveError: "A unit with this name already exists",
    });

    expect(screen.getByTestId("entity-save-error")).toHaveTextContent(
      "A unit with this name already exists",
    );
  });

  it("renders individual targeting summary copy without effect-allegiance inference", () => {
    renderForm({
      formValues: {
        name: "Ally Vanguard",
        targetScope: "allies",
        targetPriority: "lowest_health",
        targetCount: 2,
        selectionShape: "individual",
      },
    });

    const summary = screen.getByTestId("unit-targeting-summary");
    expect(summary).toHaveTextContent("Targets up to 2 allies individually");
    expect(summary).toHaveTextContent("Prioritizes lowest health");
    expect(summary).not.toHaveTextContent(/first (linked )?effect/i);
    expect(summary).not.toHaveTextContent(/effect.*determine/i);
  });

  it("renders adjacent targeting summary copy", () => {
    renderForm({
      formValues: {
        name: "Shield Line",
        targetScope: "both",
        targetPriority: "support",
        targetCount: 3,
        selectionShape: "adjacent",
      },
    });

    const summary = screen.getByTestId("unit-targeting-summary");
    expect(summary).toHaveTextContent("Targets one adjacent group of up to 3 units");
    expect(summary).toHaveTextContent("allies or enemies");
    expect(summary).toHaveTextContent("Prioritizes support units");
  });

  it("renders self-only targeting copy for individual selection", () => {
    renderForm({
      formValues: {
        name: "Self Heal",
        targetScope: "self",
        targetPriority: "lowest_health",
        targetCount: 3,
        selectionShape: "individual",
      },
    });

    expect(screen.getByTestId("unit-targeting-summary")).toHaveTextContent("Targets the caster");
    expect(screen.getByTestId("unit-targeting-summary")).not.toHaveTextContent("up to 3");
  });

  it("renders self-only targeting copy for adjacent selection", () => {
    renderForm({
      formValues: {
        name: "Self Guard",
        targetScope: "self",
        targetPriority: "highest_health",
        targetCount: 2,
        selectionShape: "adjacent",
      },
    });

    expect(screen.getByTestId("unit-targeting-summary")).toHaveTextContent("Targets the caster");
    expect(screen.getByTestId("unit-targeting-summary")).not.toHaveTextContent("adjacent group");
  });

  it("changes target scope and priority through explicit selectors", async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();
    renderForm({ onFieldChange, formValues: { name: "Field Captain" } });

    await user.selectOptions(screen.getByTestId("unit-target-scope-select"), "self_allies");
    await user.selectOptions(screen.getByTestId("unit-target-priority-select"), "random");

    expect(onFieldChange).toHaveBeenCalledWith("targetScope", "self_allies");
    expect(onFieldChange).toHaveBeenCalledWith("targetPriority", "random");
  });

  it("authors a positive target count and selection shape without legacy row controls", async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();
    renderForm({ onFieldChange, formValues: { name: "Formation Guard", targetCount: 3 } });

    expect(screen.getByTestId("unit-target-count-input")).toHaveValue(3);
    await user.click(screen.getByTestId("unit-target-shape-toggle-adjacent"));
    expect(onFieldChange).toHaveBeenCalledWith("selectionShape", "adjacent");
    expect(screen.queryByTestId("unit-target-row-count-toggle-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("unit-target-per-row-toggle-all")).not.toBeInTheDocument();
    expect(screen.queryByTestId("unit-target-allowed-row-tank")).not.toBeInTheDocument();
  });

  it("disables save for a non-positive target count", () => {
    renderForm({
      formValues: { name: "Confused Duelist", targetCount: 0 },
    });

    expect(screen.getByTestId("entity-save-button")).toBeDisabled();
    expect(screen.getByText("Target count must be at least 1")).toBeVisible();
  });
});
