import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { trpc } from "~/lib/trpc";
import {
  type TabName,
  type WorkspaceState,
  type EntityType,
  type ScenarioSortBy,
  type ScenarioSortDir,
  DEFAULT_TAB,
  SCENARIOS_PAGE_SIZE,
  ENTITY_TABS,
  ENTITY_TYPE_TO_TAB,
  TAB_TO_ENTITY_TYPE,
  TAB_TO_ROUTER_KEY,
  isValidTab,
  isEntityTab,
  createIdleWorkspace,
} from "./types";

function computeIsDirty(
  formValues: Record<string, unknown>,
  originalData: Record<string, unknown> | null,
): boolean {
  return Object.keys(formValues).some((key) => {
    const original = originalData ? originalData[key] : "";
    return formValues[key] !== original;
  });
}

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
  const queryClient = useQueryClient();
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

  // Scenario list state
  const [scenarioPage, setScenarioPage] = useState(1);
  const [scenarioSortBy, setScenarioSortBy] = useState<ScenarioSortBy>("name");
  const [scenarioSortDir, setScenarioSortDir] = useState<ScenarioSortDir>("asc");

  // Delete state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Lazy loading: only fire the active tab's query on cold load,
  // then enable the remaining tabs once the active one settles.
  const [backgroundEnabled, setBackgroundEnabled] = useState(false);

  const effectsList = useQuery({
    queryKey: ["scenarioBuilder", "effects", "list"],
    queryFn: () => trpc.scenarioBuilder.effects.list.query({}),
    enabled: activeTab === "Effects" || backgroundEnabled,
  });
  const spellsList = useQuery({
    queryKey: ["scenarioBuilder", "spells", "list"],
    queryFn: () => trpc.scenarioBuilder.spells.list.query({}),
    enabled: activeTab === "Spells" || backgroundEnabled,
  });
  const itemsList = useQuery({
    queryKey: ["scenarioBuilder", "items", "list"],
    queryFn: () => trpc.scenarioBuilder.items.list.query({}),
    enabled: activeTab === "Items" || backgroundEnabled,
  });
  const unitsList = useQuery({
    queryKey: ["scenarioBuilder", "units", "list"],
    queryFn: () => trpc.scenarioBuilder.units.list.query({}),
    enabled: activeTab === "Units" || backgroundEnabled,
  });
  const scenariosList = useQuery({
    queryKey: ["scenarioBuilder", "scenarios", "list", scenarioPage, scenarioSortBy, scenarioSortDir],
    queryFn: () => trpc.scenarioBuilder.scenarios.list.query({
      page: scenarioPage,
      limit: SCENARIOS_PAGE_SIZE,
      sortBy: scenarioSortBy,
      sortDir: scenarioSortDir,
    }),
    enabled: activeTab === "Scenarios" || backgroundEnabled,
  });

  // Enable background loading once the active tab's query settles
  const queryByTab: Record<TabName, { isLoading: boolean }> = {
    Effects: effectsList,
    Spells: spellsList,
    Items: itemsList,
    Units: unitsList,
    Scenarios: scenariosList,
  };

  const activeTabIsLoading = queryByTab[activeTab].isLoading;

  useEffect(() => {
    if (backgroundEnabled) return;
    if (!activeTabIsLoading) {
      setBackgroundEnabled(true);
    }
  }, [backgroundEnabled, activeTabIsLoading]);

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

  // Scenario list computed values
  const scenarioListItems = scenariosList.data?.items ?? [];
  const scenarioTotalCount = scenariosList.data?.totalCount ?? 0;
  const scenarioTotalPages = Math.max(1, Math.ceil(scenarioTotalCount / SCENARIOS_PAGE_SIZE));

  // URL-driven initialization for entity_id
  const entityInitRef = useRef(false);
  const prevEntityIdRef = useRef(search.entity_id);

  // Reset entity workspace when entity_id URL param changes
  useEffect(() => {
    if (search.entity_id !== prevEntityIdRef.current) {
      prevEntityIdRef.current = search.entity_id;
      entityInitRef.current = false;
      setEntityWorkspace(createIdleWorkspace());
    }
  }, [search.entity_id]);

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

    const allSettled = detectors.every((d) => d.query.isFetched);
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
    entityDetectEffects.isFetched,
    entityDetectEffects.data,
    entityDetectSpells.isFetched,
    entityDetectSpells.data,
    entityDetectItems.isFetched,
    entityDetectItems.data,
    entityDetectUnits.isFetched,
    entityDetectUnits.data,
  ]);

  // URL-driven scenario initialization
  const scenarioInitRef = useRef(false);
  const prevScenarioIdRef = useRef(search.scenario_id);

  // Reset scenario workspace when scenario_id URL param changes
  useEffect(() => {
    if (search.scenario_id !== prevScenarioIdRef.current) {
      prevScenarioIdRef.current = search.scenario_id;
      scenarioInitRef.current = false;
      setScenarioWorkspace(createIdleWorkspace());
    }
  }, [search.scenario_id]);
  const scenarioQuery = useQuery({
    queryKey: ["scenarioBuilder", "scenarios", "get", search.scenario_id],
    queryFn: () => trpc.scenarioBuilder.scenarios.get.query({ id: search.scenario_id! }),
    enabled: !!search.scenario_id && !scenarioInitRef.current,
    retry: false,
  });

  useEffect(() => {
    if (!search.scenario_id || scenarioInitRef.current) return;
    if (!scenarioQuery.isFetched) return;

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
  }, [search.scenario_id, search.tab, activeTab, scenarioQuery.isFetched, scenarioQuery.data]);

  const setActiveTab = useCallback((tab: TabName) => {
    setActiveTabState(tab);
    navigate?.({ search: (prev) => ({ ...prev, tab }), replace: true });
  }, [navigate]);

  // Track the most recently requested IDs to discard stale responses
  const pendingEntityIdRef = useRef<string | null>(null);
  const pendingScenarioIdRef = useRef<string | null>(null);

  const loadEntity = useCallback(
    async (tab: TabName, id: string) => {
      if (!isEntityTab(tab)) return;
      const entityType = TAB_TO_ENTITY_TYPE[tab];
      const routerKey = TAB_TO_ROUTER_KEY[tab];
      pendingEntityIdRef.current = id;
      setEntityWorkspace({
        mode: "loading",
        entityType,
        entityId: id,
        data: null,
        formValues: {},
        isDirty: false,
      });
      try {
        const data = await trpc.scenarioBuilder[routerKey].get.query({ id });
        if (pendingEntityIdRef.current !== id) return; // stale — discard
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
        navigate?.({ search: (prev) => ({ ...prev, entity_id: id }), replace: true });
      } catch {
        if (pendingEntityIdRef.current !== id) return; // stale — discard
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
    [navigate],
  );

  const loadScenario = useCallback(async (id: string) => {
    pendingScenarioIdRef.current = id;
    setScenarioWorkspace({
      mode: "loading",
      entityType: "scenario",
      entityId: id,
      data: null,
      formValues: {},
      isDirty: false,
    });
    try {
      const data = await trpc.scenarioBuilder.scenarios.get.query({ id });
      if (pendingScenarioIdRef.current !== id) return; // stale — discard
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
      navigate?.({ search: (prev) => ({ ...prev, scenario_id: id }), replace: true });
    } catch {
      if (pendingScenarioIdRef.current !== id) return; // stale — discard
      setScenarioWorkspace({
        mode: "not-found",
        entityType: "scenario",
        entityId: id,
        data: null,
        formValues: {},
        isDirty: false,
      });
    }
  }, [navigate]);

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
          navigate?.({
            search: (prev) => {
              const next = { ...prev };
              delete next.scenario_id;
              return next;
            },
            replace: true,
          });
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
          navigate?.({
            search: (prev) => {
              const next = { ...prev };
              delete next.entity_id;
              return next;
            },
            replace: true,
          });
        }
      }
    },
    [loadEntity, loadScenario, navigate],
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
      const isDirty = computeIsDirty(newFormValues, prev.data);
      return { ...prev, formValues: newFormValues, isDirty };
    });
  }, []);

  const updateScenarioField = useCallback((field: string, value: unknown) => {
    setScenarioWorkspace((prev) => {
      const newFormValues = { ...prev.formValues, [field]: value };
      const isDirty = computeIsDirty(newFormValues, prev.data);
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

  // Scenario sort/page actions
  const setScenarioSort = useCallback((sortBy: ScenarioSortBy, sortDir: ScenarioSortDir) => {
    setScenarioSortBy(sortBy);
    setScenarioSortDir(sortDir);
    setScenarioPage(1);
  }, []);

  const setScenarioPageAction = useCallback((page: number) => {
    setScenarioPage(page);
  }, []);

  // Delete actions
  const requestDeleteScenario = useCallback((id: string, name: string) => {
    setDeleteTarget({ id, name });
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDeleteScenario = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      setDeleteError(null);
      await trpc.scenarioBuilder.scenarios.delete.mutate({ id: deleteTarget.id });

      // If deleted scenario is currently open, clear workspace
      if (scenarioWorkspace.entityId === deleteTarget.id) {
        setScenarioWorkspace(createIdleWorkspace());
        setPerTabSelection((prev) => ({ ...prev, Scenarios: null }));
        navigate?.({
          search: (prev) => {
            const next = { ...prev };
            delete next.scenario_id;
            return next;
          },
          replace: true,
        });
      }

      // Invalidate scenario list queries
      await queryClient.invalidateQueries({
        queryKey: ["scenarioBuilder", "scenarios", "list"],
      });

      // If we were on a page > 1 and that page might now be empty, go back
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
  }, [deleteTarget, scenarioWorkspace.entityId, navigate, queryClient, scenarioTotalCount, scenarioPage]);

  const cancelDeleteScenario = useCallback(() => {
    setDeleteTarget(null);
    setIsDeleteDialogOpen(false);
    setDeleteError(null);
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
    // Scenario list specific
    scenarioListItems,
    scenarioPage,
    scenarioTotalPages,
    scenarioSortBy,
    scenarioSortDir,
    setScenarioSort,
    setScenarioPage: setScenarioPageAction,
    // Delete
    isDeleteDialogOpen,
    deleteTarget,
    deleteError,
    requestDeleteScenario,
    confirmDeleteScenario,
    cancelDeleteScenario,
  };
}
