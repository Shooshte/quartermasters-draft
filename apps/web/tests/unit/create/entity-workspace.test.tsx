import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    render(
      <EntityWorkspace
        workspace={makeWorkspace({ mode: "loading" })}
        {...defaultProps}
      />,
    );
    expect(screen.getByTestId("entity-loading")).toBeInTheDocument();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows not-found state", () => {
    render(
      <EntityWorkspace
        workspace={makeWorkspace({ mode: "not-found" })}
        {...defaultProps}
      />,
    );
    expect(screen.getByTestId("entity-not-found")).toBeInTheDocument();
    expect(screen.getByText("Entity not found")).toBeInTheDocument();
  });

  it("shows create mode with empty name", () => {
    render(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "create",
          entityType: "spell",
          formValues: { name: "" },
        })}
        {...defaultProps}
      />,
    );
    expect(screen.getByTestId("entity-form")).toBeInTheDocument();
    expect(screen.getByText("New Spell")).toBeInTheDocument();
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

  it("calls onFieldChange when name is modified", async () => {
    const onFieldChange = vi.fn();
    render(
      <EntityWorkspace
        workspace={makeWorkspace({
          mode: "edit",
          entityType: "spell",
          entityId: "123",
          data: { name: "Test" },
          formValues: { name: "Test" },
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
            intervalMs: null,
            triggerCount: null,
          },
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByTestId("effect-timing-type-select")).toBeInTheDocument();
    expect(screen.getByTestId("effect-effect-type-select")).toBeInTheDocument();
    expect(screen.getByTestId("effect-intervalMs-input")).toBeDisabled();
    expect(screen.getByTestId("effect-triggerCount-input")).toBeDisabled();
    expect(screen.getByTestId("entity-save-button")).toHaveTextContent("Create Effect");
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
            intervalMs: null,
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
            intervalMs: null,
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
            intervalMs: null,
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
            intervalMs: 1000,
            triggerCount: 3,
          },
        })}
        {...defaultProps}
      />,
    );

    expect(screen.getByTestId("effect-intervalMs-input")).toBeEnabled();
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
            intervalMs: 1000,
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
