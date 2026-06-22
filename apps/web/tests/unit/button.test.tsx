import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "~/components/ui/button";

describe("Button", () => {
  it("renders with text content", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });
});
