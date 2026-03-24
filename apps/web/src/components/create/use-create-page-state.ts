import { useState, useCallback, useEffect } from "react";
import {
  type TabName,
  type EntityTab,
  type WorkspaceState,
  type ScenarioSortBy,
  type ScenarioSortDir,
  type EffectSortBy,
  type EffectSortDir,
  type SpellSortBy,
  type SpellSortDir,
  DEFAULT_TAB,
  isValidTab,
} from "./types";
import { useDiscardDialog } from "./hooks/use-discard-dialog";
import { useDeleteDialog } from "./hooks/use-delete-dialog";
import { useDeleteEffectDialog } from "./hooks/use-delete-effect-dialog";
import { useDeleteSpellDialog } from "./hooks/use-delete-spell-dialog";
import { useScenarioList } from "./hooks/use-scenario-list";
import { useEffectList } from "./hooks/use-effect-list";
import { useSpellList } from "./hooks/use-spell-list";
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
  // Effect list specific
  effectListItems: { id: string; name: string; timingType: string; effectType: string; updatedAt: Date }[];
  effectPage: number;
  effectTotalPages: number;
  effectSortBy: EffectSortBy;
  effectSortDir: EffectSortDir;
  setEffectSort: (sortBy: EffectSortBy, sortDir: EffectSortDir) => void;
  setEffectPage: (page: number) => void;
  // Delete scenario
  isDeleteDialogOpen: boolean;
  deleteTarget: { id: string; name: string } | null;
  deleteError: string | null;
  requestDeleteScenario: (id: string, name: string) => void;
  confirmDeleteScenario: () => void;
  cancelDeleteScenario: () => void;
  // Delete effect
  isDeleteEffectDialogOpen: boolean;
  deleteEffectTarget: { id: string; name: string } | null;
  deleteEffectError: string | null;
  requestDeleteEffect: (id: string, name: string) => void;
  confirmDeleteEffect: () => void;
  cancelDeleteEffect: () => void;
  // Spell list specific
  spellListItems: { id: string; name: string; targetPolicy: string }[];
  spellPage: number;
  spellTotalPages: number;
  spellSortBy: SpellSortBy;
  spellSortDir: SpellSortDir;
  setSpellSort: (sortBy: SpellSortBy, sortDir: SpellSortDir) => void;
  setSpellPage: (page: number) => void;
  // Delete spell
  isDeleteSpellDialogOpen: boolean;
  deleteSpellTarget: { id: string; name: string } | null;
  deleteSpellError: string | null;
  requestDeleteSpell: (id: string, name: string) => void;
  confirmDeleteSpell: () => void;
  cancelDeleteSpell: () => void;
}

export function useCreatePageState(
  search: {
    tab?: string;
    entity_id?: string;
    effect_id?: string;
    spell_id?: string;
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
    setEntityWorkspace,
    scenarioWorkspace,
    perTabSelection,
    setScenarioWorkspace,
    setPerTabSelection,
    skipEntityResetRef,
    skipScenarioResetRef,
    loadEntity,
    loadScenario,
    executePendingAction,
    updateEntityField,
    updateScenarioField,
  } = useWorkspaceLoader({ search, activeTab, setActiveTabState, navigate });

  // Scenario list (pagination, sorting, query)
  const scenarioList = useScenarioList(activeTab === "Scenarios", backgroundEnabled);

  // Effect list (pagination, sorting, query)
  const effectList = useEffectList(activeTab === "Effects", backgroundEnabled);

  // Spell list (pagination, sorting, query)
  const spellList = useSpellList(activeTab === "Spells", backgroundEnabled);

  // Entity list queries (lazy loading)
  const { listData, entityListLoading } = useEntityListQueries(activeTab, backgroundEnabled);

  // Compute combined loading and enable background after active tab settles
  const allLoading: Record<TabName, boolean> = {
    ...entityListLoading,
    Effects: effectList.effectsList.isLoading,
    Spells: spellList.spellsList.isLoading,
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

  // Delete scenario dialog
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

  // Delete effect dialog
  const deleteEffectDialog = useDeleteEffectDialog({
    entityWorkspace,
    setEntityWorkspace,
    setPerTabSelection,
    skipEntityResetRef,
    navigate,
    effectTotalCount: effectList.effectTotalCount,
    effectPage: effectList.effectPage,
    setEffectPage: effectList.setEffectPage,
  });

  // Delete spell dialog
  const deleteSpellDialog = useDeleteSpellDialog({
    entityWorkspace,
    setEntityWorkspace,
    setPerTabSelection,
    skipEntityResetRef,
    navigate,
    spellTotalCount: spellList.spellTotalCount,
    spellPage: spellList.spellPage,
    setSpellPage: spellList.setSpellPage,
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
    // Effect list specific
    effectListItems: effectList.effectListItems,
    effectPage: effectList.effectPage,
    effectTotalPages: effectList.effectTotalPages,
    effectSortBy: effectList.effectSortBy,
    effectSortDir: effectList.effectSortDir,
    setEffectSort: effectList.setEffectSort,
    setEffectPage: effectList.setEffectPage,
    // Spell list specific
    spellListItems: spellList.spellListItems,
    spellPage: spellList.spellPage,
    spellTotalPages: spellList.spellTotalPages,
    spellSortBy: spellList.spellSortBy,
    spellSortDir: spellList.spellSortDir,
    setSpellSort: spellList.setSpellSort,
    setSpellPage: spellList.setSpellPage,
    // Delete scenario
    ...deleteDialog,
    // Delete effect
    ...deleteEffectDialog,
    // Delete spell
    ...deleteSpellDialog,
  };
}
