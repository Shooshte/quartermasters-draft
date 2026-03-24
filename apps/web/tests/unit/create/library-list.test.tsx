import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LibraryList } from "~/components/create/library-list";

const items = [
  { id: "1", name: "Alpha" },
  { id: "2", name: "Beta" },
];

describe("LibraryList", () => {
  it("shows loading state", () => {
    render(
      <LibraryList
        items={[]}
        isLoading={true}
        selectedId={null}
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows empty state with create button", () => {
    render(
      <LibraryList
        items={[]}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    expect(screen.getByText("No effect records yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create the first effect" })).toBeInTheDocument();
  });

  it("renders items with New button", () => {
    render(
      <LibraryList
        items={items}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "New Effect" })).toBeInTheDocument();
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("marks selected item with aria-selected on table row", () => {
    render(
      <LibraryList
        items={items}
        isLoading={false}
        selectedId="1"
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    expect(screen.getByRole("row", { name: /Alpha/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("row", { name: /Beta/ })).toHaveAttribute("aria-selected", "false");
  });

  it("calls onSelect when clicking a table row", async () => {
    const onSelect = vi.fn();
    render(
      <LibraryList
        items={items}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={onSelect}
        onCreateNew={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByText("Alpha"));
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  it("calls onSelect when clicking the edit button", async () => {
    const onSelect = vi.fn();
    render(
      <LibraryList
        items={items}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={onSelect}
        onCreateNew={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Edit Alpha/ }));
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  it("calls onCreateNew when clicking the New button", async () => {
    const onCreateNew = vi.fn();
    render(
      <LibraryList
        items={items}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={onCreateNew}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "New Effect" }));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it("calls onCreateNew from empty state button", async () => {
    const onCreateNew = vi.fn();
    render(
      <LibraryList
        items={[]}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={onCreateNew}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Create the first effect" }));
    expect(onCreateNew).toHaveBeenCalled();
  });

  it("shows edit button per row", () => {
    render(
      <LibraryList
        items={items}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    const editButtons = screen.getAllByRole("button", { name: /Edit/ });
    expect(editButtons).toHaveLength(2);
  });

  it("applies overflow-y-auto to the table container", () => {
    render(
      <LibraryList
        items={items}
        isLoading={false}
        selectedId={null}
        singularLabel="Effect"
        onSelect={vi.fn()}
        onCreateNew={vi.fn()}
      />,
    );
    const tableContainer = screen.getByRole("table").parentElement;
    expect(tableContainer?.className).toContain("overflow-y-auto");
  });
});
