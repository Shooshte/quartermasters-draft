import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "~/lib/trpc";
import { ITEMS_PAGE_SIZE, createIdleWorkspace } from "../types";
import type { WorkspaceState } from "../types";

interface UseDeleteItemDialogOptions {
  entityWorkspace: WorkspaceState;
  setEntityWorkspace: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  setPerTabSelection: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  skipEntityResetRef: React.MutableRefObject<boolean>;
  navigate?: (opts: { search: (prev: Record<string, unknown>) => Record<string, unknown>; replace: boolean }) => void;
  itemTotalCount: number;
  itemPage: number;
  setItemPage: (page: number) => void;
}

export function useDeleteItemDialog({
  entityWorkspace,
  setEntityWorkspace,
  setPerTabSelection,
  skipEntityResetRef,
  navigate,
  itemTotalCount,
  itemPage,
  setItemPage,
}: UseDeleteItemDialogOptions) {
  const queryClient = useQueryClient();
  const [isDeleteItemDialogOpen, setIsDeleteItemDialogOpen] = useState(false);
  const [deleteItemTarget, setDeleteItemTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteItemError, setDeleteItemError] = useState<string | null>(null);

  const requestDeleteItem = useCallback((id: string, name: string) => {
    setDeleteItemTarget({ id, name });
    setIsDeleteItemDialogOpen(true);
  }, []);

  const confirmDeleteItem = useCallback(async () => {
    if (!deleteItemTarget) return;
    try {
      setDeleteItemError(null);
      await trpc.scenarioBuilder.items.delete.mutate({ id: deleteItemTarget.id });

      if (entityWorkspace.entityId === deleteItemTarget.id) {
        setEntityWorkspace(createIdleWorkspace());
        setPerTabSelection((prev) => ({ ...prev, Items: null }));
        skipEntityResetRef.current = true;
        navigate?.({
          search: (prev) => {
            const next = { ...prev };
            delete next.item_id;
            return next;
          },
          replace: true,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: ["scenarioBuilder", "items", "list"],
      });

      const newTotalCount = itemTotalCount - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotalCount / ITEMS_PAGE_SIZE));
      if (itemPage > newTotalPages) {
        setItemPage(newTotalPages);
      }

      setDeleteItemTarget(null);
      setIsDeleteItemDialogOpen(false);
    } catch {
      setDeleteItemError("Failed to delete item. Please try again.");
    }
  }, [deleteItemTarget, entityWorkspace.entityId, navigate, queryClient, itemTotalCount, itemPage, setEntityWorkspace, setPerTabSelection, skipEntityResetRef, setItemPage]);

  const cancelDeleteItem = useCallback(() => {
    setDeleteItemTarget(null);
    setIsDeleteItemDialogOpen(false);
    setDeleteItemError(null);
  }, []);

  return {
    isDeleteItemDialogOpen,
    deleteItemTarget,
    deleteItemError,
    requestDeleteItem,
    confirmDeleteItem,
    cancelDeleteItem,
  };
}
