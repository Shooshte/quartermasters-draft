import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";

interface DeleteConfirmDialogProps {
  open: boolean;
  scenarioName: string;
  errorMessage?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ open, scenarioName, errorMessage, onCancel, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent data-testid="delete-confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete scenario</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{scenarioName}&quot;? This action cannot be undone.
          </AlertDialogDescription>
          {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button variant="destructive" onClick={onConfirm}>
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
