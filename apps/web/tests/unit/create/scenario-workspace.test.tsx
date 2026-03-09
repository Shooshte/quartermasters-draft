import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScenarioWorkspace } from "~/components/create/scenario-workspace";
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

describe("ScenarioWorkspace", () => {
  it("shows idle placeholder", () => {
    render(<ScenarioWorkspace workspace={makeWorkspace()} onFieldChange={vi.fn()} />);
    expect(screen.getByTestId("scenario-idle")).toBeInTheDocument();
    expect(screen.getByText("Select a scenario from the library")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(
      <ScenarioWorkspace
        workspace={makeWorkspace({ mode: "loading" })}
        onFieldChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("scenario-loading")).toBeInTheDocument();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows not-found state", () => {
    render(
      <ScenarioWorkspace
        workspace={makeWorkspace({ mode: "not-found" })}
        onFieldChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("scenario-not-found")).toBeInTheDocument();
    expect(screen.getByText("Scenario not found")).toBeInTheDocument();
  });

  it("shows create mode with empty name and 4 empty rows", () => {
    render(
      <ScenarioWorkspace
        workspace={makeWorkspace({
          mode: "create",
          entityType: "scenario",
          formValues: { name: "" },
        })}
        onFieldChange={vi.fn()}
      />,
    );
    expect(screen.getByText("New Scenario")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-name-input")).toHaveValue("");
    expect(screen.getByTestId("scenario-row-tank")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-row-melee")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-row-ranged")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-row-support")).toBeInTheDocument();
  });

  it("shows edit mode with populated name and rows from data", () => {
    render(
      <ScenarioWorkspace
        workspace={makeWorkspace({
          mode: "edit",
          entityType: "scenario",
          entityId: "123",
          data: {
            name: "Ambush at Dawn",
            rows: [
              { id: "r1", rowType: "tank", assignments: [] },
              { id: "r2", rowType: "melee", assignments: [] },
              { id: "r3", rowType: "ranged", assignments: [] },
              { id: "r4", rowType: "support", assignments: [] },
            ],
          },
          formValues: { name: "Ambush at Dawn" },
        })}
        onFieldChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Scenario: Ambush at Dawn")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");
    expect(screen.getByTestId("scenario-row-tank")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-row-melee")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-row-ranged")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-row-support")).toBeInTheDocument();
  });

  it("calls onFieldChange when name is modified", async () => {
    const onFieldChange = vi.fn();
    render(
      <ScenarioWorkspace
        workspace={makeWorkspace({
          mode: "edit",
          entityType: "scenario",
          entityId: "123",
          data: { name: "Test", rows: [] },
          formValues: { name: "Test" },
        })}
        onFieldChange={onFieldChange}
      />,
    );
    const input = screen.getByTestId("scenario-name-input");
    await userEvent.type(input, "X");
    expect(onFieldChange).toHaveBeenCalledWith("name", "TestX");
  });
});
