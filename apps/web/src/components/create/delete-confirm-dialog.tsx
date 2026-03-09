import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

interface DeleteConfirmDialogProps {
  open: boolean;
  scenarioName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ open, scenarioName, onCancel, onConfirm }: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <AlertDialogContent data-testid="delete-confirm-dialog">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete scenario</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{scenarioName}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
