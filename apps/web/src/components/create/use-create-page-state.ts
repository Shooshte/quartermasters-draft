import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "~/lib/trpc";
import {
  type TabName,
  type WorkspaceState,
  type CreatePageNavigate,
  type CreatePageSearch,
  type ScenarioSortBy,
  type ScenarioSortDir,
  type EffectSortBy,
  type EffectSortDir,
  type SpellSortBy,
  type SpellSortDir,
  type ItemSortBy,
  type ItemSortDir,
  type UnitSortBy,
  type UnitSortDir,
  DEFAULT_TAB,
  isValidTab,
} from "./types";
import { useDiscardDialog } from "./hooks/use-discard-dialog";
import { useDeleteDialog } from "./hooks/use-delete-dialog";
import { useDeleteEffectDialog } from "./hooks/use-delete-effect-dialog";
import { useDeleteSpellDialog } from "./hooks/use-delete-spell-dialog";
import { useDeleteItemDialog } from "./hooks/use-delete-item-dialog";
import { useDeleteUnitDialog } from "./hooks/use-delete-unit-dialog";
import { useScenarioList } from "./hooks/use-scenario-list";
import { useEffectList } from "./hooks/use-effect-list";
import { useSpellList } from "./hooks/use-spell-list";
import { useItemList } from "./hooks/use-item-list";
import { useUnitList } from "./hooks/use-unit-list";
import { useWorkspaceLoader } from "./hooks/use-workspace-loader";
import { effectRecordToFormValues, normalizeEffectFormValues, validateEffectForm } from "./effect-form";
import { normalizeSpellFormValues, validateSpellForm, type SpellFormValues } from "./spell-form";

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
  listLoading: Record<TabName, boolean>;
  listFetching: Record<TabName, boolean>;
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
  spellListItems: { id: string; name: string; targetPolicy: string; updatedAt: Date }[];
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
  // Item list specific
  itemListItems: { id: string; name: string; updatedAt: Date }[];
  itemPage: number;
  itemTotalPages: number;
  itemSortBy: ItemSortBy;
  itemSortDir: ItemSortDir;
  setItemSort: (sortBy: ItemSortBy, sortDir: ItemSortDir) => void;
  setItemPage: (page: number) => void;
  // Delete item
  isDeleteItemDialogOpen: boolean;
  deleteItemTarget: { id: string; name: string } | null;
  deleteItemError: string | null;
  requestDeleteItem: (id: string, name: string) => void;
  confirmDeleteItem: () => void;
  cancelDeleteItem: () => void;
  // Unit list specific
  unitListItems: { id: string; name: string; updatedAt: Date }[];
  unitPage: number;
  unitTotalPages: number;
  unitSortBy: UnitSortBy;
  unitSortDir: UnitSortDir;
  setUnitSort: (sortBy: UnitSortBy, sortDir: UnitSortDir) => void;
  setUnitPage: (page: number) => void;
  // Delete unit
  isDeleteUnitDialogOpen: boolean;
  deleteUnitTarget: { id: string; name: string } | null;
  deleteUnitError: string | null;
  requestDeleteUnit: (id: string, name: string) => void;
  confirmDeleteUnit: () => void;
  cancelDeleteUnit: () => void;
  saveEntity: () => Promise<void>;
  isEntitySaving: boolean;
  entitySaveError: string | null;
  effectOptions: { id: string; name: string; effectType: string }[];
}

