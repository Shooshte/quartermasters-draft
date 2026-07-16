import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceRowTypePill } from "~/components/create/workspace-row-type-pill";

describe("WorkspaceRowTypePill", () => {
  it("renders the row type label capitalized", () => {
    render(<WorkspaceRowTypePill rowType="ranged" active={false} onClick={() => {}} />);
    expect(screen.getByText("Ranged")).toBeInTheDocument();
  });

  it("sets data-active to true when active", () => {
    render(
      <WorkspaceRowTypePill rowType="melee" active={true} onClick={() => {}} testId="pill-melee" />,
    );
    expect(screen.getByTestId("pill-melee")).toHaveAttribute("data-active", "true");
  });

  it("sets data-active to false when inactive", () => {
    render(
      <WorkspaceRowTypePill rowType="tank" active={false} onClick={() => {}} testId="pill-tank" />,
    );
    expect(screen.getByTestId("pill-tank")).toHaveAttribute("data-active", "false");
  });

  it("calls onClick when clicked", async () => {
    const onClick = vi.fn();
    render(
      <WorkspaceRowTypePill
        rowType="support"
        active={false}
        onClick={onClick}
        testId="pill-support"
      />,
    );
    await userEvent.click(screen.getByTestId("pill-support"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("supports testId prop", () => {
    render(
      <WorkspaceRowTypePill rowType="ranged" active={false} onClick={() => {}} testId="my-pill" />,
    );
    expect(screen.getByTestId("my-pill")).toBeInTheDocument();
  });

  it("applies correct row type class when active", () => {
    render(<WorkspaceRowTypePill rowType="tank" active={true} onClick={() => {}} testId="pill" />);
    const pill = screen.getByTestId("pill");
    expect(pill.classList.contains("tank")).toBe(true);
  });

  it("renders a selected indicator when active", () => {
    render(<WorkspaceRowTypePill rowType="tank" active={true} onClick={() => {}} testId="pill" />);

    expect(screen.getByTestId("pill").querySelector("[data-selected-indicator]")).not.toBeNull();
  });

  it("supports disabling the last eligible row", async () => {
    const onClick = vi.fn();
    render(
      <WorkspaceRowTypePill
        rowType="tank"
        active={true}
        disabled
        onClick={onClick}
        testId="pill"
      />,
    );

    const pill = screen.getByTestId("pill");
    expect(pill).toBeDisabled();
    await userEvent.click(pill);
    expect(onClick).not.toHaveBeenCalled();
  });
});
