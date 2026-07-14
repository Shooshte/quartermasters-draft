import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EntityPickerPopover } from "~/components/create/entity-picker-popover";

const options = [
  { id: "1", name: "Arcane Damage" },
  { id: "2", name: "Astral Ward" },
  { id: "3", name: "Battle Cry" },
  { id: "4", name: "Dark Pact" },
  { id: "5", name: "Ember Shield" },
  { id: "6", name: "Frostbite" },
];

function renderPopover() {
  const onSelect = vi.fn();
  render(
    <EntityPickerPopover
      pickerTestId="effect-picker"
      searchTestId="effect-search"
      emptyTestId="effect-empty"
      optionTestIdPrefix="effect-option"
      options={options}
      selectedId=""
      onSelect={onSelect}
      searchPlaceholder="Search effects..."
      triggerPlaceholder="Select effect"
      listboxLabel="Effect options"
      emptyMessage="No effects found."
    />,
  );

  return { onSelect };
}

describe("EntityPickerPopover", () => {
  it("associates an external label with the combobox trigger", () => {
    render(
      <>
        <label htmlFor="effect-picker-trigger">Effect</label>
        <EntityPickerPopover
          pickerTestId="effect-picker"
          searchTestId="effect-search"
          emptyTestId="effect-empty"
          optionTestIdPrefix="effect-option"
          options={options}
          selectedId=""
          onSelect={vi.fn()}
          searchPlaceholder="Search effects..."
          triggerPlaceholder="Select effect"
          listboxLabel="Effect options"
          emptyMessage="No effects found."
          triggerId="effect-picker-trigger"
        />
      </>,
    );

    expect(screen.getByRole("combobox", { name: "Effect" })).toBeVisible();
  });

  it("focuses the search input on open and caps visible options at five", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByTestId("effect-picker"));

    const search = screen.getByTestId("effect-search");
    await waitFor(() => expect(search).toHaveFocus());
    expect(screen.getByRole("listbox", { name: "Effect options" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(5);
  });

  it("filters options, keeps the placeholder out of the list, and reports selection", async () => {
    const user = userEvent.setup();
    const { onSelect } = renderPopover();

    await user.click(screen.getByTestId("effect-picker"));
    await user.type(screen.getByTestId("effect-search"), "frost");

    expect(screen.getByRole("option", { name: "Frostbite" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Search effects..." })).not.toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Frostbite" }));
    expect(onSelect).toHaveBeenCalledWith("6");
  });

  it("clears the search value when the popover closes", async () => {
    const user = userEvent.setup();
    renderPopover();

    await user.click(screen.getByTestId("effect-picker"));
    await user.type(screen.getByTestId("effect-search"), "ward");
    await user.click(screen.getByTestId("effect-picker"));
    await user.click(screen.getByTestId("effect-picker"));

    expect(screen.getByTestId("effect-search")).toHaveValue("");
  });
});
