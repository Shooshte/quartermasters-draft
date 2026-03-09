import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteConfirmDialog } from "~/components/create/delete-confirm-dialog";

describe("DeleteConfirmDialog", () => {
  it("renders dialog when open", () => {
    render(
      <DeleteConfirmDialog
        open={true}
        scenarioName="Ambush at Dawn"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByTestId("delete-confirm-dialog")).toBeInTheDocument();
    expect(screen.getByText(/Ambush at Dawn/)).toBeInTheDocument();
  });

  it("does not render when closed", () => {
    render(
      <DeleteConfirmDialog
        open={false}
        scenarioName="Ambush at Dawn"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("delete-confirm-dialog")).not.toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const onCancel = vi.fn();
    render(
      <DeleteConfirmDialog
        open={true}
        scenarioName="Ambush at Dawn"
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onConfirm when Delete is clicked", async () => {
    const onConfirm = vi.fn();
    render(
      <DeleteConfirmDialog
        open={true}
        scenarioName="Ambush at Dawn"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("renders error message when errorMessage prop is provided", () => {
    render(
      <DeleteConfirmDialog
        open={true}
        scenarioName="Ambush at Dawn"
        errorMessage="Failed to delete scenario. Please try again."
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText("Failed to delete scenario. Please try again.")).toBeInTheDocument();
  });
});
