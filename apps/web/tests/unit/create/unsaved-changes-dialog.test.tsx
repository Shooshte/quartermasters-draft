import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UnsavedChangesDialog } from "~/components/create/unsaved-changes-dialog";

describe("UnsavedChangesDialog", () => {
  it("renders dialog content when open", () => {
    render(<UnsavedChangesDialog open={true} onCancel={vi.fn()} onDiscard={vi.fn()} />);
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(screen.getByText(/You have unsaved changes/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
  });

  it("does not render dialog content when closed", () => {
    render(<UnsavedChangesDialog open={false} onCancel={vi.fn()} onDiscard={vi.fn()} />);
    // Radix AlertDialog does not render the portal when closed
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const onCancel = vi.fn();
    render(<UnsavedChangesDialog open={true} onCancel={onCancel} onDiscard={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onDiscard when Discard is clicked", async () => {
    const onDiscard = vi.fn();
    render(<UnsavedChangesDialog open={true} onCancel={vi.fn()} onDiscard={onDiscard} />);
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(onDiscard).toHaveBeenCalled();
  });
});
