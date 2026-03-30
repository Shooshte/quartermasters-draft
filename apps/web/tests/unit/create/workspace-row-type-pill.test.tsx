import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WorkspaceRowTypePill } from "~/components/create/workspace-row-type-pill";

describe("WorkspaceRowTypePill", () => {
  it("renders the row type label capitalized", () => {
    render(
      <WorkspaceRowTypePill rowType="ranged" active={false} onClick={() => {}} />
    );
    expect(screen.getByText("Ranged")).toBeInTheDocument();
  });

  it("sets data-active to true when active", () => {
    render(
      <WorkspaceRowTypePill
        rowType="melee"
        active={true}
        onClick={() => {}}
        testId="pill-melee"
      />
    );
    expect(screen.getByTestId("pill-melee")).toHaveAttribute("data-active", "true");
  });

  it("sets data-active to false when inactive", () => {
    render(
      <WorkspaceRowTypePill
        rowType="tank"
        active={false}
        onClick={() => {}}
        testId="pill-tank"
      />
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
      />
    );
    await userEvent.click(screen.getByTestId("pill-support"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("supports testId prop", () => {
    render(
      <WorkspaceRowTypePill
        rowType="ranged"
        active={false}
        onClick={() => {}}
        testId="my-pill"
      />
    );
    expect(screen.getByTestId("my-pill")).toBeInTheDocument();
  });

  it("applies correct row type class when active", () => {
    render(
      <WorkspaceRowTypePill
        rowType="tank"
        active={true}
        onClick={() => {}}
        testId="pill"
      />
    );
    const pill = screen.getByTestId("pill");
    expect(pill.classList.contains("tank")).toBe(true);
  });
});
