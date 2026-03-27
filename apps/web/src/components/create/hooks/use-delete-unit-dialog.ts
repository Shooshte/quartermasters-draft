import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "~/lib/trpc";
import { UNITS_PAGE_SIZE, createIdleWorkspace } from "../types";
import type { CreatePageNavigate, WorkspaceState } from "../types";

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
  const [isDeleteUnitDialogOpen, setIsDeleteUnitDialogOpen] = useState(false);
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteUnitError, setDeleteUnitError] = useState<string | null>(null);

  const requestDeleteUnit = useCallback((id: string, name: string) => {
    setDeleteUnitTarget({ id, name });
    setIsDeleteUnitDialogOpen(true);
  }, []);

  const confirmDeleteUnit = useCallback(async () => {
    if (!deleteUnitTarget) return;
    try {
      setDeleteUnitError(null);
      await trpc.scenarioBuilder.units.delete.mutate({ id: deleteUnitTarget.id });

      if (entityWorkspace.entityId === deleteUnitTarget.id) {
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

      await queryClient.invalidateQueries({
        queryKey: ["scenarioBuilder", "units", "list"],
      });

      const newTotalCount = unitTotalCount - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotalCount / UNITS_PAGE_SIZE));
      if (unitPage > newTotalPages) {
        setUnitPage(newTotalPages);
      }

      setDeleteUnitTarget(null);
      setIsDeleteUnitDialogOpen(false);
    } catch {
      setDeleteUnitError("Failed to delete unit. Please try again.");
    }
  }, [deleteUnitTarget, entityWorkspace.entityId, navigate, queryClient, unitTotalCount, unitPage, setEntityWorkspace, setPerTabSelection, skipEntityResetRef, setUnitPage]);

  const cancelDeleteUnit = useCallback(() => {
    setDeleteUnitTarget(null);
    setIsDeleteUnitDialogOpen(false);
    setDeleteUnitError(null);
  }, []);

  return {
    isDeleteUnitDialogOpen,
    deleteUnitTarget,
    deleteUnitError,
    requestDeleteUnit,
    confirmDeleteUnit,
    cancelDeleteUnit,
  };
}
