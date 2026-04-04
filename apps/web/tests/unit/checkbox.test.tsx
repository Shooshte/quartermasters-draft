import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "~/components/ui/checkbox";

describe("Checkbox", () => {
  it("renders with slot metadata and toggles checked state", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Accept terms" className="custom-checkbox" />);

    const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
    expect(checkbox).toHaveAttribute("data-slot", "checkbox");
    expect(checkbox).toHaveClass("custom-checkbox");

    await user.click(checkbox);
    expect(checkbox).toHaveAttribute("data-state", "checked");
  });
});
