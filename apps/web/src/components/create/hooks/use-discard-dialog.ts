import { useCallback, useState } from "react";
import type { PendingAction } from "../use-create-page-state";

export function useDiscardDialog() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  const requestDiscard = useCallback((action: PendingAction) => {
    setPendingAction(action);
    setIsDialogOpen(true);
  }, []);

  const confirmDiscard = useCallback(
    (onConfirm: (action: PendingAction) => void) => {
      setIsDialogOpen(false);
      if (pendingAction) {
        onConfirm(pendingAction);
        setPendingAction(null);
      }
    },
    [pendingAction],
  );

  const cancelDiscard = useCallback(() => {
    setIsDialogOpen(false);
    setPendingAction(null);
  }, []);

  return {
    isDialogOpen,
    pendingAction,
    requestDiscard,
    confirmDiscard,
    cancelDiscard,
  };
}
