import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SpellFormValues } from "~/components/create/spell-form";
import { SpellWorkspaceForm } from "~/components/create/spell-workspace-form";

const defaultFormValues: SpellFormValues = {
  name: "",
  description: "",
  targetPolicy: "",
  targetScope: "self_and_others",
  effectIds: [],
  targetRowCount: 1,
  maxTargetsPerRow: 1,
  targetOnlyAdjacent: false,
  allowedRowTypes: [],
};

const sampleEffectOptions = [
  { id: "eff-1", name: "Arcane Damage", effectType: "damage" },
  { id: "eff-7", name: "Astral Ward", effectType: "buff" },
  { id: "eff-4", name: "Exhaust", effectType: "debuff" },
  { id: "eff-5", name: "Frostbite", effectType: "damage" },
  { id: "eff-6", name: "Guardian Shield", effectType: "buff" },
  { id: "eff-2", name: "Heal Light", effectType: "healing" },
  { id: "eff-3", name: "Shield Wall", effectType: "buff" },
];

function renderForm(
  overrides: {
    formValues?: Partial<SpellFormValues>;
    mode?: "create" | "edit";
    effectOptions?: typeof sampleEffectOptions;
    onFieldChange?: (field: string, value: unknown) => void;
    onSave?: () => void;
    isSaving?: boolean;
    saveError?: string | null;
  } = {},
) {
  const props = {
    mode: overrides.mode ?? "create",
    formValues: { ...defaultFormValues, ...overrides.formValues } as SpellFormValues,
    effectOptions: overrides.effectOptions ?? sampleEffectOptions,
    onFieldChange: overrides.onFieldChange ?? vi.fn(),
    onSave: overrides.onSave ?? vi.fn(),
    isSaving: overrides.isSaving ?? false,
    saveError: overrides.saveError ?? null,
  };
  return { ...render(<SpellWorkspaceForm {...props} />), props };
}

