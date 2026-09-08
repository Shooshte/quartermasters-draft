import { useQueryClient } from "@tanstack/react-query";
import { api } from "~/lib/api";
import type { CreatePageNavigate, WorkspaceState } from "../types";
import { createIdleWorkspace, SCENARIOS_PAGE_SIZE } from "../types";
import { useDeleteEntityDialog } from "./use-delete-entity-dialog";

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
  const dialog = useDeleteEntityDialog({
    deleteEntity: (id) => api.scenarioBuilder.scenarios.delete.mutate({ id }),
    invalidate: () => queryClient.invalidateQueries({ queryKey: ["scenarioBuilder", "scenarios"] }),
    onDeleted: (id) => {
      if (scenarioWorkspace.entityId === id) {
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
      const newTotalCount = scenarioTotalCount - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotalCount / SCENARIOS_PAGE_SIZE));
      if (scenarioPage > newTotalPages) setScenarioPage(newTotalPages);
    },
    fallbackError: "Failed to delete scenario. Please try again.",
  });

  return {
    isDeleteDialogOpen: dialog.isOpen,
    deleteTarget: dialog.target,
    deleteError: dialog.error,
    requestDeleteScenario: dialog.request,
    confirmDeleteScenario: dialog.confirm,
    cancelDeleteScenario: dialog.cancel,
  };
}
