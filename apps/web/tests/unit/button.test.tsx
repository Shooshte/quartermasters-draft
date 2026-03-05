import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "~/components/ui/button";

describe("Button", () => {
  it("renders with text content", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });
});
