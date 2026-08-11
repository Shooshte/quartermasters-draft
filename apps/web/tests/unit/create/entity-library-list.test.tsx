import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EffectLibraryList } from "~/components/create/effect-library-list";
import { EntityLibraryList } from "~/components/create/entity-library-list";
import { ItemLibraryList } from "~/components/create/item-library-list";
import { ScenarioLibraryList } from "~/components/create/scenario-library-list";
import { UnitLibraryList } from "~/components/create/unit-library-list";

describe("EntityLibraryList", () => {
  const items = [
    { id: "1", name: "Arcane Damage", updatedAt: new Date("2025-06-10T00:00:00Z") },
    { id: "2", name: "Astral Ward", updatedAt: new Date("2025-06-12T00:00:00Z") },
  ];

  const defaultProps = {
    entityLabel: "effect",
    items,
    isLoading: false,
    isFetching: false,
    selectedId: "1",
    page: 1,
    totalPages: 2,
    sortBy: "name",
    sortDir: "asc" as const,
    onSelect: vi.fn(),
    onCreateNew: vi.fn(),
    onDelete: vi.fn(),
    onPageChange: vi.fn(),
    onSortChange: vi.fn(),
    getRowLabel: (item: (typeof items)[number]) => item.name,
    getDeleteLabel: (item: (typeof items)[number]) => item.name,
    columns: [
      {
        key: "name",
        label: "Name",
        renderCell: (item: (typeof items)[number]) => item.name,
      },
      {
        key: "updatedAt",
        label: "Updated At",
        renderCell: (item: (typeof items)[number]) => item.updatedAt.toLocaleDateString("en-US"),
      },
    ],
  };

  it("renders loading and empty states", () => {
    const { rerender } = render(
      <EntityLibraryList {...defaultProps} isLoading={true} items={[]} />,
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    rerender(<EntityLibraryList {...defaultProps} items={[]} />);
    expect(screen.getByTestId("empty-list")).toBeInTheDocument();
    expect(screen.getByText("No effect records yet")).toBeInTheDocument();
  });

  it("renders rows, sort controls, fetching dimming, and pagination", async () => {
    const user = userEvent.setup();
    const onSortChange = vi.fn();
    const onPageChange = vi.fn();
    const onSelect = vi.fn();
    const onDelete = vi.fn();

    render(
      <EntityLibraryList
        {...defaultProps}
        isFetching={true}
        onSortChange={onSortChange}
        onPageChange={onPageChange}
        onSelect={onSelect}
        onDelete={onDelete}
      />,
    );

    const selectedRow = screen.getByRole("row", { name: /Arcane Damage/ });
    expect(selectedRow).toHaveAttribute("aria-selected", "true");
    expect(selectedRow.className).toContain("bg-accent");
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Name/ })).toBeInTheDocument();
    expect(screen.getByRole("table").parentElement?.parentElement).toHaveClass(
      "pointer-events-none",
    );

    await user.click(screen.getByRole("button", { name: /Name/ }));
    await user.click(screen.getByRole("button", { name: "Next page" }));
    await user.click(screen.getByRole("button", { name: "Edit Arcane Damage" }));
    await user.click(screen.getByRole("button", { name: "Delete Arcane Damage" }));

    expect(onSortChange).toHaveBeenCalledWith("name", "desc");
    expect(onPageChange).toHaveBeenCalledWith(2);
    expect(onSelect).toHaveBeenCalledWith("1");
    expect(onDelete).toHaveBeenCalledWith("1", "Arcane Damage");
  });
});

describe("Library list wrappers", () => {
  it("keeps scenario-specific copy and delete payloads", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(
      <ScenarioLibraryList
        items={[
          {
            id: "s1",
            name: "Ambush at Dawn",
            updatedAt: new Date("2025-06-10T00:00:00Z"),
            createdAt: new Date("2025-05-01T00:00:00Z"),
          },
        ]}
        isLoading={false}
        isFetching={false}
        selectedId={null}
        page={1}
        totalPages={1}
        sortBy="name"
        sortDir="asc"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onDelete={onDelete}
        onPageChange={vi.fn()}
        onSortChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "New Scenario" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Last Update/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete Ambush at Dawn" }));
    expect(onDelete).toHaveBeenCalledWith("s1", "Ambush at Dawn");
  });

  it("keeps effect, item, and unit labels intact", () => {
    const { rerender } = render(
      <EffectLibraryList
        items={[
          {
            id: "e1",
            name: "Arcane Damage",
            timingType: "instant",
            effectType: "damage",
            needsTimingConfiguration: false,
          },
        ]}
        isLoading={false}
        isFetching={false}
        selectedId={null}
        page={1}
        totalPages={1}
        sortBy="name"
        sortDir="asc"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onDelete={vi.fn()}
        onPageChange={vi.fn()}
        onSortChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "New Effect" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Timing Type/ })).toBeInTheDocument();

    rerender(
      <ItemLibraryList
        items={[{ id: "it1", name: "Iron Sword", updatedAt: new Date("2025-06-10T00:00:00Z") }]}
        isLoading={false}
        isFetching={false}
        selectedId={null}
        page={1}
        totalPages={1}
        sortBy="name"
        sortDir="asc"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onDelete={vi.fn()}
        onPageChange={vi.fn()}
        onSortChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "New Item" })).toBeInTheDocument();

    rerender(
      <UnitLibraryList
        items={[{ id: "u1", name: "Barbarian", updatedAt: new Date("2025-06-10T00:00:00Z") }]}
        isLoading={false}
        isFetching={false}
        selectedId={null}
        page={1}
        totalPages={1}
        sortBy="name"
        sortDir="asc"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
        onDelete={vi.fn()}
        onPageChange={vi.fn()}
        onSortChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "New Unit" })).toBeInTheDocument();
  });
});
