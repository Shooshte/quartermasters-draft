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

describe("EntityWorkspace", () => {
  it("shows idle placeholder", () => {
    render(<EntityWorkspace workspace={makeWorkspace()} onFieldChange={vi.fn()} />);
    expect(screen.getByTestId("entity-idle")).toBeInTheDocument();
    expect(screen.getByText("Select an entity from the library")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(
      <EntityWorkspace
        workspace={makeWorkspace({ mode: "loading" })}
        onFieldChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("entity-loading")).toBeInTheDocument();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows not-found state", () => {
    render(
      <EntityWorkspace
        workspace={makeWorkspace({ mode: "not-found" })}
        onFieldChange={vi.fn()}
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
        onFieldChange={vi.fn()}
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
        onFieldChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Effect: Fireball")).toBeInTheDocument();
    expect(screen.getByTestId("entity-name-input")).toHaveValue("Fireball");
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
      />,
    );
    const input = screen.getByTestId("entity-name-input");
    await userEvent.type(input, "X");
    // The controlled input appends to existing value since parent doesn't re-render
    expect(onFieldChange).toHaveBeenCalledWith("name", "TestX");
  });
});
