import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { UnitFormValues } from "~/components/create/unit-form";
import { UnitWorkspaceForm } from "~/components/create/unit-workspace-form";

const defaultFormValues: UnitFormValues = {
  name: "",
  meleeDmg: "0",
  health: "0",
  rangedDmg: "0",
  manaRegen: "0",
  spellDmg: "0",
  speed: "0",
  dodge: "0",
  criticalChance: "0",
  itemIds: [],
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
    isSaving: overrides.isSaving ?? false,
    saveError: overrides.saveError ?? null,
  };

  return { ...render(<UnitWorkspaceForm {...props} />), props };
}

describe("UnitWorkspaceForm", () => {
  it("renders all unit sections and fields", () => {
    renderForm();

    expect(screen.getByText("Linked Items")).toBeInTheDocument();
    expect(screen.getByText("Combat Stats")).toBeInTheDocument();
    expect(screen.getByText("Vital Stats")).toBeInTheDocument();
    expect(screen.getByTestId("unit-item-picker")).toBeInTheDocument();
    expect(screen.getByTestId("unit-meleeDmg-input")).toBeInTheDocument();
    expect(screen.getByTestId("unit-health-input")).toBeInTheDocument();
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

  it("shows a save error when provided", () => {
    renderForm({
      formValues: { name: "Barbarian" },
      saveError: "A unit with this name already exists",
    });

    expect(screen.getByTestId("entity-save-error")).toHaveTextContent(
      "A unit with this name already exists",
    );
  });
});
