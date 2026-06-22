import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Select } from "~/components/ui/select";

describe("Select", () => {
  it("forwards props, merges classes, and updates value", async () => {
    const user = userEvent.setup();
    render(
      <Select aria-label="Effect type" defaultValue="buff" className="custom-select">
        <option value="buff">Buff</option>
        <option value="damage">Damage</option>
      </Select>,
    );

    const select = screen.getByRole("combobox", { name: "Effect type" });
    expect(select).toHaveAttribute("data-slot", "select");
    expect(select).toHaveClass("custom-select");

    await user.selectOptions(select, "damage");
    expect(select).toHaveValue("damage");
  });
});
