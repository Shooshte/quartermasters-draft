import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { trpc } from "~/lib/trpc";
import type { CreatePageNavigate, WorkspaceState } from "../types";
import { createIdleWorkspace, SCENARIOS_PAGE_SIZE } from "../types";

interface UseDeleteDialogOptions {
  scenarioWorkspace: WorkspaceState;
  setScenarioWorkspace: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  setPerTabSelection: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
  skipScenarioResetRef: React.MutableRefObject<boolean>;
  navigate?: CreatePageNavigate;
  scenarioTotalCount: number;
  scenarioPage: number;
  setScenarioPage: (page: number) => void;
}

export function useDeleteDialog({
  scenarioWorkspace,
  setScenarioWorkspace,
  setPerTabSelection,
  skipScenarioResetRef,
  navigate,
  scenarioTotalCount,
  scenarioPage,
  setScenarioPage,
}: UseDeleteDialogOptions) {
  const queryClient = useQueryClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const requestDeleteScenario = useCallback((id: string, name: string) => {
    setDeleteTarget({ id, name });
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDeleteScenario = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      setDeleteError(null);
      await trpc.scenarioBuilder.scenarios.delete.mutate({ id: deleteTarget.id });

      if (scenarioWorkspace.entityId === deleteTarget.id) {
        setScenarioWorkspace(createIdleWorkspace());
        setPerTabSelection((prev) => ({ ...prev, Scenarios: null }));
        skipScenarioResetRef.current = true;
        navigate?.({
          search: (prev: Record<string, unknown>) => {
            const next = { ...prev };
            delete next.scenario_id;
            return next;
          },
          replace: true,
        });
      }

      await queryClient.invalidateQueries({
        queryKey: ["scenarioBuilder", "scenarios"],
      });

      const newTotalCount = scenarioTotalCount - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotalCount / SCENARIOS_PAGE_SIZE));
      if (scenarioPage > newTotalPages) {
        setScenarioPage(newTotalPages);
      }

      setDeleteTarget(null);
      setIsDeleteDialogOpen(false);
    } catch {
      setDeleteError("Failed to delete scenario. Please try again.");
    }
  }, [
    deleteTarget,
    scenarioWorkspace.entityId,
    navigate,
    queryClient,
    scenarioTotalCount,
    scenarioPage,
    setScenarioWorkspace,
    setPerTabSelection,
    skipScenarioResetRef,
    setScenarioPage,
  ]);

  const cancelDeleteScenario = useCallback(() => {
    setDeleteTarget(null);
    setIsDeleteDialogOpen(false);
    setDeleteError(null);
  }, []);

  return {
    isDeleteDialogOpen,
    deleteTarget,
    deleteError,
    requestDeleteScenario,
    confirmDeleteScenario,
    cancelDeleteScenario,
  };
}