describe("SpellWorkspaceForm", () => {
  describe("Rendering", () => {
    it("renders all form fields", () => {
      renderForm();

      expect(screen.getByTestId("entity-name-input")).toBeInTheDocument();
      expect(screen.getByTestId("spell-description-input")).toBeInTheDocument();
      expect(screen.getByTestId("spell-target-policy-chip")).toBeInTheDocument();
      expect(screen.getByTestId("spell-target-policy-select")).toBeInTheDocument();
      expect(screen.getByTestId("spell-effect-picker")).toBeInTheDocument();
      expect(screen.getByTestId("spell-add-effect-button")).toBeInTheDocument();
      expect(screen.getByTestId("entity-save-button")).toBeInTheDocument();
    });

    it("renders Name label and Description label", () => {
      renderForm();

      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText(/Description/)).toBeInTheDocument();
    });

    it("renders Targeting section header", () => {
      renderForm();

      expect(screen.getByText("Targeting")).toBeInTheDocument();
    });

    it("renders only the real target policy options", () => {
      renderForm();

      const select = screen.getByTestId("spell-target-policy-select") as HTMLSelectElement;
      const visibleOptionValues = Array.from(select.options)
        .filter((option) => !option.hidden)
        .map((option) => option.value);

      expect(visibleOptionValues).toEqual([
        "highest_health",
        "lowest_health",
        "highest_damage",
        "random",
        "self",
      ]);
    });

    it("renders target scope options", () => {
      renderForm();

      const select = screen.getByTestId("spell-target-scope-select") as HTMLSelectElement;
      expect(Array.from(select.options).map((option) => option.value)).toEqual([
        "self",
        "self_and_others",
        "others",
      ]);
    });

    it("keeps the target policy select empty on a new spell", () => {
      renderForm();

      const select = screen.getByTestId("spell-target-policy-select") as HTMLSelectElement;
      const emptyOption = select.options[0];

      expect(select.value).toBe("");
      expect(emptyOption.value).toBe("");
      expect(emptyOption.hidden).toBe(true);
      expect(emptyOption.disabled).toBe(true);
    });

    it("renders Spell Effects section header", () => {
      renderForm();

      expect(screen.getByText("Spell Effects")).toBeInTheDocument();
    });

    it("renders effect picker with all effect options", () => {
      renderForm();

      expect(screen.getByTestId("spell-effect-picker")).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "Arcane Damage" })).not.toBeInTheDocument();
    });
  });

  describe("Save button label", () => {
    it("shows 'Create Spell' in create mode", () => {
      renderForm({ mode: "create" });

      expect(screen.getByTestId("entity-save-button")).toHaveTextContent("Create Spell");
    });

    it("shows 'Save Changes' in edit mode", () => {
      renderForm({
        mode: "edit",
        formValues: { name: "Fireball", targetPolicy: "random" },
      });

      expect(screen.getByTestId("entity-save-button")).toHaveTextContent("Save Changes");
    });

    it("shows 'Saving...' when isSaving is true", () => {
      renderForm({
        mode: "edit",
        formValues: { name: "Fireball", targetPolicy: "random" },
        isSaving: true,
      });

      expect(screen.getByTestId("entity-save-button")).toHaveTextContent("Saving...");
    });
  });

  describe("Save button disabled states", () => {
    it("is disabled when name is empty", () => {
      renderForm({
        formValues: { name: "", targetPolicy: "random" },
      });

      expect(screen.getByTestId("entity-save-button")).toBeDisabled();
    });

    it("is disabled when name is only whitespace", () => {
      renderForm({
        formValues: { name: "   ", targetPolicy: "random" },
      });

      expect(screen.getByTestId("entity-save-button")).toBeDisabled();
    });

    it("is disabled when targetPolicy is not set", () => {
      renderForm({
        formValues: { name: "Fireball", targetPolicy: "", effectIds: ["eff-1"] },
      });

      expect(screen.getByTestId("entity-save-button")).toBeDisabled();
    });

    it("is disabled when no linked effects are present", () => {
      renderForm({
        formValues: { name: "Fireball", targetPolicy: "random", effectIds: [] },
      });

      expect(screen.getByTestId("entity-save-button")).toBeDisabled();
    });

    it("is disabled when isSaving is true", () => {
      renderForm({
        formValues: { name: "Fireball", targetPolicy: "random", effectIds: ["eff-1"] },
        isSaving: true,
      });

      expect(screen.getByTestId("entity-save-button")).toBeDisabled();
    });

    it("is enabled when name and targetPolicy are both set", () => {
      renderForm({
        formValues: { name: "Fireball", targetPolicy: "random", effectIds: ["eff-1"] },
      });

      expect(screen.getByTestId("entity-save-button")).toBeEnabled();
    });
  });

  describe("onFieldChange callbacks", () => {
    it("calls onFieldChange when name input changes", async () => {
      const onFieldChange = vi.fn();
      renderForm({ onFieldChange, formValues: { name: "" } });

      const input = screen.getByTestId("entity-name-input");
      await userEvent.type(input, "F");

      expect(onFieldChange).toHaveBeenCalledWith("name", "F");
    });

    it("calls onFieldChange when description textarea changes", async () => {
      const onFieldChange = vi.fn();
      renderForm({ onFieldChange, formValues: { description: "" } });

      const textarea = screen.getByTestId("spell-description-input");
      await userEvent.type(textarea, "A spell description");

      expect(onFieldChange).toHaveBeenCalledWith("description", "A");
    });

    it("calls onFieldChange when target policy select changes", async () => {
      const onFieldChange = vi.fn();
      renderForm({ onFieldChange });

      const select = screen.getByTestId("spell-target-policy-select");
      await userEvent.selectOptions(select, "highest_health");

      expect(onFieldChange).toHaveBeenCalledWith("targetPolicy", "highest_health");
    });
  });

  describe("Save error display", () => {
    it("does not display error when saveError is null", () => {
      renderForm({ saveError: null });

      expect(screen.queryByTestId("entity-save-error")).not.toBeInTheDocument();
    });

    it("displays error message when saveError is set", () => {
      renderForm({ saveError: "A spell with this name already exists." });

      expect(screen.getByTestId("entity-save-error")).toBeInTheDocument();
      expect(screen.getByTestId("entity-save-error")).toHaveTextContent(
        "A spell with this name already exists.",
      );
    });
  });

  describe("Validation messages", () => {
    it("shows an inline error when no linked effects are present", () => {
      renderForm({
        formValues: { name: "Fireball", targetPolicy: "random", effectIds: [] },
      });

      expect(screen.getByText("At least one linked effect is required")).toBeInTheDocument();
    });
  });

  describe("Effect list", () => {
    it("renders effect rows with correct sequence numbers", () => {
      renderForm({
        formValues: { effectIds: ["eff-1", "eff-2", "eff-3"] },
      });

      expect(screen.getByTestId("spell-effect-row-0")).toBeInTheDocument();
      expect(screen.getByTestId("spell-effect-row-1")).toBeInTheDocument();
      expect(screen.getByTestId("spell-effect-row-2")).toBeInTheDocument();
    });

    it("renders effect names in each row", () => {
      renderForm({
        formValues: { effectIds: ["eff-1", "eff-2"] },
      });

      const row0 = screen.getByTestId("spell-effect-row-0");
      const row1 = screen.getByTestId("spell-effect-row-1");

      expect(row0).toHaveTextContent("Arcane Damage");
      expect(row1).toHaveTextContent("Heal Light");
    });

    it("renders sequence numbers starting from 1", () => {
      renderForm({
        formValues: { effectIds: ["eff-1", "eff-2", "eff-3"] },
      });

      const rows = [
        screen.getByTestId("spell-effect-row-0"),
        screen.getByTestId("spell-effect-row-1"),
        screen.getByTestId("spell-effect-row-2"),
      ];

      expect(rows[0]).toHaveTextContent("1");
      expect(rows[1]).toHaveTextContent("2");
      expect(rows[2]).toHaveTextContent("3");
    });

    it("renders no effect rows when effectIds is empty", () => {
      renderForm({ formValues: { effectIds: [] } });

      expect(screen.queryByTestId("spell-effect-row-0")).not.toBeInTheDocument();
    });
  });

  describe("Add effect button", () => {
    it("opening the picker with empty search shows only the first five effects", async () => {
      renderForm();

      await userEvent.click(screen.getByTestId("spell-effect-picker"));

      const options = screen.getByRole("listbox").querySelectorAll('[role="option"]');
      expect(options).toHaveLength(5);
      expect(Array.from(options).map((option) => option.textContent)).toEqual([
        "Arcane Damage",
        "Astral Ward",
        "Exhaust",
        "Frostbite",
        "Guardian Shield",
      ]);
      expect(screen.queryByRole("option", { name: "Heal Light" })).not.toBeInTheDocument();
    });

    it("shows the search prompt only in the input and not as an option", async () => {
      renderForm();

      await userEvent.click(screen.getByTestId("spell-effect-picker"));

      expect(screen.getByPlaceholderText("Search effects...")).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "Search effects..." })).not.toBeInTheDocument();
    });

    it("filters effects by a case-insensitive text search", async () => {
      renderForm();

      await userEvent.click(screen.getByTestId("spell-effect-picker"));
      await userEvent.type(screen.getByTestId("spell-effect-picker-search"), "heal");

      expect(screen.getByRole("option", { name: "Heal Light" })).toBeInTheDocument();
      expect(screen.queryByRole("option", { name: "Arcane Damage" })).not.toBeInTheDocument();
    });

    it("caps filtered results at five options", async () => {
      renderForm();

      await userEvent.click(screen.getByTestId("spell-effect-picker"));
      await userEvent.type(screen.getByTestId("spell-effect-picker-search"), "a");

      expect(screen.getByRole("listbox").querySelectorAll('[role="option"]')).toHaveLength(5);
      expect(screen.queryByRole("option", { name: "Shield Wall" })).not.toBeInTheDocument();
    });

    it("shows an empty state when no effects match the search", async () => {
      renderForm();

      await userEvent.click(screen.getByTestId("spell-effect-picker"));
      await userEvent.type(screen.getByTestId("spell-effect-picker-search"), "zzzzz");

      expect(screen.getByTestId("spell-effect-picker-empty")).toHaveTextContent(
        "No effects found.",
      );
      expect(screen.getByRole("listbox").querySelectorAll('[role="option"]')).toHaveLength(0);
    });

    it("calls onFieldChange with new effectId when Add is clicked with a selected effect", async () => {
      const onFieldChange = vi.fn();
      renderForm({ onFieldChange, formValues: { effectIds: [] } });

      await userEvent.click(screen.getByTestId("spell-effect-picker"));
      await userEvent.click(screen.getByTestId("spell-effect-picker-option-eff-1"));
      await userEvent.click(screen.getByTestId("spell-add-effect-button"));

      expect(onFieldChange).toHaveBeenCalledWith("effectIds", ["eff-1"]);
    });

    it("appends to existing effectIds when adding an effect", async () => {
      const onFieldChange = vi.fn();
      renderForm({ onFieldChange, formValues: { effectIds: ["eff-2"] } });

      await userEvent.click(screen.getByTestId("spell-effect-picker"));
      await userEvent.click(screen.getByTestId("spell-effect-picker-option-eff-1"));
      await userEvent.click(screen.getByTestId("spell-add-effect-button"));

      expect(onFieldChange).toHaveBeenCalledWith("effectIds", ["eff-2", "eff-1"]);
    });

    it("shows the selected effect name in the picker trigger", async () => {
      renderForm();

      await userEvent.click(screen.getByTestId("spell-effect-picker"));
      await userEvent.click(screen.getByTestId("spell-effect-picker-option-eff-4"));

      expect(screen.getByTestId("spell-effect-picker")).toHaveTextContent("Exhaust");
    });

    it("does not call onFieldChange when no effect is selected in picker", async () => {
      const onFieldChange = vi.fn();
      renderForm({ onFieldChange, formValues: { effectIds: [] } });

      await userEvent.click(screen.getByTestId("spell-add-effect-button"));

      expect(onFieldChange).not.toHaveBeenCalledWith("effectIds", expect.anything());
    });
  });

  describe("Move up/down buttons", () => {
    it("move up button is disabled on the first item", () => {
      renderForm({ formValues: { effectIds: ["eff-1", "eff-2"] } });

      expect(screen.getByTestId("spell-effect-move-up-0")).toBeDisabled();
    });

    it("move down button is disabled on the last item", () => {
      renderForm({ formValues: { effectIds: ["eff-1", "eff-2"] } });

      expect(screen.getByTestId("spell-effect-move-down-1")).toBeDisabled();
    });

    it("move up button is enabled for non-first items", () => {
      renderForm({ formValues: { effectIds: ["eff-1", "eff-2"] } });

      expect(screen.getByTestId("spell-effect-move-up-1")).toBeEnabled();
    });

    it("move down button is enabled for non-last items", () => {
      renderForm({ formValues: { effectIds: ["eff-1", "eff-2"] } });

      expect(screen.getByTestId("spell-effect-move-down-0")).toBeEnabled();
    });

    it("clicking move up calls onFieldChange with swapped effects", async () => {
      const onFieldChange = vi.fn();
      renderForm({
        onFieldChange,
        formValues: { effectIds: ["eff-1", "eff-2", "eff-3"] },
      });

      await userEvent.click(screen.getByTestId("spell-effect-move-up-1"));

      expect(onFieldChange).toHaveBeenCalledWith("effectIds", ["eff-2", "eff-1", "eff-3"]);
    });

    it("clicking move down calls onFieldChange with swapped effects", async () => {
      const onFieldChange = vi.fn();
      renderForm({
        onFieldChange,
        formValues: { effectIds: ["eff-1", "eff-2", "eff-3"] },
      });

      await userEvent.click(screen.getByTestId("spell-effect-move-down-1"));

      expect(onFieldChange).toHaveBeenCalledWith("effectIds", ["eff-1", "eff-3", "eff-2"]);
    });
  });

  describe("Remove button", () => {
    it("clicking remove calls onFieldChange with the effect removed", async () => {
      const onFieldChange = vi.fn();
      renderForm({
        onFieldChange,
        formValues: { effectIds: ["eff-1", "eff-2", "eff-3"] },
      });

      await userEvent.click(screen.getByTestId("spell-effect-remove-1"));

      expect(onFieldChange).toHaveBeenCalledWith("effectIds", ["eff-1", "eff-3"]);
    });

    it("removing the only effect results in empty list", async () => {
      const onFieldChange = vi.fn();
      renderForm({
        onFieldChange,
        formValues: { effectIds: ["eff-1"] },
      });

      await userEvent.click(screen.getByTestId("spell-effect-remove-0"));

      expect(onFieldChange).toHaveBeenCalledWith("effectIds", []);
    });

    it("removing the only effect leaves save disabled and shows the validation error", async () => {
      const { rerender, props } = renderForm({
        formValues: {
          name: "Fireball",
          targetPolicy: "random",
          effectIds: ["eff-1"],
        },
      });

      await userEvent.click(screen.getByTestId("spell-effect-remove-0"));

      rerender(
        <SpellWorkspaceForm
          {...props}
          formValues={{
            ...props.formValues,
            effectIds: [],
          }}
        />,
      );

      expect(screen.getByTestId("entity-save-button")).toBeDisabled();
      expect(screen.getByText("At least one linked effect is required")).toBeInTheDocument();
    });
  });

  describe("Duplicate effects", () => {
    it("allows the same effect to appear at multiple positions", () => {
      renderForm({
        formValues: { effectIds: ["eff-1", "eff-1", "eff-2"] },
      });

      expect(screen.getByTestId("spell-effect-row-0")).toBeInTheDocument();
      expect(screen.getByTestId("spell-effect-row-1")).toBeInTheDocument();
      expect(screen.getByTestId("spell-effect-row-2")).toBeInTheDocument();

      // Both rows for eff-1 show "Arcane Damage" (excluding the picker option)
      const row0 = screen.getByTestId("spell-effect-row-0");
      const row1 = screen.getByTestId("spell-effect-row-1");
      expect(row0).toHaveTextContent("Arcane Damage");
      expect(row1).toHaveTextContent("Arcane Damage");
    });

    it("removing one duplicate keeps the other", async () => {
      const onFieldChange = vi.fn();
      renderForm({
        onFieldChange,
        formValues: { effectIds: ["eff-1", "eff-1"] },
      });

      await userEvent.click(screen.getByTestId("spell-effect-remove-0"));

      expect(onFieldChange).toHaveBeenCalledWith("effectIds", ["eff-1"]);
    });
  });

  describe("Targeting section", () => {
    it("renders Targeting section header", () => {
      renderForm();

      expect(screen.getByText("Targeting")).toBeInTheDocument();
    });

    it("renders targeting grid preview", () => {
      renderForm();

      expect(screen.getByTestId("targeting-grid")).toBeInTheDocument();
    });

    it("renders target row count input", () => {
      renderForm();

      expect(screen.getByTestId("spell-target-row-count-input")).toBeInTheDocument();
    });

    it("renders per-row segment toggle with All and Limit options", () => {
      renderForm();

      expect(screen.getByTestId("per-row-toggle")).toBeInTheDocument();
      expect(screen.getByTestId("per-row-toggle-all")).toBeInTheDocument();
      expect(screen.getByTestId("per-row-toggle-limit")).toBeInTheDocument();
    });

    it("renders max targets per row input when Limit is selected", () => {
      renderForm({ formValues: { maxTargetsPerRow: 2 } });

      expect(screen.getByTestId("spell-max-targets-per-row-input")).toBeInTheDocument();
    });

    it("hides max targets per row input when All is selected", () => {
      renderForm({ formValues: { maxTargetsPerRow: null } });

      expect(screen.queryByTestId("spell-max-targets-per-row-input")).not.toBeInTheDocument();
    });

    it("renders target only adjacent checkbox", () => {
      renderForm();

      expect(screen.getByTestId("spell-target-only-adjacent-checkbox")).toBeInTheDocument();
    });

    it("renders allowed row type pills", () => {
      renderForm();

      expect(screen.getByTestId("spell-allowed-row-ranged")).toBeInTheDocument();
      expect(screen.getByTestId("spell-allowed-row-support")).toBeInTheDocument();
      expect(screen.getByTestId("spell-allowed-row-melee")).toBeInTheDocument();
      expect(screen.getByTestId("spell-allowed-row-tank")).toBeInTheDocument();
    });

    it("calls onFieldChange when target row count changes", () => {
      const onFieldChange = vi.fn();
      renderForm({ onFieldChange, formValues: { targetRowCount: 1 } });

      const input = screen.getByTestId("spell-target-row-count-input");
      fireEvent.change(input, { target: { value: "2" } });

      expect(onFieldChange).toHaveBeenCalledWith("targetRowCount", 2);
    });

    it("calls onFieldChange with null when All segment is clicked", async () => {
      const onFieldChange = vi.fn();
      renderForm({ onFieldChange, formValues: { maxTargetsPerRow: 1 } });

      await userEvent.click(screen.getByTestId("per-row-toggle-all"));

      expect(onFieldChange).toHaveBeenCalledWith("maxTargetsPerRow", null);
    });

    it("auto-clears targetOnlyAdjacent when All is clicked while adjacent is true", async () => {
      const onFieldChange = vi.fn();
      renderForm({
        onFieldChange,
        formValues: { maxTargetsPerRow: 3, targetOnlyAdjacent: true },
      });

      await userEvent.click(screen.getByTestId("per-row-toggle-all"));

      expect(onFieldChange).toHaveBeenCalledWith("targetOnlyAdjacent", false);
      expect(onFieldChange).toHaveBeenCalledWith("maxTargetsPerRow", null);
    });

    it("calls onFieldChange with 1 when Limit segment is clicked", async () => {
      const onFieldChange = vi.fn();
      renderForm({ onFieldChange, formValues: { maxTargetsPerRow: null } });

      await userEvent.click(screen.getByTestId("per-row-toggle-limit"));

      expect(onFieldChange).toHaveBeenCalledWith("maxTargetsPerRow", 1);
    });

    it("target only adjacent checkbox is disabled when All is selected", () => {
      renderForm({ formValues: { maxTargetsPerRow: null } });

      expect(screen.getByTestId("spell-target-only-adjacent-checkbox")).toBeDisabled();
    });

    it("target only adjacent checkbox is disabled when maxTargetsPerRow is 1", () => {
      renderForm({ formValues: { maxTargetsPerRow: 1 } });

      expect(screen.getByTestId("spell-target-only-adjacent-checkbox")).toBeDisabled();
    });

    it("target only adjacent checkbox is enabled when maxTargetsPerRow >= 2", () => {
      renderForm({ formValues: { maxTargetsPerRow: 3 } });

      expect(screen.getByTestId("spell-target-only-adjacent-checkbox")).toBeEnabled();
    });

    it("calls onFieldChange when target only adjacent is toggled", async () => {
      const onFieldChange = vi.fn();
      renderForm({
        onFieldChange,
        formValues: { maxTargetsPerRow: 3, targetOnlyAdjacent: false },
      });

      await userEvent.click(screen.getByTestId("spell-target-only-adjacent-checkbox"));

      expect(onFieldChange).toHaveBeenCalledWith("targetOnlyAdjacent", true);
    });

    it("calls onFieldChange when allowed row type pill is toggled on", async () => {
      const onFieldChange = vi.fn();
      renderForm({
        onFieldChange,
        formValues: { allowedRowTypes: [] },
      });

      await userEvent.click(screen.getByTestId("spell-allowed-row-melee"));

      expect(onFieldChange).toHaveBeenCalledWith("allowedRowTypes", ["melee"]);
    });

    it("calls onFieldChange when allowed row type pill is toggled off", async () => {
      const onFieldChange = vi.fn();
      renderForm({
        onFieldChange,
        formValues: { allowedRowTypes: ["melee", "tank"] },
      });

      await userEvent.click(screen.getByTestId("spell-allowed-row-melee"));

      expect(onFieldChange).toHaveBeenCalledWith("allowedRowTypes", ["tank"]);
    });

    it("grid preview shows correct targeted slots for default state", () => {
      renderForm();

      expect(screen.getByTestId("targeting-grid-slot-ranged-0")).toHaveAttribute(
        "data-targeted",
        "true",
      );
      expect(screen.getByTestId("targeting-grid-slot-ranged-1")).toHaveAttribute(
        "data-targeted",
        "false",
      );
      expect(screen.getByTestId("targeting-grid-slot-support-0")).toHaveAttribute(
        "data-targeted",
        "false",
      );
    });

    it("save button is disabled when targeting validation fails", () => {
      renderForm({
        formValues: {
          name: "Test Spell",
          targetPolicy: "random",
          effectIds: ["eff-1"],
          maxTargetsPerRow: null,
          targetOnlyAdjacent: true,
        },
      });

      expect(screen.getByTestId("entity-save-button")).toBeDisabled();
    });
  });
});
