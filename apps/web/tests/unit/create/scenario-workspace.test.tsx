import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
  const unitOptions = [
    { id: "u-1", name: "Barbarian" },
    { id: "u-2", name: "Mage" },
    { id: "u-3", name: "Ranger" },
    { id: "u-4", name: "Samurai" },
    { id: "u-5", name: "Templar" },
    { id: "u-6", name: "Undead Knight" },
  ];

  it("shows idle placeholder", () => {
    render(
      <ScenarioWorkspace
        workspace={makeWorkspace()}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        saveError={null}
        unitOptions={unitOptions}
      />,
    );
    expect(screen.getByTestId("scenario-idle")).toBeInTheDocument();
    expect(screen.getByText("Select a scenario from the library")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(
      <ScenarioWorkspace
        workspace={makeWorkspace({ mode: "loading" })}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        saveError={null}
        unitOptions={unitOptions}
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
        onSave={vi.fn()}
        isSaving={false}
        saveError={null}
        unitOptions={unitOptions}
      />,
    );
    expect(screen.getByTestId("scenario-not-found")).toBeInTheDocument();
    expect(screen.getByText("Scenario not found")).toBeInTheDocument();
  });

  it("shows create mode with empty name, 4 empty rows, and blocked save", () => {
    render(
      <ScenarioWorkspace
        workspace={makeWorkspace({
          mode: "create",
          entityType: "scenario",
          formValues: {
            name: "",
            rows: [
              { rowType: "ranged", unitIds: [] },
              { rowType: "support", unitIds: [] },
              { rowType: "melee", unitIds: [] },
              { rowType: "tank", unitIds: [] },
            ],
          },
        })}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        saveError={null}
        unitOptions={unitOptions}
      />,
    );
    expect(screen.getByText("New Scenario")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-name-input")).toHaveValue("");
    expect(screen.getByTestId("scenario-row-tank")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-row-melee")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-row-ranged")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-row-support")).toBeInTheDocument();
    expect(screen.getByText("Name is required to save")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-save-button")).toBeDisabled();
  });

  it("shows edit mode with populated name, row slots, and save button", () => {
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
              {
                id: "r2",
                rowType: "melee",
                assignments: [
                  { assignmentId: "a1", unitId: "u-1", unitName: "Barbarian", position: 1 },
                ],
              },
              {
                id: "r3",
                rowType: "ranged",
                assignments: [{ assignmentId: "a2", unitId: "u-2", unitName: "Mage", position: 1 }],
              },
              {
                id: "r4",
                rowType: "support",
                assignments: [
                  { assignmentId: "a3", unitId: "u-3", unitName: "Ranger", position: 1 },
                ],
              },
            ],
          },
          formValues: {
            name: "Ambush at Dawn",
            rows: [
              { rowType: "ranged", unitIds: ["u-2"] },
              { rowType: "support", unitIds: ["u-3"] },
              { rowType: "melee", unitIds: ["u-1"] },
              { rowType: "tank", unitIds: [] },
            ],
          },
        })}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        saveError={null}
        unitOptions={unitOptions}
      />,
    );
    expect(screen.getByText("Scenario: Ambush at Dawn")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-name-input")).toHaveValue("Ambush at Dawn");
    expect(screen.getByTestId("scenario-row-tank")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-row-melee")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-row-ranged")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-row-support")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-row-melee-slot-1")).toHaveTextContent("Barbarian");
    expect(screen.getByTestId("scenario-row-ranged-slot-1")).toHaveTextContent("Mage");
    expect(screen.getByTestId("scenario-row-support-slot-1")).toHaveTextContent("Ranger");
    expect(screen.getByTestId("scenario-save-button")).toBeEnabled();
  });

  it("keeps previous content visible without opacity transition when loading with previous content", () => {
    render(
      <ScenarioWorkspace
        workspace={makeWorkspace({
          mode: "loading",
          data: { name: "Fireball", rows: [] },
          formValues: {
            name: "Fireball",
            rows: [
              { rowType: "ranged", unitIds: [] },
              { rowType: "support", unitIds: [] },
              { rowType: "melee", unitIds: [] },
              { rowType: "tank", unitIds: [] },
            ],
          },
        })}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        isSaving={false}
        saveError={null}
        unitOptions={unitOptions}
      />,
    );
    const form = screen.getByTestId("scenario-form");
    expect(form).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(form.className).toContain("opacity-60");
    expect(form.className).not.toContain("transition-opacity");
    expect(form.className).not.toContain("duration-200");
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
          formValues: {
            name: "Test",
            rows: [
              { rowType: "ranged", unitIds: [] },
              { rowType: "support", unitIds: [] },
              { rowType: "melee", unitIds: [] },
              { rowType: "tank", unitIds: [] },
            ],
          },
        })}
        onFieldChange={onFieldChange}
        onSave={vi.fn()}
        isSaving={false}
        saveError={null}
        unitOptions={unitOptions}
      />,
    );
    const input = screen.getByTestId("scenario-name-input");
    await userEvent.type(input, "X");
    expect(onFieldChange).toHaveBeenCalledWith("name", "TestX");
  });

  it("allows adding, removing, and reordering units within a row", async () => {
    const user = userEvent.setup();
    const onFieldChange = vi.fn();

    render(
      <ScenarioWorkspace
        workspace={makeWorkspace({
          mode: "edit",
          entityType: "scenario",
          entityId: "123",
          data: {
            name: "Castle Siege",
            rows: [
              { id: "r1", rowType: "tank", assignments: [] },
              {
                id: "r2",
                rowType: "melee",
                assignments: [
                  { assignmentId: "a1", unitId: "u-1", unitName: "Barbarian", position: 1 },
                  { assignmentId: "a2", unitId: "u-4", unitName: "Samurai", position: 2 },
                ],
              },
              { id: "r3", rowType: "ranged", assignments: [] },
              { id: "r4", rowType: "support", assignments: [] },
            ],
          },
          formValues: {
            name: "Castle Siege",
            rows: [
              { rowType: "ranged", unitIds: [] },
              { rowType: "support", unitIds: [] },
              { rowType: "melee", unitIds: ["u-1", "u-4"] },
              { rowType: "tank", unitIds: [] },
            ],
          },
        })}
        onFieldChange={onFieldChange}
        onSave={vi.fn()}
        isSaving={false}
        saveError={null}
        unitOptions={unitOptions}
      />,
    );

    await user.click(screen.getByTestId("scenario-row-melee-move-up-2"));
    expect(onFieldChange).toHaveBeenCalledWith("rows", [
      { rowType: "ranged", unitIds: [] },
      { rowType: "support", unitIds: [] },
      { rowType: "melee", unitIds: ["u-4", "u-1"] },
      { rowType: "tank", unitIds: [] },
    ]);

    await user.click(screen.getByTestId("scenario-row-melee-remove-2"));
    expect(onFieldChange).toHaveBeenCalledWith("rows", [
      { rowType: "ranged", unitIds: [] },
      { rowType: "support", unitIds: [] },
      { rowType: "melee", unitIds: ["u-1"] },
      { rowType: "tank", unitIds: [] },
    ]);
  });

  it("shows duplicate save errors and saving state", () => {
    render(
      <ScenarioWorkspace
        workspace={makeWorkspace({
          mode: "create",
          entityType: "scenario",
          formValues: {
            name: "Ambush at Dawn",
            rows: [
              { rowType: "ranged", unitIds: [] },
              { rowType: "support", unitIds: [] },
              { rowType: "melee", unitIds: [] },
              { rowType: "tank", unitIds: [] },
            ],
          },
        })}
        onFieldChange={vi.fn()}
        onSave={vi.fn()}
        isSaving={true}
        saveError="A scenario with this name already exists"
        unitOptions={unitOptions}
      />,
    );

    expect(screen.getByTestId("scenario-save-error")).toHaveTextContent(
      "A scenario with this name already exists",
    );
    expect(screen.getByTestId("scenario-save-button")).toHaveTextContent("Saving...");
  });
});
