import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EntityWorkspace } from "~/components/create/entity-workspace";
import type { WorkspaceState } from "~/components/create/types";

function makeWorkspace(overrides: Partial<WorkspaceState> = {}): WorkspaceState {
  return {
    mode: "idle",
    entityType: null,
    entityId: null,
    data: null,
    formValues: {},
    isDirty: false,
    ...overrides,
  };
}

const defaultProps = {
  onFieldChange: vi.fn(),
  onSave: vi.fn(),
  isSaving: false,
  saveError: null,
};

describe("EntityWorkspace", () => {
  it("shows idle placeholder", () => {
    render(<EntityWorkspace workspace={makeWorkspace()} {...defaultProps} />);
    expect(screen.getByTestId("entity-idle")).toBeInTheDocument();
    expect(screen.getByText("Select an entity from the library")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<EntityWorkspace workspace={makeWorkspace({ mode: "loading" })} {...defaultProps} />);
    expect(screen.getByTestId("entity-loading")).toBeInTheDocument();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows not-found state", () => {
    render(<EntityWorkspace workspace={makeWorkspace({ mode: "not-found" })} {...defaultProps} />);
    expect(screen.getByTestId("entity-not-found")).toBeInTheDocument();
    expect(screen.getByText("Entity not found")).toBeInTheDocument();
  });

  it("shows create mode with empty name", () => {
    render(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "create",
          entityType: "effect",
          formValues: {
            name: "",
            timingType: "instant",
            effectType: "buff",
            intervalTicks: null,
            triggerCount: null,
          },
        })}
        {...defaultProps}
      />,
    );
    expect(screen.getByTestId("entity-form")).toBeInTheDocument();
    expect(screen.getByText("New Effect")).toBeInTheDocument();
    expect(screen.getByTestId("entity-name-input")).toHaveValue("");
  });

  it("shows edit mode with populated name", () => {
    render(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "edit",
          entityType: "effect",
          entityId: "123",
          data: { name: "Fireball" },
          formValues: { name: "Fireball" },
        })}
        {...defaultProps}
      />,
    );
    expect(screen.getByText("Effect: Fireball")).toBeInTheDocument();
    expect(screen.getByTestId("entity-name-input")).toHaveValue("Fireball");
  });

  it("keeps previous content visible without opacity transition when loading with previous content", () => {
    render(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "loading",
          data: { name: "Fireball" },
          formValues: { name: "Fireball" },
        })}
        {...defaultProps}
      />,
    );
    const form = screen.getByTestId("entity-form");
    expect(form).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(form.className).toContain("opacity-60");
    expect(form.className).not.toContain("transition-opacity");
    expect(form.className).not.toContain("duration-200");
  });

  it("keeps the previous effect form shape during a loading transition", () => {
    expect(() =>
      render(
        <EntityWorkspace
          workspace={makeWorkspace({
            mode: "loading",
            entityType: "effect",
            data: { name: "Barbarian Roar" },
            formValues: {
              name: "Barbarian Roar",
              timingType: "instant",
              effectType: "buff",
              intervalTicks: null,
              triggerCount: null,
            },
          })}
          {...defaultProps}
        />,
      ),
    ).not.toThrow();

    expect(screen.getByTestId("entity-form")).toBeInTheDocument();
    expect(screen.getByTestId("entity-name-input")).toHaveValue("Barbarian Roar");
  });

  it("calls onFieldChange when name is modified", async () => {
    const onFieldChange = vi.fn();
    render(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "edit",
          entityType: "effect",
          entityId: "123",
          data: { name: "Test" },
          formValues: {
            name: "Test",
            timingType: "instant",
            effectType: "buff",
            intervalTicks: null,
            triggerCount: null,
          },
        })}
        onFieldChange={onFieldChange}
        onSave={vi.fn()}
        isSaving={false}
        saveError={null}
      />,
    );
    const input = screen.getByTestId("entity-name-input");
    await userEvent.type(input, "X");
    // The controlled input appends to existing value since parent doesn't re-render
    expect(onFieldChange).toHaveBeenCalledWith("name", "TestX");
  });

  it("renders effect editor with dropdowns and disabled interval fields for instant timing", () => {
    render(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "create",
          entityType: "effect",
          formValues: {
            name: "",
            timingType: "instant",
            effectType: "buff",
            intervalTicks: null,
            triggerCount: null,
          },
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByTestId("effect-timing-type-select")).toBeInTheDocument();
    expect(screen.getByTestId("effect-effect-type-select")).toBeInTheDocument();
    expect(screen.getByTestId("effect-intervalTicks-input")).toBeDisabled();
    expect(screen.getByTestId("effect-triggerCount-input")).toBeDisabled();
    expect(screen.getByTestId("entity-save-button")).toHaveTextContent("Create Effect");
  });

  it("renders the item editor with effect picker and stat inputs", () => {
    render(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "create",
          entityType: "item",
          formValues: {
            name: "",
            meleeDmg: "0",
            rangedDmg: "0",
            manaRegen: "0",
            spellDmg: "0",
            dodge: "0",
            criticalChance: "0",
            activationManaCost: "0",
            activationHealthCost: "0",
            effectIds: [],
          },
        })}
        effectOptions={[{ id: "eff-1", name: "Burn", effectType: "damage" }]}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("New Item")).toBeInTheDocument();
    expect(screen.getByTestId("item-effect-picker")).toBeInTheDocument();
    expect(screen.getByTestId("item-meleeDmg-input")).toBeInTheDocument();
    expect(screen.getByTestId("entity-save-button")).toHaveTextContent("Create Item");
  });

  it("renders the unit editor with item picker and stat inputs", () => {
    render(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "create",
          entityType: "unit",
          formValues: {
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
            targetSide: "enemies",
            targetPolicy: "highest_health",
            targetRowCount: 1,
            maxTargetsPerRow: 1,
            targetOnlyAdjacent: false,
            allowedRowTypes: [],
          },
        })}
        itemOptions={[{ id: "it-1", name: "Iron Sword" }]}
        {...defaultProps}
      />,
    );

    expect(screen.getByText("New Unit")).toBeInTheDocument();
    expect(screen.getByTestId("unit-item-picker")).toBeInTheDocument();
    expect(screen.getByTestId("unit-health-input")).toBeInTheDocument();
    expect(screen.getByTestId("entity-save-button")).toHaveTextContent("Create Unit");
  });

  it("routes linked item effects and unit items to their builder tabs", async () => {
    const user = userEvent.setup();
    const onEditLinkedEntity = vi.fn();
    const { rerender } = render(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "edit",
          entityType: "item",
          entityId: "it-1",
          data: { name: "Staff", effectIds: ["eff-1"] },
          formValues: {
            name: "Staff",
            meleeDmg: "0",
            rangedDmg: "0",
            manaRegen: "0",
            spellDmg: "0",
            dodge: "0",
            criticalChance: "0",
            activationManaCost: "0",
            activationHealthCost: "0",
            effectIds: ["eff-1"],
          },
        })}
        effectOptions={[{ id: "eff-1", name: "Burn", effectType: "damage" }]}
        onEditLinkedEntity={onEditLinkedEntity}
        {...defaultProps}
      />,
    );

    await user.click(screen.getByTestId("item-effect-edit-0"));
    expect(onEditLinkedEntity).toHaveBeenCalledWith("Effects", "eff-1");

    rerender(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "edit",
          entityType: "unit",
          entityId: "unit-1",
          data: { name: "Guard", itemIds: ["it-1"] },
          formValues: {
            name: "Guard",
            meleeDmg: "0",
            health: "100",
            rangedDmg: "0",
            manaRegen: "0",
            spellDmg: "0",
            speed: "0",
            dodge: "0",
            criticalChance: "0",
            itemIds: ["it-1"],
            targetSide: "enemies",
            targetPolicy: "highest_health",
            targetRowCount: 1,
            maxTargetsPerRow: 1,
            targetOnlyAdjacent: false,
            allowedRowTypes: [],
          },
        })}
        itemOptions={[{ id: "it-1", name: "Staff" }]}
        onEditLinkedEntity={onEditLinkedEntity}
        {...defaultProps}
      />,
    );

    await user.click(screen.getByTestId("unit-item-edit-0"));
    expect(onEditLinkedEntity).toHaveBeenCalledWith("Items", "it-1");
  });

  it("forwards chip background clicks to the native select picker", async () => {
    const user = userEvent.setup();

    render(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "create",
          entityType: "effect",
          formValues: {
            name: "",
            timingType: "instant",
            effectType: "buff",
            intervalTicks: null,
            triggerCount: null,
          },
        })}
        {...defaultProps}
      />,
    );

    const timingChip = screen.getByTestId("effect-timing-type-chip");
    const timingSelect = screen.getByTestId("effect-timing-type-select") as HTMLSelectElement & {
      showPicker?: () => void;
    };
    const showPicker = vi.fn();

    timingSelect.showPicker = showPicker;

    await user.click(timingChip);

    expect(showPicker).toHaveBeenCalledOnce();
    expect(timingSelect).toHaveFocus();
  });

  it("keeps the chip functional when showPicker throws", async () => {
    const user = userEvent.setup();

    render(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "create",
          entityType: "effect",
          formValues: {
            name: "",
            timingType: "instant",
            effectType: "buff",
            intervalTicks: null,
            triggerCount: null,
          },
        })}
        {...defaultProps}
      />,
    );

    const timingChip = screen.getByTestId("effect-timing-type-chip");
    const timingSelect = screen.getByTestId("effect-timing-type-select") as HTMLSelectElement & {
      showPicker?: () => void;
    };

    timingSelect.showPicker = vi.fn(() => {
      throw new DOMException("Blocked", "NotAllowedError");
    });

    await expect(user.click(timingChip)).resolves.toBeUndefined();
    expect(timingSelect).toHaveFocus();
  });

  it("renders the one time effect group in four columns", () => {
    render(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "create",
          entityType: "effect",
          formValues: {
            name: "",
            timingType: "instant",
            effectType: "damage",
            intervalTicks: null,
            triggerCount: null,
          },
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByTestId("effect-group-one-time-effect").className).toContain("grid-cols-4");
  });

  it("enables interval fields when timing type is interval", () => {
    render(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "edit",
          entityType: "effect",
          entityId: "e1",
          data: { name: "Rage" },
          formValues: {
            name: "Rage",
            timingType: "interval",
            effectType: "buff",
            intervalTicks: 1000,
            triggerCount: 3,
          },
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByTestId("effect-intervalTicks-input")).toBeEnabled();
    expect(screen.getByTestId("effect-triggerCount-input")).toBeEnabled();
    expect(screen.getByTestId("entity-save-button")).toHaveTextContent("Save Changes");
  });

  it("shows mutation error for effect saves", () => {
    render(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "edit",
          entityType: "effect",
          entityId: "e1",
          data: { name: "Rage" },
          formValues: {
            name: "Rage",
            timingType: "interval",
            effectType: "buff",
            intervalTicks: 1000,
            triggerCount: 3,
          },
        })}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        saveError="An effect with this name already exists."
      />,
    );

    expect(screen.getByTestId("entity-save-error")).toHaveTextContent("already exists");
  });
});
