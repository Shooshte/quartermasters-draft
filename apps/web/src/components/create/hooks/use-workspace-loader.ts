import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "~/lib/trpc";
import {
  type CreatePageNavigate,
  createIdleWorkspace,
  ENTITY_TYPE_TO_TAB,
  type EntityType,
  isEntityTab,
  TAB_TO_ENTITY_TYPE,
  type TabName,
  type WorkspaceState,
} from "../types";
import {
  getWorkspaceEntityConfig,
  type WorkspaceEntityConfig,
  type WorkspaceRecord,
  workspaceEntityConfigs,
} from "../workspace-entity-config";

interface UseWorkspaceLoaderOptions {
  search: {
    tab?: string;
    entity_id?: string;
    effect_id?: string;
    spell_id?: string;
    item_id?: string;
    unit_id?: string;
    scenario_id?: string;
  };
  setActiveTabState: (tab: TabName) => void;
  navigate?: CreatePageNavigate;
}

function isNotFoundError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const candidate = error as {
    data?: { code?: string };
    shape?: { data?: { code?: string } };
  };
  return candidate.data?.code === "NOT_FOUND" || candidate.shape?.data?.code === "NOT_FOUND";
}

export function computeIsDirty(
  formValues: WorkspaceState["formValues"],
  originalData: WorkspaceState["data"],
  entityType: WorkspaceState["entityType"],
): boolean {
  if (!entityType) return false;
  return getWorkspaceEntityConfig(entityType).isDirty(
    formValues,
    originalData as WorkspaceRecord | null,
  );
}

function useDirectWorkspaceLoad(options: {
  config: WorkspaceEntityConfig;
  id: string | undefined;
  searchTab: string | undefined;
  skipResetRef: React.MutableRefObject<boolean>;
  setWorkspace: React.Dispatch<React.SetStateAction<WorkspaceState>>;
  setPerTabSelection: React.Dispatch<React.SetStateAction<Record<TabName, string | null>>>;
  setActiveTabState?: (tab: TabName) => void;
}) {
  const initRef = useRef(false);
  const previousIdRef = useRef(options.id);

  useEffect(() => {
    if (options.id === previousIdRef.current) return;
    previousIdRef.current = options.id;
    if (options.skipResetRef.current) {
      options.skipResetRef.current = false;
      return;
    }
    initRef.current = false;
    options.setWorkspace(createIdleWorkspace());
  }, [options.id, options.setWorkspace, options.skipResetRef]);

  const query = useQuery({
    queryKey: options.config.queryKey(options.id ?? "disabled"),
    queryFn: () => options.config.load(options.id ?? ""),
    enabled: !!options.id && !initRef.current,
    retry: false,
  });

  useEffect(() => {
    if (!options.id || initRef.current || !query.isFetched) return;
    if (query.isError && !isNotFoundError(query.error)) return;
    initRef.current = true;
    if (query.data) {
      const record = query.data as WorkspaceRecord;
      if (!options.searchTab) options.setActiveTabState?.(options.config.tab);
      options.setWorkspace({
        mode: "edit",
        entityType: options.config.entityType,
        entityId: options.id,
        data: record,
        formValues: options.config.recordToFormValues(record),
        isDirty: false,
      });
      options.setPerTabSelection((previous) => ({
        ...previous,
        [options.config.tab]: options.id ?? null,
      }));
      return;
    }
    options.setWorkspace({
      mode: "not-found",
      entityType: options.config.entityType,
      entityId: options.id,
      data: null,
      formValues: {},
      isDirty: false,
    });
  }, [
    options.config,
    options.id,
    options.searchTab,
    options.setActiveTabState,
    options.setPerTabSelection,
    options.setWorkspace,
    query.data,
    query.error,
    query.isError,
    query.isFetched,
  ]);

  return { initRef, previousIdRef, query };
}

