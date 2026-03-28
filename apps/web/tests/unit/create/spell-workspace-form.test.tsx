import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpellWorkspaceForm } from "~/components/create/spell-workspace-form";
import type { SpellFormValues } from "~/components/create/spell-form";

const defaultFormValues: SpellFormValues = {
  name: "",
  description: "",
  targetPolicy: "",
  effectIds: [],
};

const sampleEffectOptions = [
  { id: "eff-1", name: "Arcane Damage", effectType: "damage" },
  { id: "eff-2", name: "Heal Light", effectType: "healing" },
  { id: "eff-3", name: "Shield Wall", effectType: "buff" },
];

function renderForm(
  overrides: {
    formValues?: Partial<SpellFormValues>;
    mode?: "create" | "edit";
    effectOptions?: typeof sampleEffectOptions;
    onFieldChange?: ReturnType<typeof vi.fn>;
    onSave?: ReturnType<typeof vi.fn>;
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

    it("renders Target Selection section header", () => {
      renderForm();

      expect(screen.getByText("Target Selection")).toBeInTheDocument();
    });

    it("renders Spell Effects section header", () => {
      renderForm();

      expect(screen.getByText("Spell Effects")).toBeInTheDocument();
    });

    it("renders effect picker with all effect options", () => {
      renderForm();

      expect(screen.getByRole("option", { name: "Arcane Damage" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Heal Light" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Shield Wall" })).toBeInTheDocument();
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
        formValues: { name: "Fireball", targetPolicy: "" },
      });

      expect(screen.getByTestId("entity-save-button")).toBeDisabled();
    });

    it("is disabled when isSaving is true", () => {
      renderForm({
        formValues: { name: "Fireball", targetPolicy: "random" },
        isSaving: true,
      });

      expect(screen.getByTestId("entity-save-button")).toBeDisabled();
    });

    it("is enabled when name and targetPolicy are both set", () => {
      renderForm({
        formValues: { name: "Fireball", targetPolicy: "random" },
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
    it("calls onFieldChange with new effectId when Add is clicked with a selected effect", async () => {
      const onFieldChange = vi.fn();
      renderForm({ onFieldChange, formValues: { effectIds: [] } });

      const picker = screen.getByTestId("spell-effect-picker") as HTMLSelectElement;
      await userEvent.selectOptions(picker, "eff-1");
      await userEvent.click(screen.getByTestId("spell-add-effect-button"));

      expect(onFieldChange).toHaveBeenCalledWith("effectIds", ["eff-1"]);
    });

    it("appends to existing effectIds when adding an effect", async () => {
      const onFieldChange = vi.fn();
      renderForm({ onFieldChange, formValues: { effectIds: ["eff-2"] } });

      const picker = screen.getByTestId("spell-effect-picker") as HTMLSelectElement;
      await userEvent.selectOptions(picker, "eff-1");
      await userEvent.click(screen.getByTestId("spell-add-effect-button"));

      expect(onFieldChange).toHaveBeenCalledWith("effectIds", ["eff-2", "eff-1"]);
    });

    it("does not call onFieldChange when no effect is selected in picker", async () => {
      const onFieldChange = vi.fn();
      renderForm({ onFieldChange, formValues: { effectIds: [] } });

      await userEvent.click(screen.getByTestId("spell-add-effect-button"));

      expect(onFieldChange).not.toHaveBeenCalledWith(
        "effectIds",
        expect.anything(),
      );
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
});
