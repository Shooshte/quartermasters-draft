import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LibraryPanel } from "~/components/create/library-panel";

function renderPanel(overrides: Partial<React.ComponentProps<typeof LibraryPanel>> = {}) {
  const props: React.ComponentProps<typeof LibraryPanel> = {
    activeTab: "Scenarios",
    perTabSelection: {
      Effects: null,
      Spells: null,
      Items: null,
      Units: null,
      Scenarios: "sc-1",
    },
    listLoading: {
      Effects: false,
      Spells: false,
      Items: false,
      Units: false,
      Scenarios: false,
    },
    listFetching: {
      Effects: false,
      Spells: false,
      Items: false,
      Units: false,
      Scenarios: false,
    },
    onTabChange: vi.fn(),
    onSelectRecord: vi.fn(),
    onCreateNew: vi.fn(),
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
      { id: "ef-1", name: "Arcane Damage", timingType: "instant", effectType: "damage" },
    ],
    effectPage: 1,
    effectTotalPages: 1,
    effectSortBy: "name",
    effectSortDir: "asc",
    onEffectPageChange: vi.fn(),
    onEffectSortChange: vi.fn(),
    onDeleteEffect: vi.fn(),
    spellListItems: [
      {
        id: "sp-1",
        name: "Battle Cry",
        targetPolicy: "random",
        updatedAt: new Date("2025-06-10T00:00:00Z"),
      },
    ],
    spellPage: 1,
    spellTotalPages: 1,
    spellSortBy: "name",
    spellSortDir: "asc",
    onSpellPageChange: vi.fn(),
    onSpellSortChange: vi.fn(),
    onDeleteSpell: vi.fn(),
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
});
