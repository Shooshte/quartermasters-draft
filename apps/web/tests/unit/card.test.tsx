import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

describe("Card", () => {
  it("renders all card slots with merged classes", () => {
    render(
      <Card className="custom-card">
        <CardHeader className="custom-header">
          <CardTitle>Stats</CardTitle>
          <CardDescription>Read only</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Body</CardContent>
        <CardFooter className="custom-footer">Footer</CardFooter>
      </Card>,
    );

    expect(screen.getByText("Stats").closest("[data-slot='card-title']")).toHaveTextContent("Stats");
    expect(screen.getByText("Read only")).toHaveAttribute("data-slot", "card-description");
    expect(screen.getByText("Action")).toHaveAttribute("data-slot", "card-action");
    expect(screen.getByText("Body")).toHaveAttribute("data-slot", "card-content");
    expect(screen.getByText("Footer")).toHaveAttribute("data-slot", "card-footer");
    expect(screen.getByText("Footer")).toHaveClass("custom-footer");
    expect(screen.getByText("Stats").closest("[data-slot='card']")).toHaveClass("custom-card");
    expect(screen.getByText("Stats").closest("[data-slot='card-header']")).toHaveClass("custom-header");
  });
});
