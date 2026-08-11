import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LibraryPanel } from "~/components/create/library-panel";

function renderPanel(overrides: Partial<React.ComponentProps<typeof LibraryPanel>> = {}) {
  const props: React.ComponentProps<typeof LibraryPanel> = {
    activeTab: "Scenarios",
    perTabSelection: {
      Effects: null,
      Items: null,
      Units: null,
      Scenarios: "sc-1",
    },
    listLoading: {
      Effects: false,
      Items: false,
      Units: false,
      Scenarios: false,
    },
    listFetching: {
      Effects: false,
      Items: false,
      Units: false,
      Scenarios: false,
    },
    onTabChange: vi.fn(),
    onSelectRecord: vi.fn(),
    onCreateNew: vi.fn(),
    linkageFilter: { mode: "all" },
    scenarioFilterOptions: [
      { id: "sc-1", name: "Ambush at Dawn" },
      { id: "sc-2", name: "Castle Siege" },
    ],
    onLinkageFilterChange: vi.fn(),
    scenarioListItems: [
      {
        id: "sc-1",
        name: "Ambush at Dawn",
        updatedAt: new Date("2025-06-10T00:00:00Z"),
        createdAt: new Date("2025-05-01T00:00:00Z"),
      },
    ],
    scenarioPage: 1,
    scenarioTotalPages: 1,
    scenarioSortBy: "name",
    scenarioSortDir: "asc",
    onScenarioPageChange: vi.fn(),
    onScenarioSortChange: vi.fn(),
    onDeleteScenario: vi.fn(),
    effectListItems: [
      {
        id: "ef-1",
        name: "Arcane Damage",
        timingType: "instant",
        effectType: "damage",
        needsTimingConfiguration: false,
      },
    ],
    effectPage: 1,
    effectTotalPages: 1,
    effectSortBy: "name",
    effectSortDir: "asc",
    onEffectPageChange: vi.fn(),
    onEffectSortChange: vi.fn(),
    onDeleteEffect: vi.fn(),
    itemListItems: [
      { id: "it-1", name: "Iron Sword", updatedAt: new Date("2025-06-10T00:00:00Z") },
    ],
    itemPage: 1,
    itemTotalPages: 1,
    itemSortBy: "name",
    itemSortDir: "asc",
    onItemPageChange: vi.fn(),
    onItemSortChange: vi.fn(),
    onDeleteItem: vi.fn(),
    unitListItems: [{ id: "un-1", name: "Barbarian", updatedAt: new Date("2025-06-10T00:00:00Z") }],
    unitPage: 1,
    unitTotalPages: 1,
    unitSortBy: "name",
    unitSortDir: "asc",
    onUnitPageChange: vi.fn(),
    onUnitSortChange: vi.fn(),
    onDeleteUnit: vi.fn(),
    ...overrides,
  };

  render(<LibraryPanel {...props} />);
  return props;
}

describe("LibraryPanel", () => {
  it("renders the configured active tab and forwards tab changes", async () => {
    const user = userEvent.setup();
    const props = renderPanel();

    expect(screen.getByTestId("library-panel")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Scenarios" })).toHaveAttribute("data-state", "active");
    expect(screen.getByRole("button", { name: "New Scenario" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: /spell/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Effects" }));
    expect(props.onTabChange).toHaveBeenCalledWith("Effects");
  });

  it("wires create, select, and delete callbacks for the active tab", async () => {
    const user = userEvent.setup();
    const onCreateNew = vi.fn();
    const onSelectRecord = vi.fn();
    const onDeleteScenario = vi.fn();

    renderPanel({ onCreateNew, onSelectRecord, onDeleteScenario });

    await user.click(screen.getByRole("button", { name: "New Scenario" }));
    await user.click(screen.getByRole("button", { name: "Edit Ambush at Dawn" }));
    await user.click(screen.getByRole("button", { name: "Delete Ambush at Dawn" }));

    expect(onCreateNew).toHaveBeenCalledWith("Scenarios");
    expect(onSelectRecord).toHaveBeenCalledWith("Scenarios", "sc-1");
    expect(onDeleteScenario).toHaveBeenCalledWith("sc-1", "Ambush at Dawn");
  });

  it("renders linkage filter controls and forwards mode and scenario changes", async () => {
    const user = userEvent.setup();
    const onLinkageFilterChange = vi.fn();

    renderPanel({ activeTab: "Units", onLinkageFilterChange });

    await user.click(screen.getByRole("button", { name: "Unlinked" }));
    expect(onLinkageFilterChange).toHaveBeenCalledWith({ mode: "unlinked" });

    await user.selectOptions(screen.getByLabelText("Filter by scenario"), "sc-1");
    expect(onLinkageFilterChange).toHaveBeenCalledWith({
      mode: "scenario",
      scenarioId: "sc-1",
    });
  });

  it("does not render the scenario filter selector on the scenarios tab", () => {
    renderPanel({ activeTab: "Scenarios" });

    expect(screen.queryByLabelText("Filter by scenario")).not.toBeInTheDocument();
  });

  it("marks effects whose migrated timing needs repair", () => {
    renderPanel({
      activeTab: "Effects",
      effectListItems: [
        {
          id: "legacy-effect",
          name: "Legacy Poison",
          timingType: "interval",
          effectType: "damage",
          needsTimingConfiguration: true,
        },
      ],
    });

    expect(screen.getByText("Timing needs configuration")).toBeInTheDocument();
  });
});
