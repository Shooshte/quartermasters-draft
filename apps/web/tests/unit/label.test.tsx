import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

describe("Label", () => {
  it("associates with its control and keeps slot metadata", () => {
    render(
      <div>
        <Label htmlFor="unit-name" className="custom-label">
          Unit Name
        </Label>
        <Input id="unit-name" />
      </div>,
    );

    expect(screen.getByText("Unit Name")).toHaveAttribute("data-slot", "label");
    expect(screen.getByText("Unit Name")).toHaveClass("custom-label");
    expect(screen.getByLabelText("Unit Name")).toHaveAttribute("id", "unit-name");
  });
});