export function useWorkspaceLoader({
  search,
  setActiveTabState,
  navigate,
}: UseWorkspaceLoaderOptions) {
  const [entityWorkspace, setEntityWorkspace] = useState<WorkspaceState>(createIdleWorkspace());
  const [scenarioWorkspace, setScenarioWorkspace] = useState<WorkspaceState>(createIdleWorkspace());
  const [perTabSelection, setPerTabSelection] = useState<Record<TabName, string | null>>({
    Effects: null,
    Spells: null,
    Items: null,
    Units: null,
    Scenarios: null,
  });

  // URL-driven initialization for entity_id
  const entityInitRef = useRef(false);
  const prevEntityIdRef = useRef(search.entity_id);
  const skipEntityResetRef = useRef(false);
  const hasDirectEntityId = !!(
    search.effect_id ||
    search.spell_id ||
    search.item_id ||
    search.unit_id
  );

  useEffect(() => {
    if (search.entity_id !== prevEntityIdRef.current) {
      prevEntityIdRef.current = search.entity_id;
      if (hasDirectEntityId) return;
      if (skipEntityResetRef.current) {
        skipEntityResetRef.current = false;
        return;
      }
      entityInitRef.current = false;
      setEntityWorkspace(createIdleWorkspace());
    }
  }, [search.entity_id, hasDirectEntityId]);

  const entityDetectEffects = useQuery({
    queryKey: ["scenarioBuilder", "effects", "get", search.entity_id],
    queryFn: () =>
      trpc.scenarioBuilder.effects.get.query({
        id: search.entity_id ?? "",
      }),
    enabled: !!search.entity_id && !hasDirectEntityId && !entityInitRef.current,
    retry: false,
  });
  const entityDetectSpells = useQuery({
    queryKey: ["scenarioBuilder", "spells", "get", search.entity_id],
    queryFn: () =>
      trpc.scenarioBuilder.spells.get.query({
        id: search.entity_id ?? "",
      }),
    enabled: !!search.entity_id && !hasDirectEntityId && !entityInitRef.current,
    retry: false,
  });

  useEffect(() => {
    const entityId = search.entity_id;
    if (!entityId || hasDirectEntityId || entityInitRef.current) return;
    if (!entityDetectEffects.isFetched || !entityDetectSpells.isFetched) return;

    entityInitRef.current = true;

    const found = entityDetectEffects.data
      ? { type: "effect" as EntityType, data: entityDetectEffects.data }
      : entityDetectSpells.data
        ? { type: "spell" as EntityType, data: entityDetectSpells.data }
        : null;
    if (found) {
      const entityData = found.data as { name: string; [key: string]: unknown };
      const entityTab = ENTITY_TYPE_TO_TAB[found.type];
      const config = getWorkspaceEntityConfig(found.type);
      if (!search.tab) {
        setActiveTabState(entityTab);
      }
      setEntityWorkspace({
        mode: "edit",
        entityType: found.type,
        entityId,
        data: entityData,
        formValues: config.recordToFormValues(entityData),
        isDirty: false,
      });
      setPerTabSelection((prev) => ({ ...prev, [entityTab]: entityId }));
    } else {
      setEntityWorkspace({
        mode: "not-found",
        entityType: null,
        entityId,
        data: null,
        formValues: {},
        isDirty: false,
      });
    }
  }, [
    search.entity_id,
    hasDirectEntityId,
    search.tab,
    setActiveTabState,
    entityDetectEffects.isFetched,
    entityDetectEffects.data,
    entityDetectSpells.isFetched,
    entityDetectSpells.data,
  ]);

  const skipScenarioResetRef = useRef(false);
  const effectLoad = useDirectWorkspaceLoad({
    config: workspaceEntityConfigs.effect,
    id: search.effect_id,
    searchTab: search.tab,
    skipResetRef: skipEntityResetRef,
    setWorkspace: setEntityWorkspace,
    setPerTabSelection,
    setActiveTabState,
  });
  const spellLoad = useDirectWorkspaceLoad({
    config: workspaceEntityConfigs.spell,
    id: search.spell_id,
    searchTab: search.tab,
    skipResetRef: skipEntityResetRef,
    setWorkspace: setEntityWorkspace,
    setPerTabSelection,
    setActiveTabState,
  });
  const itemLoad = useDirectWorkspaceLoad({
    config: workspaceEntityConfigs.item,
    id: search.item_id,
    searchTab: search.tab,
    skipResetRef: skipEntityResetRef,
    setWorkspace: setEntityWorkspace,
    setPerTabSelection,
    setActiveTabState,
  });
  const unitLoad = useDirectWorkspaceLoad({
    config: workspaceEntityConfigs.unit,
    id: search.unit_id,
    searchTab: search.tab,
    skipResetRef: skipEntityResetRef,
    setWorkspace: setEntityWorkspace,
    setPerTabSelection,
    setActiveTabState,
  });
  const scenarioLoad = useDirectWorkspaceLoad({
    config: workspaceEntityConfigs.scenario,
    id: search.scenario_id,
    searchTab: search.tab,
    skipResetRef: skipScenarioResetRef,
    setWorkspace: setScenarioWorkspace,
    setPerTabSelection,
  });

  const effectInitRef = effectLoad.initRef;
  const prevEffectIdRef = effectLoad.previousIdRef;
  const spellInitRef = spellLoad.initRef;
  const prevSpellIdRef = spellLoad.previousIdRef;
  const itemInitRef = itemLoad.initRef;
  const prevItemIdRef = itemLoad.previousIdRef;
  const unitInitRef = unitLoad.initRef;
  const prevUnitIdRef = unitLoad.previousIdRef;
  const scenarioInitRef = scenarioLoad.initRef;
  const prevScenarioIdRef = scenarioLoad.previousIdRef;

  const pendingEntityIdRef = useRef<string | null>(null);
  const pendingScenarioIdRef = useRef<string | null>(null);

  const loadEntity = useCallback(
    async (tab: TabName, id: string) => {
      if (!isEntityTab(tab)) return;
      const requestedEntityType = TAB_TO_ENTITY_TYPE[tab];
      const config = getWorkspaceEntityConfig(requestedEntityType);
      pendingEntityIdRef.current = id;
      setEntityWorkspace((prev) => {
        const keepPreviousRenderedShape = prev.data !== null && prev.entityType !== null;

        return {
          ...prev,
          mode: "loading",
          entityType: keepPreviousRenderedShape ? prev.entityType : requestedEntityType,
          entityId: id,
          isDirty: false,
        };
      });
      try {
        const data = await config.load(id);
        if (pendingEntityIdRef.current !== id) return;
        const entityData = data as { name: string; [key: string]: unknown };
        setEntityWorkspace({
          mode: "edit",
          entityType: requestedEntityType,
          entityId: id,
          data: entityData,
          formValues: config.recordToFormValues(entityData),
          isDirty: false,
        });
        setPerTabSelection((prev) => ({ ...prev, [tab]: id }));
        const urlParam = config.searchParam;

        // Sync prev-refs and init-refs so URL-driven effects don't reset/refetch
        const paramRefs = {
          effect_id: { prev: prevEffectIdRef, init: effectInitRef },
          spell_id: { prev: prevSpellIdRef, init: spellInitRef },
          item_id: { prev: prevItemIdRef, init: itemInitRef },
          unit_id: { prev: prevUnitIdRef, init: unitInitRef },
          entity_id: { prev: prevEntityIdRef, init: entityInitRef },
        } as const;
        paramRefs[urlParam as keyof typeof paramRefs].prev.current = id;
        paramRefs[urlParam as keyof typeof paramRefs].init.current = true;
        for (const [param, refs] of Object.entries(paramRefs)) {
          if (param !== urlParam) refs.prev.current = undefined;
        }

        skipEntityResetRef.current = true;
        navigate?.({
          search: (prev: Record<string, unknown>) => {
            const next = { ...prev };
            delete next.effect_id;
            delete next.spell_id;
            delete next.item_id;
            delete next.unit_id;
            delete next.entity_id;
            next[urlParam] = id;
            return next;
          },
          replace: true,
        });
      } catch {
        if (pendingEntityIdRef.current !== id) return;
        setEntityWorkspace({
          mode: "not-found",
          entityType: requestedEntityType,
          entityId: id,
          data: null,
          formValues: {},
          isDirty: false,
        });
      }
    },
    [
      effectInitRef,
      itemInitRef,
      navigate,
      prevEffectIdRef,
      prevItemIdRef,
      prevSpellIdRef,
      prevUnitIdRef,
      spellInitRef,
      unitInitRef,
    ],
  );

  const loadScenario = useCallback(
    async (id: string) => {
      pendingScenarioIdRef.current = id;
      setScenarioWorkspace((prev) => ({
        ...prev,
        mode: "loading",
        entityType: "scenario",
        entityId: id,
        isDirty: false,
      }));
      try {
        const config = workspaceEntityConfigs.scenario;
        const data = await config.load(id);
        if (pendingScenarioIdRef.current !== id) return;
        const scenarioData = data as { name: string; [key: string]: unknown };
        setScenarioWorkspace({
          mode: "edit",
          entityType: "scenario",
          entityId: id,
          data: scenarioData,
          formValues: config.recordToFormValues(scenarioData),
          isDirty: false,
        });
        setPerTabSelection((prev) => ({ ...prev, Scenarios: id }));
        prevScenarioIdRef.current = id;
        scenarioInitRef.current = true;
        skipScenarioResetRef.current = true;
        navigate?.({
          search: (prev: Record<string, unknown>) => ({ ...prev, scenario_id: id }),
          replace: true,
        });
      } catch {
        if (pendingScenarioIdRef.current !== id) return;
        setScenarioWorkspace({
          mode: "not-found",
          entityType: "scenario",
          entityId: id,
          data: null,
          formValues: {},
          isDirty: false,
        });
      }
    },
    [navigate, prevScenarioIdRef, scenarioInitRef],
  );

  const executePendingAction = useCallback(
    (action: { type: "selectRecord" | "createNew"; tab: TabName; id?: string }) => {
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
            formValues: workspaceEntityConfigs.scenario.createDefaultValues(),
            isDirty: false,
          });
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
        } else if (isEntityTab(action.tab)) {
          const entityType = TAB_TO_ENTITY_TYPE[action.tab];
          const config = getWorkspaceEntityConfig(entityType);
          setEntityWorkspace({
            mode: "create",
            entityType,
            entityId: null,
            data: null,
            formValues: config.createDefaultValues(),
            isDirty: false,
          });
          setPerTabSelection((prev) => ({ ...prev, [action.tab]: null }));
          skipEntityResetRef.current = true;
          const paramToRemove = config.searchParam;
          navigate?.({
            search: (prev: Record<string, unknown>) => {
              const next = { ...prev };
              delete next[paramToRemove];
              return next;
            },
            replace: true,
          });
        }
      }
    },
    [loadEntity, loadScenario, navigate],
  );

  const updateEntityField = useCallback((field: string, value: unknown) => {
    setEntityWorkspace((prev) => {
      const newFormValues = { ...prev.formValues, [field]: value };
      const isDirty = computeIsDirty(newFormValues, prev.data, prev.entityType);
      return { ...prev, formValues: newFormValues, isDirty };
    });
  }, []);

  const updateScenarioField = useCallback((field: string, value: unknown) => {
    setScenarioWorkspace((prev) => {
      const newFormValues = { ...prev.formValues, [field]: value };
      const isDirty = computeIsDirty(newFormValues, prev.data, prev.entityType);
      return { ...prev, formValues: newFormValues, isDirty };
    });
  }, []);

  return {
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
  };
}
