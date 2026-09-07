import { useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api";
import type { CreatePageNavigate, WorkspaceState } from "../types";
import { createIdleWorkspace, ITEMS_PAGE_SIZE } from "../types";
import { useDeleteEntityDialog } from "./use-delete-entity-dialog";

interface UseDeleteItemDialogOptions {
  entityWorkspace: WorkspaceState;
  setEntityWorkspace: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  setPerTabSelection: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  skipEntityResetRef: React.MutableRefObject<boolean>;
  navigate?: CreatePageNavigate;
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
  const dialog = useDeleteEntityDialog({
    deleteEntity: (id) => api.scenarioBuilder.items.delete.mutate({ id }),
    invalidate: async () => {
      await queryClient.invalidateQueries({ queryKey: ["scenarioBuilder", "items"] });
      await queryClient.invalidateQueries({
        queryKey: ["scenarioBuilder", "units", "all-options-for-scenarios"],
      });
    },
    onDeleted: (id) => {
      if (entityWorkspace.entityId === id) {
        setEntityWorkspace(createIdleWorkspace());
        setPerTabSelection((prev) => ({ ...prev, Items: null }));
        skipEntityResetRef.current = true;
        navigate?.({
          search: (prev: Record<string, unknown>) => {
            const next = { ...prev };
            delete next.item_id;
            return next;
          },
          replace: true,
        });
      }
      const newTotalCount = itemTotalCount - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotalCount / ITEMS_PAGE_SIZE));
      if (itemPage > newTotalPages) setItemPage(newTotalPages);
    },
    fallbackError: "Failed to delete item. Please try again.",
  });

  return {
    isDeleteItemDialogOpen: dialog.isOpen,
    deleteItemTarget: dialog.target,
    deleteItemError: dialog.error,
    requestDeleteItem: dialog.request,
    confirmDeleteItem: dialog.confirm,
    cancelDeleteItem: dialog.cancel,
  };
}
