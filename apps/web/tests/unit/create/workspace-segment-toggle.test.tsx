import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WorkspaceSegmentToggle } from "~/components/create/workspace-segment-toggle";

const defaultOptions = [
  { value: "all", label: "All" },
  { value: "limit", label: "Limit" },
];

describe("WorkspaceSegmentToggle", () => {
  it("renders all option labels", () => {
    render(<WorkspaceSegmentToggle options={defaultOptions} value="all" onChange={() => {}} />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Limit")).toBeInTheDocument();
  });

  it("marks the active option with data-active true", () => {
    render(
      <WorkspaceSegmentToggle
        options={defaultOptions}
        value="limit"
        onChange={() => {}}
        testId="toggle"
      />,
    );
    expect(screen.getByTestId("toggle-all")).toHaveAttribute("data-active", "false");
    expect(screen.getByTestId("toggle-limit")).toHaveAttribute("data-active", "true");
  });

  it("calls onChange when clicking an inactive option", async () => {
    const onChange = vi.fn();
    render(
      <WorkspaceSegmentToggle
        options={defaultOptions}
        value="all"
        onChange={onChange}
        testId="toggle"
      />,
    );
    await userEvent.click(screen.getByTestId("toggle-limit"));
    expect(onChange).toHaveBeenCalledWith("limit");
  });

  it("does not call onChange when clicking the active option", async () => {
    const onChange = vi.fn();
    render(
      <WorkspaceSegmentToggle
        options={defaultOptions}
        value="all"
        onChange={onChange}
        testId="toggle"
      />,
    );
    await userEvent.click(screen.getByTestId("toggle-all"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("supports testId prop on container", () => {
    render(
      <WorkspaceSegmentToggle
        options={defaultOptions}
        value="all"
        onChange={() => {}}
        testId="my-toggle"
      />,
    );
    expect(screen.getByTestId("my-toggle")).toBeInTheDocument();
  });
});
