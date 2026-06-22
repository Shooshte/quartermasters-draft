import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "~/components/ui/input";

describe("Input", () => {
  it("forwards props and merges classes", () => {
    render(<Input aria-label="Character name" defaultValue="Barbarian" className="custom-input" />);

    const input = screen.getByRole("textbox", { name: "Character name" });
    expect(input).toHaveAttribute("data-slot", "input");
    expect(input).toHaveValue("Barbarian");
    expect(input).toHaveClass("custom-input");
  });
});
