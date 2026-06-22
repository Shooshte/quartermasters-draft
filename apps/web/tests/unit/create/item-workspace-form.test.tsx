import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ItemFormValues } from "~/components/create/item-form";
import { ItemWorkspaceForm } from "~/components/create/item-workspace-form";

const defaultFormValues: ItemFormValues = {
  name: "",
  meleeDmg: "0",
  rangedDmg: "0",
  manaRegen: "0",
  spellDmg: "0",
  dodge: "0",
  criticalChance: "0",
  activationManaCost: "0",
  activationHealthCost: "0",
  spellIds: [],
};

const sampleSpellOptions = [
  { id: "sp-1", name: "Fireball" },
  { id: "sp-2", name: "Healing Touch" },
  { id: "sp-3", name: "Battle Cry" },
  { id: "sp-4", name: "Arcane Shield" },
  { id: "sp-5", name: "Dark Pact" },
  { id: "sp-6", name: "Rune Cascade" },
];

function renderForm(
  overrides: {
    formValues?: Partial<ItemFormValues>;
    spellOptions?: typeof sampleSpellOptions;
    onFieldChange?: (field: string, value: unknown) => void;
    onSave?: () => void;
    isSaving?: boolean;
    saveError?: string | null;
    mode?: "create" | "edit";
  } = {},
) {
  const props = {
    mode: overrides.mode ?? "create",
    formValues: { ...defaultFormValues, ...overrides.formValues } as ItemFormValues,
    spellOptions: overrides.spellOptions ?? sampleSpellOptions,
    onFieldChange: overrides.onFieldChange ?? vi.fn(),
    onSave: overrides.onSave ?? vi.fn(),
    isSaving: overrides.isSaving ?? false,
    saveError: overrides.saveError ?? null,
  };

  return { ...render(<ItemWorkspaceForm {...props} />), props };
}

describe("ItemWorkspaceForm", () => {
  it("renders all item sections and fields", () => {
    renderForm();

    expect(screen.getByText("Linked Spells")).toBeInTheDocument();
    expect(screen.getByText("Combat Stats")).toBeInTheDocument();
    expect(screen.getByText("Utility Stats")).toBeInTheDocument();
    expect(screen.getByText("Activation Costs")).toBeInTheDocument();
    expect(screen.getByTestId("item-spell-picker")).toBeInTheDocument();
    expect(screen.getByTestId("item-meleeDmg-input")).toBeInTheDocument();
    expect(screen.getByTestId("item-activationManaCost-input")).toBeInTheDocument();
  });

  it("disables save when required fields are missing", () => {
    renderForm();

    expect(screen.getByTestId("entity-save-button")).toBeDisabled();
    expect(screen.queryByText("At least one linked spell is required")).not.toBeInTheDocument();
  });

  it("enables save when a name is present even without linked spells", () => {
    renderForm({
      formValues: { name: "Bronze Buckler", spellIds: [] },
    });

    expect(screen.getByTestId("entity-save-button")).toBeEnabled();
  });

  it("adds a linked spell through the picker", async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();
    renderForm({ onFieldChange });

    await user.click(screen.getByTestId("item-spell-picker"));
    await user.click(screen.getByTestId("item-spell-picker-option-sp-1"));
    await user.click(screen.getByTestId("item-add-spell-button"));

    expect(onFieldChange).toHaveBeenCalledWith("spellIds", ["sp-1"]);
  });

  it("does not offer an already linked spell again", async () => {
    const user = userEvent.setup();
    renderForm({ formValues: { name: "Echo Crystal", spellIds: ["sp-1"] } });

    await user.click(screen.getByTestId("item-spell-picker"));

    expect(screen.queryByTestId("item-spell-picker-option-sp-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("item-spell-picker-option-sp-2")).toBeInTheDocument();
  });

  it("limits the visible picker options to five and uses the search prompt only as a placeholder", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByTestId("item-spell-picker"));

    const listbox = screen.getByRole("listbox", { name: "Item spell options" });
    expect(within(listbox).getAllByRole("option")).toHaveLength(5);
    expect(screen.getByTestId("item-spell-picker-search")).toHaveAttribute(
      "placeholder",
      "Search spells...",
    );
    expect(screen.queryByRole("option", { name: "Search spells..." })).not.toBeInTheDocument();
  });

  it("calls onFieldChange when a numeric field changes", async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();
    renderForm({ onFieldChange });

    await user.type(screen.getByTestId("item-meleeDmg-input"), "5");

    expect(onFieldChange).toHaveBeenCalledWith("meleeDmg", "5");
  });
});
