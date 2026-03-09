import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "~/lib/trpc";
import {
  type TabName,
  type WorkspaceState,
  type EntityType,
  DEFAULT_TAB,
  ENTITY_TABS,
  ENTITY_TYPE_TO_TAB,
  TAB_TO_ENTITY_TYPE,
  isValidTab,
  isEntityTab,
  createIdleWorkspace,
} from "./types";

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
  listData: Record<TabName, { items: { id: string; name: string }[] } | undefined>;
  listLoading: Record<TabName, boolean>;
}

export function useCreatePageState(search: {
  tab?: string;
  entity_id?: string;
  scenario_id?: string;
}): CreatePageState {
  const initialTab = isValidTab(search.tab) ? search.tab : DEFAULT_TAB;

  const [activeTab, setActiveTabState] = useState<TabName>(initialTab);
  const [perTabSelection, setPerTabSelection] = useState<Record<TabName, string | null>>({
    Effects: null,
    Spells: null,
    Items: null,
    Units: null,
    Scenarios: null,
  });
  const [entityWorkspace, setEntityWorkspace] = useState<WorkspaceState>(createIdleWorkspace());
  const [scenarioWorkspace, setScenarioWorkspace] = useState<WorkspaceState>(createIdleWorkspace());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // List queries for all tabs
  const effectsList = useQuery({
    queryKey: ["scenarioBuilder", "effects", "list"],
    queryFn: () => trpc.scenarioBuilder.effects.list.query({}),
  });
  const spellsList = useQuery({
    queryKey: ["scenarioBuilder", "spells", "list"],
    queryFn: () => trpc.scenarioBuilder.spells.list.query({}),
  });
  const itemsList = useQuery({
    queryKey: ["scenarioBuilder", "items", "list"],
    queryFn: () => trpc.scenarioBuilder.items.list.query({}),
  });
  const unitsList = useQuery({
    queryKey: ["scenarioBuilder", "units", "list"],
    queryFn: () => trpc.scenarioBuilder.units.list.query({}),
  });
  const scenariosList = useQuery({
    queryKey: ["scenarioBuilder", "scenarios", "list"],
    queryFn: () => trpc.scenarioBuilder.scenarios.list.query({}),
  });

  const listData: Record<TabName, { items: { id: string; name: string }[] } | undefined> = {
    Effects: effectsList.data as { items: { id: string; name: string }[] } | undefined,
    Spells: spellsList.data as { items: { id: string; name: string }[] } | undefined,
    Items: itemsList.data as { items: { id: string; name: string }[] } | undefined,
    Units: unitsList.data as { items: { id: string; name: string }[] } | undefined,
    Scenarios: scenariosList.data as { items: { id: string; name: string }[] } | undefined,
  };

  const listLoading: Record<TabName, boolean> = {
    Effects: effectsList.isLoading,
    Spells: spellsList.isLoading,
    Items: itemsList.isLoading,
    Units: unitsList.isLoading,
    Scenarios: scenariosList.isLoading,
  };

  // URL-driven initialization for entity_id
  const entityInitRef = useRef(false);

  // Try to detect entity type when entity_id is provided without tab
  const entityDetectEffects = useQuery({
    queryKey: ["scenarioBuilder", "effects", "get", search.entity_id],
    queryFn: () => trpc.scenarioBuilder.effects.get.query({ id: search.entity_id! }),
    enabled: !!search.entity_id && !entityInitRef.current,
    retry: false,
  });
  const entityDetectSpells = useQuery({
    queryKey: ["scenarioBuilder", "spells", "get", search.entity_id],
    queryFn: () => trpc.scenarioBuilder.spells.get.query({ id: search.entity_id! }),
    enabled: !!search.entity_id && !entityInitRef.current,
    retry: false,
  });
  const entityDetectItems = useQuery({
    queryKey: ["scenarioBuilder", "items", "get", search.entity_id],
    queryFn: () => trpc.scenarioBuilder.items.get.query({ id: search.entity_id! }),
    enabled: !!search.entity_id && !entityInitRef.current,
    retry: false,
  });
  const entityDetectUnits = useQuery({
    queryKey: ["scenarioBuilder", "units", "get", search.entity_id],
    queryFn: () => trpc.scenarioBuilder.units.get.query({ id: search.entity_id! }),
    enabled: !!search.entity_id && !entityInitRef.current,
    retry: false,
  });

  // URL-driven entity initialization
  useEffect(() => {
    if (!search.entity_id || entityInitRef.current) return;

    const detectors = [
      { type: "effect" as EntityType, query: entityDetectEffects },
      { type: "spell" as EntityType, query: entityDetectSpells },
      { type: "item" as EntityType, query: entityDetectItems },
      { type: "unit" as EntityType, query: entityDetectUnits },
    ];

    const allSettled = detectors.every((d) => !d.query.isLoading);
    if (!allSettled) return;

    entityInitRef.current = true;

    const found = detectors.find((d) => d.query.data);
    if (found && found.query.data) {
      const entityData = found.query.data as Record<string, unknown>;
      const entityTab = ENTITY_TYPE_TO_TAB[found.type];
      // If no explicit tab was set, auto-switch to the detected entity's tab
      if (!search.tab) {
        setActiveTabState(entityTab);
      }
      setEntityWorkspace({
        mode: "edit",
        entityType: found.type,
        entityId: search.entity_id,
        data: entityData,
        formValues: { name: entityData.name },
        isDirty: false,
      });
      // If current tab matches entity tab, set selection
      const tabToCheck = isValidTab(search.tab) ? search.tab : entityTab;
      if (tabToCheck === entityTab) {
        setPerTabSelection((prev) => ({ ...prev, [entityTab]: search.entity_id! }));
      }
    } else {
      // Not found in any type
      setEntityWorkspace({
        mode: "not-found",
        entityType: null,
        entityId: search.entity_id,
        data: null,
        formValues: {},
        isDirty: false,
      });
    }
  }, [
    search.entity_id,
    search.tab,
    entityDetectEffects.isLoading,
    entityDetectEffects.data,
    entityDetectSpells.isLoading,
    entityDetectSpells.data,
    entityDetectItems.isLoading,
    entityDetectItems.data,
    entityDetectUnits.isLoading,
    entityDetectUnits.data,
  ]);

  // URL-driven scenario initialization
  const scenarioInitRef = useRef(false);
  const scenarioQuery = useQuery({
    queryKey: ["scenarioBuilder", "scenarios", "get", search.scenario_id],
    queryFn: () => trpc.scenarioBuilder.scenarios.get.query({ id: search.scenario_id! }),
    enabled: !!search.scenario_id && !scenarioInitRef.current,
    retry: false,
  });

  useEffect(() => {
    if (!search.scenario_id || scenarioInitRef.current) return;
    if (scenarioQuery.isLoading) return;

    scenarioInitRef.current = true;

    if (scenarioQuery.data) {
      const scenarioData = scenarioQuery.data as Record<string, unknown>;
      setScenarioWorkspace({
        mode: "edit",
        entityType: "scenario",
        entityId: search.scenario_id,
        data: scenarioData,
        formValues: { name: scenarioData.name },
        isDirty: false,
      });
      // If Scenarios tab is active, set selection
      if (activeTab === "Scenarios" || !search.tab) {
        setPerTabSelection((prev) => ({ ...prev, Scenarios: search.scenario_id! }));
      }
    } else {
      setScenarioWorkspace({
        mode: "not-found",
        entityType: "scenario",
        entityId: search.scenario_id,
        data: null,
        formValues: {},
        isDirty: false,
      });
    }
  }, [search.scenario_id, search.tab, activeTab, scenarioQuery.isLoading, scenarioQuery.data]);

  const setActiveTab = useCallback((tab: TabName) => {
    setActiveTabState(tab);
  }, []);

  const loadEntity = useCallback(
    async (tab: TabName, id: string) => {
      if (!isEntityTab(tab)) return;
      const entityType = TAB_TO_ENTITY_TYPE[tab];
      const routerKey = tab.toLowerCase() as "effects" | "spells" | "items" | "units";
      try {
        const data = await trpc.scenarioBuilder[routerKey].get.query({ id });
        const entityData = data as Record<string, unknown>;
        setEntityWorkspace({
          mode: "edit",
          entityType,
          entityId: id,
          data: entityData,
          formValues: { name: entityData.name },
          isDirty: false,
        });
        setPerTabSelection((prev) => ({ ...prev, [tab]: id }));
      } catch {
        setEntityWorkspace({
          mode: "not-found",
          entityType: entityType,
          entityId: id,
          data: null,
          formValues: {},
          isDirty: false,
        });
      }
    },
    [],
  );

  const loadScenario = useCallback(async (id: string) => {
    try {
      const data = await trpc.scenarioBuilder.scenarios.get.query({ id });
      const scenarioData = data as Record<string, unknown>;
      setScenarioWorkspace({
        mode: "edit",
        entityType: "scenario",
        entityId: id,
        data: scenarioData,
        formValues: { name: scenarioData.name },
        isDirty: false,
      });
      setPerTabSelection((prev) => ({ ...prev, Scenarios: id }));
    } catch {
      setScenarioWorkspace({
        mode: "not-found",
        entityType: "scenario",
        entityId: id,
        data: null,
        formValues: {},
        isDirty: false,
      });
    }
  }, []);

  const executePendingAction = useCallback(
    (action: PendingAction) => {
      if (action.type === "selectRecord" && action.id) {
        if (action.tab === "Scenarios") {
          loadScenario(action.id);
        } else {
          loadEntity(action.tab, action.id);
        }
      } else if (action.type === "createNew") {
        if (action.tab === "Scenarios") {
          setScenarioWorkspace({
            mode: "create",
            entityType: "scenario",
            entityId: null,
            data: null,
            formValues: { name: "" },
            isDirty: false,
          });
          setPerTabSelection((prev) => ({ ...prev, Scenarios: null }));
        } else if (isEntityTab(action.tab)) {
          const entityType = TAB_TO_ENTITY_TYPE[action.tab];
          setEntityWorkspace({
            mode: "create",
            entityType,
            entityId: null,
            data: null,
            formValues: { name: "" },
            isDirty: false,
          });
          setPerTabSelection((prev) => ({ ...prev, [action.tab]: null }));
        }
      }
    },
    [loadEntity, loadScenario],
  );

  const selectRecord = useCallback(
    (tab: TabName, id: string) => {
      const targetWorkspace = tab === "Scenarios" ? scenarioWorkspace : entityWorkspace;
      if (targetWorkspace.isDirty) {
        setPendingAction({ type: "selectRecord", tab, id });
        setIsDialogOpen(true);
        return;
      }
      if (tab === "Scenarios") {
        loadScenario(id);
      } else {
        loadEntity(tab, id);
      }
    },
    [entityWorkspace, scenarioWorkspace, loadEntity, loadScenario],
  );

  const createNew = useCallback(
    (tab: TabName) => {
      const targetWorkspace = tab === "Scenarios" ? scenarioWorkspace : entityWorkspace;
      if (targetWorkspace.isDirty) {
        setPendingAction({ type: "createNew", tab });
        setIsDialogOpen(true);
        return;
      }
      executePendingAction({ type: "createNew", tab });
    },
    [entityWorkspace, scenarioWorkspace, executePendingAction],
  );

  const updateEntityField = useCallback((field: string, value: unknown) => {
    setEntityWorkspace((prev) => {
      const newFormValues = { ...prev.formValues, [field]: value };
      const originalName = prev.data ? (prev.data as Record<string, unknown>).name : "";
      const isDirty = newFormValues.name !== originalName;
      return { ...prev, formValues: newFormValues, isDirty };
    });
  }, []);

  const updateScenarioField = useCallback((field: string, value: unknown) => {
    setScenarioWorkspace((prev) => {
      const newFormValues = { ...prev.formValues, [field]: value };
      const originalName = prev.data ? (prev.data as Record<string, unknown>).name : "";
      const isDirty = newFormValues.name !== originalName;
      return { ...prev, formValues: newFormValues, isDirty };
    });
  }, []);

  const confirmDiscard = useCallback(() => {
    setIsDialogOpen(false);
    if (pendingAction) {
      executePendingAction(pendingAction);
      setPendingAction(null);
    }
  }, [pendingAction, executePendingAction]);

  const cancelDiscard = useCallback(() => {
    setIsDialogOpen(false);
    setPendingAction(null);
  }, []);

  return {
    activeTab,
    perTabSelection,
    entityWorkspace,
    scenarioWorkspace,
    isDialogOpen,
    pendingAction,
    setActiveTab,
    selectRecord,
    createNew,
    updateEntityField,
    updateScenarioField,
    confirmDiscard,
    cancelDiscard,
    listData,
    listLoading,
  };
}
