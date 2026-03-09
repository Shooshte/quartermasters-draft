import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ScenarioLibraryList } from "~/components/create/scenario-library-list";

const now = new Date("2025-06-15T12:00:00Z");
const items = [
  { id: "1", name: "Ambush at Dawn", updatedAt: new Date("2025-06-10T00:00:00Z"), createdAt: new Date("2025-04-01T00:00:00Z") },
  { id: "2", name: "Castle Siege", updatedAt: new Date("2025-06-12T00:00:00Z"), createdAt: new Date("2025-05-01T00:00:00Z") },
];

const defaultProps = {
  items,
  isLoading: false,
  selectedId: null as string | null,
  page: 1,
  totalPages: 1,
  sortBy: "name" as const,
  sortDir: "asc" as const,
  onSelect: vi.fn(),
  onCreateNew: vi.fn(),
  onDelete: vi.fn(),
  onPageChange: vi.fn(),
  onSortChange: vi.fn(),
};

describe("ScenarioLibraryList", () => {
  it("shows loading state", () => {
    render(<ScenarioLibraryList {...defaultProps} items={[]} isLoading={true} />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows empty state with message", () => {
    render(<ScenarioLibraryList {...defaultProps} items={[]} />);
    expect(screen.getByTestId("empty-list")).toBeInTheDocument();
    expect(screen.getByText("No scenario records yet")).toBeInTheDocument();
  });

  it("renders items with name and formatted updatedAt date", () => {
    render(<ScenarioLibraryList {...defaultProps} />);
    expect(screen.getByRole("option", { name: /Ambush at Dawn/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Castle Siege/ })).toBeInTheDocument();
  });

  it("marks selected item with aria-selected", () => {
    render(<ScenarioLibraryList {...defaultProps} selectedId="1" />);
    expect(screen.getByRole("option", { name: /Ambush at Dawn/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("option", { name: /Castle Siege/ })).toHaveAttribute("aria-selected", "false");
  });

  it("calls onSelect when clicking a row", async () => {
    const onSelect = vi.fn();
    render(<ScenarioLibraryList {...defaultProps} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("option", { name: /Ambush at Dawn/ }));
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  it("calls onCreateNew when clicking New Scenario button", async () => {
    const onCreateNew = vi.fn();
    render(<ScenarioLibraryList {...defaultProps} onCreateNew={onCreateNew} />);
    await userEvent.click(screen.getByRole("button", { name: "New Scenario" }));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it("shows sort controls for Name and Last Update", () => {
    render(<ScenarioLibraryList {...defaultProps} />);
    expect(screen.getByRole("button", { name: /Name/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Last Update/ })).toBeInTheDocument();
  });

  it("clicking active sort column toggles direction", async () => {
    const onSortChange = vi.fn();
    render(<ScenarioLibraryList {...defaultProps} sortBy="name" sortDir="asc" onSortChange={onSortChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Name/ }));
    expect(onSortChange).toHaveBeenCalledWith("name", "desc");
  });

  it("clicking inactive sort column activates it ascending", async () => {
    const onSortChange = vi.fn();
    render(<ScenarioLibraryList {...defaultProps} sortBy="name" sortDir="asc" onSortChange={onSortChange} />);
    await userEvent.click(screen.getByRole("button", { name: /Last Update/ }));
    expect(onSortChange).toHaveBeenCalledWith("updatedAt", "asc");
  });

  it("shows pagination controls", () => {
    render(<ScenarioLibraryList {...defaultProps} page={1} totalPages={2} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeInTheDocument();
  });

  it("Previous page is disabled on first page", () => {
    render(<ScenarioLibraryList {...defaultProps} page={1} totalPages={2} />);
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });

  it("Next page is disabled on last page", () => {
    render(<ScenarioLibraryList {...defaultProps} page={2} totalPages={2} />);
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("calls onPageChange when clicking Next page", async () => {
    const onPageChange = vi.fn();
    render(<ScenarioLibraryList {...defaultProps} page={1} totalPages={2} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("calls onPageChange when clicking Previous page", async () => {
    const onPageChange = vi.fn();
    render(<ScenarioLibraryList {...defaultProps} page={2} totalPages={2} onPageChange={onPageChange} />);
    await userEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("shows delete button per row", () => {
    render(<ScenarioLibraryList {...defaultProps} />);
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/ });
    expect(deleteButtons).toHaveLength(2);
  });

  it("calls onDelete with scenario id when delete is clicked", async () => {
    const onDelete = vi.fn();
    render(<ScenarioLibraryList {...defaultProps} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByRole("button", { name: /Delete/ });
    await userEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith("1");
  });
});
