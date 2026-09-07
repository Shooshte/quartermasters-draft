import { useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api";
import type { CreatePageNavigate, WorkspaceState } from "../types";
import { createIdleWorkspace, UNITS_PAGE_SIZE } from "../types";
import { useDeleteEntityDialog } from "./use-delete-entity-dialog";

interface UseDeleteUnitDialogOptions {
  entityWorkspace: WorkspaceState;
  setEntityWorkspace: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  setPerTabSelection: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  skipEntityResetRef: React.MutableRefObject<boolean>;
  navigate?: CreatePageNavigate;
  unitTotalCount: number;
  unitPage: number;
  setUnitPage: (page: number) => void;
}

export function useDeleteUnitDialog({
  entityWorkspace,
  setEntityWorkspace,
  setPerTabSelection,
  skipEntityResetRef,
  navigate,
  unitTotalCount,
  unitPage,
  setUnitPage,
}: UseDeleteUnitDialogOptions) {
  const queryClient = useQueryClient();
  const dialog = useDeleteEntityDialog({
    deleteEntity: (id) => api.scenarioBuilder.units.delete.mutate({ id }),
    invalidate: () => queryClient.invalidateQueries({ queryKey: ["scenarioBuilder", "units"] }),
    onDeleted: (id) => {
      if (entityWorkspace.entityId === id) {
        setEntityWorkspace(createIdleWorkspace());
        setPerTabSelection((prev) => ({ ...prev, Units: null }));
        skipEntityResetRef.current = true;
        navigate?.({
          search: (prev: Record<string, unknown>) => {
            const next = { ...prev };
            delete next.unit_id;
            return next;
          },
          replace: true,
        });
      }
      const newTotalCount = unitTotalCount - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotalCount / UNITS_PAGE_SIZE));
      if (unitPage > newTotalPages) setUnitPage(newTotalPages);
    },
    fallbackError: "Failed to delete unit. Please try again.",
  });

  return {
    isDeleteUnitDialogOpen: dialog.isOpen,
    deleteUnitTarget: dialog.target,
    deleteUnitError: dialog.error,
    requestDeleteUnit: dialog.request,
    confirmDeleteUnit: dialog.confirm,
    cancelDeleteUnit: dialog.cancel,
  };
}