export function useCreatePageState(
  search: CreatePageSearch,
  navigate?: CreatePageNavigate,
): CreatePageState {
  const queryClient = useQueryClient();
  const initialTab = isValidTab(search.tab) ? search.tab : DEFAULT_TAB;
  const [activeTab, setActiveTabState] = useState<TabName>(initialTab);
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);
  const [isEntitySaving, setIsEntitySaving] = useState(false);
  const [entitySaveError, setEntitySaveError] = useState<string | null>(null);

  const setActiveTab = useCallback((tab: TabName) => {
    setActiveTabState(tab);
    navigate?.({ search: (prev: Record<string, unknown>) => ({ ...prev, tab }), replace: true });
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

  // Item list (pagination, sorting, query)
  const itemList = useItemList(activeTab === "Items", backgroundEnabled);

  // Unit list (pagination, sorting, query)
  const unitList = useUnitList(activeTab === "Units", backgroundEnabled);

  // Effect options for spell effect picker
  const effectOptionsQuery = useQuery({
    queryKey: ["scenarioBuilder", "effects", "list", { limit: 500, page: 1, sortBy: "name", sortDir: "asc" }],
    queryFn: () => trpc.scenarioBuilder.effects.list.query({ limit: 500, page: 1, sortBy: "name", sortDir: "asc" }),
    enabled: entityWorkspace.entityType === "spell",
  });

  // Compute combined loading and enable background after active tab settles
  const allLoading: Record<TabName, boolean> = {
    Effects: effectList.effectsList.isLoading,
    Spells: spellList.spellsList.isLoading,
    Items: itemList.itemsList.isLoading,
    Units: unitList.unitsList.isLoading,
    Scenarios: scenarioList.scenariosList.isLoading,
  };

  const allFetching: Record<TabName, boolean> = {
    Effects: effectList.effectIsFetching,
    Spells: spellList.spellIsFetching,
    Items: itemList.itemIsFetching,
    Units: unitList.unitIsFetching,
    Scenarios: scenarioList.scenarioIsFetching,
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

  // Delete item dialog
  const deleteItemDialog = useDeleteItemDialog({
    entityWorkspace,
    setEntityWorkspace,
    setPerTabSelection,
    skipEntityResetRef,
    navigate,
    itemTotalCount: itemList.itemTotalCount,
    itemPage: itemList.itemPage,
    setItemPage: itemList.setItemPage,
  });

  // Delete unit dialog
  const deleteUnitDialog = useDeleteUnitDialog({
    entityWorkspace,
    setEntityWorkspace,
    setPerTabSelection,
    skipEntityResetRef,
    navigate,
    unitTotalCount: unitList.unitTotalCount,
    unitPage: unitList.unitPage,
    setUnitPage: unitList.setUnitPage,
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

  const saveEntity = useCallback(async () => {
    if (entityWorkspace.entityType === "effect") {
      const formValues = effectRecordToFormValues(entityWorkspace.formValues);
      const normalized = normalizeEffectFormValues(formValues);
      if (Object.keys(validateEffectForm(normalized)).length > 0) return;

      try {
        setIsEntitySaving(true);
        setEntitySaveError(null);

        if (entityWorkspace.mode === "create") {
          const created = await trpc.scenarioBuilder.effects.create.mutate(normalized);
          setEntityWorkspace({
            mode: "edit",
            entityType: "effect",
            entityId: created.id,
            data: created,
            formValues: effectRecordToFormValues(created),
            isDirty: false,
          });
          setPerTabSelection((prev) => ({ ...prev, Effects: created.id }));
          skipEntityResetRef.current = true;
          navigate?.({
            search: (prev: Record<string, unknown>) => {
              const next = { ...prev };
              delete next.entity_id;
              delete next.effect_id;
              next.effect_id = created.id;
              return next;
            },
            replace: true,
          });
        } else if (entityWorkspace.mode === "edit" && entityWorkspace.entityId) {
          const updated = await trpc.scenarioBuilder.effects.update.mutate({
            id: entityWorkspace.entityId,
            ...normalized,
          });
          setEntityWorkspace({
            mode: "edit",
            entityType: "effect",
            entityId: updated.id,
            data: updated,
            formValues: effectRecordToFormValues(updated),
            isDirty: false,
          });
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["scenarioBuilder", "effects", "list"] }),
          queryClient.invalidateQueries({ queryKey: ["scenarioBuilder", "effects", "get"] }),
        ]);
      } catch (error) {
        setEntitySaveError(error instanceof Error ? error.message : "Failed to save effect. Please try again.");
      } finally {
        setIsEntitySaving(false);
      }
    } else if (entityWorkspace.entityType === "spell") {
      const spellValues = entityWorkspace.formValues as SpellFormValues;
      if (Object.keys(validateSpellForm(spellValues)).length > 0) return;
      const normalized = normalizeSpellFormValues(spellValues);

      try {
        setIsEntitySaving(true);
        setEntitySaveError(null);

        if (entityWorkspace.mode === "create") {
          const created = await trpc.scenarioBuilder.spells.create.mutate(normalized);
          const createdData = created as { id: string; name: string; [key: string]: unknown };
          setEntityWorkspace({
            mode: "edit",
            entityType: "spell",
            entityId: createdData.id,
            data: createdData,
            formValues: {
              name: createdData.name,
              description: (createdData.description as string) ?? "",
              targetPolicy: (createdData.targetPolicy as string) ?? "",
              effectIds: (createdData.effectIds as string[]) ?? [],
            },
            isDirty: false,
          });
          setPerTabSelection((prev) => ({ ...prev, Spells: createdData.id }));
          skipEntityResetRef.current = true;
          navigate?.({
            search: (prev: Record<string, unknown>) => {
              const next = { ...prev };
              delete next.entity_id;
              delete next.spell_id;
              next.spell_id = createdData.id;
              return next;
            },
            replace: true,
          });
        } else if (entityWorkspace.mode === "edit" && entityWorkspace.entityId) {
          const updated = await trpc.scenarioBuilder.spells.update.mutate({
            id: entityWorkspace.entityId,
            ...normalized,
          });
          const updatedData = updated as { id: string; name: string; [key: string]: unknown };
          setEntityWorkspace({
            mode: "edit",
            entityType: "spell",
            entityId: updatedData.id,
            data: updatedData,
            formValues: {
              name: updatedData.name,
              description: (updatedData.description as string) ?? "",
              targetPolicy: (updatedData.targetPolicy as string) ?? "",
              effectIds: (updatedData.effectIds as string[]) ?? [],
            },
            isDirty: false,
          });
        }

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["scenarioBuilder", "spells", "list"] }),
          queryClient.invalidateQueries({ queryKey: ["scenarioBuilder", "spells", "get"] }),
        ]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to save spell. Please try again.";
        if (message.includes("already exists")) {
          setEntitySaveError("A spell with this name already exists");
        } else {
          setEntitySaveError(message);
        }
      } finally {
        setIsEntitySaving(false);
      }
    }
  }, [entityWorkspace, navigate, queryClient, setEntityWorkspace, setPerTabSelection, skipEntityResetRef]);

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
    saveEntity,
    isEntitySaving,
    entitySaveError,
    effectOptions: (effectOptionsQuery.data?.items ?? []).map((e: { id: string; name: string; effectType: string }) => ({
      id: e.id,
      name: e.name,
      effectType: e.effectType,
    })),
    listLoading: allLoading,
    listFetching: allFetching,
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
    // Item list specific
    itemListItems: itemList.itemListItems,
    itemPage: itemList.itemPage,
    itemTotalPages: itemList.itemTotalPages,
    itemSortBy: itemList.itemSortBy,
    itemSortDir: itemList.itemSortDir,
    setItemSort: itemList.setItemSort,
    setItemPage: itemList.setItemPage,
    // Unit list specific
    unitListItems: unitList.unitListItems,
    unitPage: unitList.unitPage,
    unitTotalPages: unitList.unitTotalPages,
    unitSortBy: unitList.unitSortBy,
    unitSortDir: unitList.unitSortDir,
    setUnitSort: unitList.setUnitSort,
    setUnitPage: unitList.setUnitPage,
    // Delete scenario
    ...deleteDialog,
    // Delete effect
    ...deleteEffectDialog,
    // Delete spell
    ...deleteSpellDialog,
    // Delete item
    ...deleteItemDialog,
    // Delete unit
    ...deleteUnitDialog,
  };
}
