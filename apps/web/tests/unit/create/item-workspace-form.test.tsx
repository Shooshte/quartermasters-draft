import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ItemFormValues } from "~/components/create/item-form";
import { ItemWorkspaceForm } from "~/components/create/item-workspace-form";

const defaultFormValues: ItemFormValues = {
  name: "",
  meleeDmg: "0",
  rangedDmg: "0",
  mana: "0",
  manaRegen: "0",
  spellDmg: "0",
  dodge: "0",
  criticalChance: "0",
  activationManaCost: "0",
  activationHealthCost: "0",
  effectIds: [],
  allowedRowTypes: [],
};

const sampleEffectOptions = [
  { id: "eff-1", name: "Arcane Damage", effectType: "damage" as const },
  { id: "eff-2", name: "Healing Light", effectType: "healing" as const },
  { id: "eff-3", name: "Battle Cry", effectType: "buff" as const },
  { id: "eff-4", name: "Armor Break", effectType: "debuff" as const },
  { id: "eff-5", name: "Dark Pact", effectType: "buff" as const },
  { id: "eff-6", name: "Tectonic Pulse", effectType: "damage" as const },
];

function renderForm(
  overrides: {
    formValues?: Partial<ItemFormValues>;
    effectOptions?: typeof sampleEffectOptions;
    onFieldChange?: (field: string, value: unknown) => void;
    onSave?: () => void;
    onEditEffect?: (effectId: string) => void;
    isSaving?: boolean;
    saveError?: string | null;
    mode?: "create" | "edit";
  } = {},
) {
  const props = {
    mode: overrides.mode ?? "create",
    formValues: { ...defaultFormValues, ...overrides.formValues } as ItemFormValues,
    effectOptions: overrides.effectOptions ?? sampleEffectOptions,
    onFieldChange: overrides.onFieldChange ?? vi.fn(),
    onSave: overrides.onSave ?? vi.fn(),
    onEditEffect: overrides.onEditEffect ?? vi.fn(),
    isSaving: overrides.isSaving ?? false,
    saveError: overrides.saveError ?? null,
  };

  return { ...render(<ItemWorkspaceForm {...props} />), props };
}

describe("ItemWorkspaceForm", () => {
  it("renders all item sections and fields", () => {
    renderForm();

    expect(screen.getByText("Linked Effects")).toBeInTheDocument();
    expect(screen.getByText("Combat Stats")).toBeInTheDocument();
    expect(screen.getByText("Utility Stats")).toBeInTheDocument();
    expect(screen.getByText("Activation Costs")).toBeInTheDocument();
    expect(screen.getByText("Allowed deployment rows")).toBeInTheDocument();
    expect(screen.getByTestId("item-effect-picker")).toBeInTheDocument();
    expect(screen.getByTestId("item-meleeDmg-input")).toBeInTheDocument();
    expect(screen.getByTestId("item-mana-input")).toBeInTheDocument();
    expect(screen.getByTestId("item-activationManaCost-input")).toBeInTheDocument();
  });

  it("toggles allowed deployment rows without producing duplicates", async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();
    const view = renderForm({ onFieldChange });

    await user.click(screen.getByTestId("item-allowed-row-ranged"));
    expect(onFieldChange).toHaveBeenCalledWith("allowedRowTypes", ["ranged"]);

    view.rerender(
      <ItemWorkspaceForm
        {...view.props}
        formValues={{
          ...view.props.formValues,
          allowedRowTypes: ["ranged", "ranged"],
        }}
      />,
    );
    await user.click(screen.getByTestId("item-allowed-row-melee"));
    expect(onFieldChange).toHaveBeenLastCalledWith("allowedRowTypes", ["melee", "ranged"]);
  });

  it("disables save when required fields are missing", () => {
    renderForm();

    expect(screen.getByTestId("entity-save-button")).toBeDisabled();
    expect(screen.queryByText("At least one linked effect is required")).not.toBeInTheDocument();
  });

  it("enables save when a name is present even without linked effects", () => {
    renderForm({
      formValues: { name: "Bronze Buckler", effectIds: [] },
    });

    expect(screen.getByTestId("entity-save-button")).toBeEnabled();
  });

  it("adds a linked effect through the picker without sorting", async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();
    renderForm({
      onFieldChange,
      formValues: { effectIds: ["eff-2"] },
    });

    await user.click(screen.getByTestId("item-effect-picker"));
    await user.click(screen.getByTestId("item-effect-picker-option-eff-1"));
    await user.click(screen.getByTestId("item-add-effect-button"));

    expect(onFieldChange).toHaveBeenCalledWith("effectIds", ["eff-2", "eff-1"]);
  });

  it("offers an already linked effect again", async () => {
    const user = userEvent.setup();
    renderForm({ formValues: { name: "Echo Crystal", effectIds: ["eff-1"] } });

    await user.click(screen.getByTestId("item-effect-picker"));

    expect(screen.getByTestId("item-effect-picker-option-eff-1")).toBeInTheDocument();
    expect(screen.getByTestId("item-effect-picker-option-eff-2")).toBeInTheDocument();
  });

  it("limits the visible picker options to five and uses the search prompt only as a placeholder", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByTestId("item-effect-picker"));

    const listbox = screen.getByRole("listbox", { name: "Item effect options" });
    expect(within(listbox).getAllByRole("option")).toHaveLength(5);
    expect(screen.getByTestId("item-effect-picker-search")).toHaveAttribute(
      "placeholder",
      "Search effects...",
    );
    expect(screen.queryByRole("option", { name: "Search effects..." })).not.toBeInTheDocument();
  });

  it("calls onFieldChange when a numeric field changes", async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();
    renderForm({ onFieldChange });

    await user.type(screen.getByTestId("item-meleeDmg-input"), "5");

    expect(onFieldChange).toHaveBeenCalledWith("meleeDmg", "5");
  });

  it("renders linked effects with sequence numbers and reorder controls", () => {
    renderForm({
      formValues: { name: "Oak Staff", effectIds: ["eff-1", "eff-3"] },
    });

    expect(screen.getByTestId("item-effect-row-0")).toHaveTextContent("1");
    expect(screen.getByTestId("item-effect-row-1")).toHaveTextContent("2");
    expect(screen.getByTestId("item-effect-move-up-1")).toBeInTheDocument();
    expect(screen.getByTestId("item-effect-move-down-0")).toBeInTheDocument();
  });

  it("reorders linked effects without losing duplicates", async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();
    renderForm({
      formValues: { effectIds: ["eff-1", "eff-2", "eff-1"] },
      onFieldChange,
    });

    await user.click(screen.getByTestId("item-effect-move-down-0"));

    expect(onFieldChange).toHaveBeenCalledWith("effectIds", ["eff-2", "eff-1", "eff-1"]);
  });

  it("edits a linked effect", async () => {
    const user = userEvent.setup();
    const onEditEffect = vi.fn();
    renderForm({
      formValues: { name: "Oak Staff", effectIds: ["eff-1"] },
      onEditEffect,
    });

    await user.click(screen.getByTestId("item-effect-edit-0"));

    expect(screen.getByRole("button", { name: "Edit Arcane Damage" })).toBeInTheDocument();
    expect(onEditEffect).toHaveBeenCalledWith("eff-1");
  });
});
