import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

describe("Popover", () => {
  it("opens and closes through the trigger", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger>Toggle popover</PopoverTrigger>
        <PopoverContent className="custom-popover">Popover body</PopoverContent>
      </Popover>,
    );

    expect(screen.queryByText("Popover body")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));
    expect(screen.getByText("Popover body")).toHaveAttribute("data-slot", "popover-content");
    expect(screen.getByText("Popover body")).toHaveClass("custom-popover");

    await user.click(screen.getByRole("button", { name: "Toggle popover" }));
    expect(screen.queryByText("Popover body")).not.toBeInTheDocument();
  });
});
