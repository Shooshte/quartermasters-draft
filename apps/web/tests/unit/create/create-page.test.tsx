import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CreatePage } from "~/components/create/create-page";
import { createMockPageState } from "./fixtures";

const navigateSpy = vi.fn();
const useCreatePageStateSpy = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateSpy,
}));

vi.mock("~/components/create/use-create-page-state", () => ({
  useCreatePageState: (...args: unknown[]) => useCreatePageStateSpy(...args),
}));

describe("CreatePage", () => {
  it("renders scenario and entity workspaces, library panel state, and configured delete dialogs", () => {
    useCreatePageStateSpy.mockReturnValue(createMockPageState());

    render(<CreatePage search={{ tab: "Scenarios", scenario_id: "sc-1" }} />);

    expect(useCreatePageStateSpy).toHaveBeenCalledWith(
      { tab: "Scenarios", scenario_id: "sc-1" },
      expect.any(Function),
    );
    expect(screen.getByTestId("library-panel")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("entity-workspace")).toBeInTheDocument();
    expect(screen.getByTestId("workspace-divider")).toBeInTheDocument();
    expect(screen.getByTestId("unsaved-changes-dialog")).toBeInTheDocument();
    expect(screen.getAllByTestId("delete-confirm-dialog")).toHaveLength(5);
    expect(screen.getByText("scenario delete error")).toBeInTheDocument();
    expect(screen.getByText("effect delete error")).toBeInTheDocument();
  });
});
