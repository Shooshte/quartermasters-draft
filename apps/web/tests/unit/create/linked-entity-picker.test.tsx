import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LinkedEntityPicker } from "~/components/create/linked-entity-picker";

const options = [
  { id: "1", name: "Arcane Damage", badgeText: "damage", badgeClassName: "badge-damage" },
  { id: "2", name: "Astral Ward", badgeText: "buff", badgeClassName: "badge-buff" },
  { id: "3", name: "Frostbite", badgeText: "damage", badgeClassName: "badge-damage" },
];

function renderPicker(overrides: Partial<React.ComponentProps<typeof LinkedEntityPicker>> = {}) {
  const onChange = overrides.onChange ?? vi.fn();
  const onEdit = overrides.onEdit ?? vi.fn();

  render(
    <LinkedEntityPicker
      pickerTestId="picker"
      searchTestId="picker-search"
      addButtonTestId="add-button"
      emptyTestId="picker-empty"
      optionTestIdPrefix="picker-option"
      rowTestIdPrefix="picker-row"
      removeTestIdPrefix="picker-remove"
      moveUpTestIdPrefix="picker-up"
      moveDownTestIdPrefix="picker-down"
      editTestIdPrefix="picker-edit"
      options={options}
      linkedIds={[]}
      allowDuplicates={false}
      searchPlaceholder="Search..."
      triggerPlaceholder="Select"
      listboxLabel="Picker options"
      emptyMessage="No options found."
      addButtonLabel="+ Add"
      onChange={onChange}
      onEdit={onEdit}
      {...overrides}
    />,
  );

  return { onChange, onEdit };
}

describe("LinkedEntityPicker", () => {
  it("adds a selected option and keeps duplicates out when disallowed", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPicker();

    await user.click(screen.getByTestId("picker"));
    await user.click(screen.getByTestId("picker-option-1"));
    await user.click(screen.getByTestId("add-button"));

    expect(onChange).toHaveBeenCalledWith(["1"]);
  });

  it("filters already linked options when duplicates are disallowed", async () => {
    const user = userEvent.setup();
    renderPicker({ linkedIds: ["1"] });

    await user.click(screen.getByTestId("picker"));

    expect(screen.queryByTestId("picker-option-1")).not.toBeInTheDocument();
    expect(screen.getByTestId("picker-option-2")).toBeInTheDocument();
  });

  it("allows duplicates when configured", async () => {
    const user = userEvent.setup();
    renderPicker({ linkedIds: ["1"], allowDuplicates: true });

    await user.click(screen.getByTestId("picker"));
    expect(screen.getByTestId("picker-option-1")).toBeInTheDocument();
  });

  it("removes and reorders linked ids", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderPicker({
      linkedIds: ["1", "2"],
      allowDuplicates: true,
      showSequence: true,
      allowReorder: true,
      onChange,
    });

    expect(screen.getByTestId("picker-row-0")).toHaveTextContent("Arcane Damage");
    expect(screen.getByTestId("picker-row-1")).toHaveTextContent("Astral Ward");
    expect(screen.getByTestId("picker-row-0")).toHaveTextContent("1");
    expect(screen.getByText("buff")).toHaveClass("badge-buff");

    await user.click(screen.getByTestId("picker-down-0"));
    expect(onChange).toHaveBeenCalledWith(["2", "1"]);

    await user.click(screen.getByTestId("picker-remove-1"));
    expect(onChange).toHaveBeenCalledWith(["1"]);
  });

  it("edits the selected duplicate occurrence through its accessible edit button", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    renderPicker({ linkedIds: ["1", "1"], allowDuplicates: true, onEdit });

    const editButtons = screen.getAllByRole("button", { name: "Edit Arcane Damage" });
    expect(editButtons).toHaveLength(2);
    expect(screen.getByTestId("picker-edit-1")).toBe(editButtons[1]);

    await user.click(editButtons[1]);

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith("1");
  });
});
