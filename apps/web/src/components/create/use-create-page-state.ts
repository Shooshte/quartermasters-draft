import { useState, useCallback, useEffect } from "react";
import {
  type TabName,
  type EntityTab,
  type WorkspaceState,
  type ScenarioSortBy,
  type ScenarioSortDir,
  DEFAULT_TAB,
  isValidTab,
} from "./types";
import { useDiscardDialog } from "./hooks/use-discard-dialog";
import { useDeleteDialog } from "./hooks/use-delete-dialog";
import { useScenarioList } from "./hooks/use-scenario-list";
import { useEntityListQueries } from "./hooks/use-entity-list-queries";
import { useWorkspaceLoader } from "./hooks/use-workspace-loader";

export interface PendingAction {
  type: "selectRecord" | "createNew";
  tab: TabName;
  id?: string;
}

export interface CreatePageState {
  activeTab: TabName;
  perTabSelection: Record<TabName, string | null>;
  entityWorkspace: WorkspaceState;
  scenarioWorkspace: WorkspaceState;
  isDialogOpen: boolean;
  pendingAction: PendingAction | null;
  setActiveTab: (tab: TabName) => void;
  selectRecord: (tab: TabName, id: string) => void;
  createNew: (tab: TabName) => void;
  updateEntityField: (field: string, value: unknown) => void;
  updateScenarioField: (field: string, value: unknown) => void;
  confirmDiscard: () => void;
  cancelDiscard: () => void;
  listData: Record<EntityTab, { items: { id: string; name: string }[] } | undefined>;
  listLoading: Record<TabName, boolean>;
  // Scenario list specific
  scenarioListItems: { id: string; name: string; updatedAt: Date; createdAt: Date }[];
  scenarioPage: number;
  scenarioTotalPages: number;
  scenarioSortBy: ScenarioSortBy;
  scenarioSortDir: ScenarioSortDir;
  setScenarioSort: (sortBy: ScenarioSortBy, sortDir: ScenarioSortDir) => void;
  setScenarioPage: (page: number) => void;
  // Delete
  isDeleteDialogOpen: boolean;
  deleteTarget: { id: string; name: string } | null;
  deleteError: string | null;
  requestDeleteScenario: (id: string, name: string) => void;
  confirmDeleteScenario: () => void;
  cancelDeleteScenario: () => void;
}

export function useCreatePageState(
  search: {
    tab?: string;
    entity_id?: string;
    scenario_id?: string;
  },
  navigate?: (opts: { search: (prev: Record<string, unknown>) => Record<string, unknown>; replace: boolean }) => void,
): CreatePageState {
  const initialTab = isValidTab(search.tab) ? search.tab : DEFAULT_TAB;
  const [activeTab, setActiveTabState] = useState<TabName>(initialTab);
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);

  const setActiveTab = useCallback((tab: TabName) => {
    setActiveTabState(tab);
    navigate?.({ search: (prev) => ({ ...prev, tab }), replace: true });
  }, [navigate]);

  // Workspace loading (entity + scenario + perTabSelection)
  const {
    entityWorkspace,
    scenarioWorkspace,
    perTabSelection,
    setScenarioWorkspace,
    setPerTabSelection,
    skipScenarioResetRef,
    loadEntity,
    loadScenario,
    executePendingAction,
    updateEntityField,
    updateScenarioField,
  } = useWorkspaceLoader({ search, activeTab, setActiveTabState, navigate });

  // Scenario list (pagination, sorting, query)
  const scenarioList = useScenarioList(activeTab === "Scenarios", backgroundEnabled);

  // Entity list queries (lazy loading)
  const { listData, entityListLoading } = useEntityListQueries(activeTab, backgroundEnabled);

  // Compute combined loading and enable background after active tab settles
  const allLoading: Record<TabName, boolean> = {
    ...entityListLoading,
    Scenarios: scenarioList.scenariosList.isLoading,
  };

  const activeTabIsLoading = allLoading[activeTab];

  useEffect(() => {
    if (backgroundEnabled) return;
    if (!activeTabIsLoading) {
      setBackgroundEnabled(true);
    }
  }, [backgroundEnabled, activeTabIsLoading]);

  // Discard dialog
  const discard = useDiscardDialog();

  // Delete dialog
  const deleteDialog = useDeleteDialog({
    scenarioWorkspace,
    setScenarioWorkspace,
    setPerTabSelection,
    skipScenarioResetRef,
    navigate,
    scenarioTotalCount: scenarioList.scenarioTotalCount,
    scenarioPage: scenarioList.scenarioPage,
    setScenarioPage: scenarioList.setScenarioPage,
  });

  // Selection with dirty check
  const selectRecord = useCallback(
    (tab: TabName, id: string) => {
      const targetWorkspace = tab === "Scenarios" ? scenarioWorkspace : entityWorkspace;
      if (targetWorkspace.isDirty) {
        discard.requestDiscard({ type: "selectRecord", tab, id });
        return;
      }
      if (tab === "Scenarios") {
        loadScenario(id);
      } else {
        loadEntity(tab, id);
      }
    },
    [entityWorkspace, scenarioWorkspace, loadEntity, loadScenario, discard],
  );

  // Creation with dirty check
  const createNew = useCallback(
    (tab: TabName) => {
      const targetWorkspace = tab === "Scenarios" ? scenarioWorkspace : entityWorkspace;
      if (targetWorkspace.isDirty) {
        discard.requestDiscard({ type: "createNew", tab });
        return;
      }
      executePendingAction({ type: "createNew", tab });
    },
    [entityWorkspace, scenarioWorkspace, executePendingAction, discard],
  );

  const confirmDiscard = useCallback(() => {
    discard.confirmDiscard(executePendingAction);
  }, [discard, executePendingAction]);

  return {
    activeTab,
    perTabSelection,
    entityWorkspace,
    scenarioWorkspace,
    isDialogOpen: discard.isDialogOpen,
    pendingAction: discard.pendingAction,
    setActiveTab,
    selectRecord,
    createNew,
    updateEntityField,
    updateScenarioField,
    confirmDiscard,
    cancelDiscard: discard.cancelDiscard,
    listData,
    listLoading: allLoading,
    // Scenario list specific
    scenarioListItems: scenarioList.scenarioListItems,
    scenarioPage: scenarioList.scenarioPage,
    scenarioTotalPages: scenarioList.scenarioTotalPages,
    scenarioSortBy: scenarioList.scenarioSortBy,
    scenarioSortDir: scenarioList.scenarioSortDir,
    setScenarioSort: scenarioList.setScenarioSort,
    setScenarioPage: scenarioList.setScenarioPage,
    // Delete
    ...deleteDialog,
  };
}
