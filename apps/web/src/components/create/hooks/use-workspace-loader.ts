import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "~/lib/trpc";
import {
  type TabName,
  type WorkspaceState,
  type EntityType,
  ENTITY_TYPE_TO_TAB,
  TAB_TO_ENTITY_TYPE,
  TAB_TO_ROUTER_KEY,
  isValidTab,
  isEntityTab,
  createIdleWorkspace,
} from "../types";

interface UseWorkspaceLoaderOptions {
  search: {
    tab?: string;
    entity_id?: string;
    effect_id?: string;
    spell_id?: string;
    scenario_id?: string;
  };
  activeTab: TabName;
  setActiveTabState: (tab: TabName) => void;
  navigate?: (opts: { search: (prev: Record<string, unknown>) => Record<string, unknown>; replace: boolean }) => void;
}

function computeIsDirty(
  formValues: WorkspaceState["formValues"],
  originalData: WorkspaceState["data"],
): boolean {
  return Object.keys(formValues).some((key) => {
    const original = originalData ? originalData[key] : "";
    return formValues[key] !== original;
  });
}

export function useWorkspaceLoader({
  search,
  activeTab,
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

  useEffect(() => {
    if (search.entity_id !== prevEntityIdRef.current) {
      prevEntityIdRef.current = search.entity_id;
      if (skipEntityResetRef.current) {
        skipEntityResetRef.current = false;
        return;
      }
      entityInitRef.current = false;
      setEntityWorkspace(createIdleWorkspace());
    }
  }, [search.entity_id]);

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
      const entityData = found.query.data as { name: string; [key: string]: unknown };
      const entityTab = ENTITY_TYPE_TO_TAB[found.type];
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
      const tabToCheck = isValidTab(search.tab) ? search.tab : entityTab;
      if (tabToCheck === entityTab) {
        setPerTabSelection((prev) => ({ ...prev, [entityTab]: search.entity_id! }));
      }
    } else {
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
    setActiveTabState,
    entityDetectEffects.isFetched,
    entityDetectEffects.data,
    entityDetectSpells.isFetched,
    entityDetectSpells.data,
    entityDetectItems.isFetched,
    entityDetectItems.data,
    entityDetectUnits.isFetched,
    entityDetectUnits.data,
  ]);

  // URL-driven initialization for effect_id
  const effectInitRef = useRef(false);
  const prevEffectIdRef = useRef(search.effect_id);

  useEffect(() => {
    if (search.effect_id !== prevEffectIdRef.current) {
      prevEffectIdRef.current = search.effect_id;
      if (skipEntityResetRef.current) {
        skipEntityResetRef.current = false;
        return;
      }
      effectInitRef.current = false;
      setEntityWorkspace(createIdleWorkspace());
    }
  }, [search.effect_id]);

  const effectQuery = useQuery({
    queryKey: ["scenarioBuilder", "effects", "get", search.effect_id],
    queryFn: () => trpc.scenarioBuilder.effects.get.query({ id: search.effect_id! }),
    enabled: !!search.effect_id && !effectInitRef.current,
    retry: false,
  });

  useEffect(() => {
    if (!search.effect_id || effectInitRef.current) return;
    if (!effectQuery.isFetched) return;

    effectInitRef.current = true;

    if (effectQuery.data) {
      const entityData = effectQuery.data as { name: string; [key: string]: unknown };
      if (!search.tab) {
        setActiveTabState("Effects");
      }
      setEntityWorkspace({
        mode: "edit",
        entityType: "effect",
        entityId: search.effect_id,
        data: entityData,
        formValues: { name: entityData.name },
        isDirty: false,
      });
      const tabToCheck = isValidTab(search.tab) ? search.tab : "Effects";
      if (tabToCheck === "Effects") {
        setPerTabSelection((prev) => ({ ...prev, Effects: search.effect_id! }));
      }
    } else {
      setEntityWorkspace({
        mode: "not-found",
        entityType: "effect",
        entityId: search.effect_id,
        data: null,
        formValues: {},
        isDirty: false,
      });
    }
  }, [search.effect_id, search.tab, setActiveTabState, effectQuery.isFetched, effectQuery.data]);

  // URL-driven initialization for spell_id
  const spellInitRef = useRef(false);
  const prevSpellIdRef = useRef(search.spell_id);

  useEffect(() => {
    if (search.spell_id !== prevSpellIdRef.current) {
      prevSpellIdRef.current = search.spell_id;
      if (skipEntityResetRef.current) {
        skipEntityResetRef.current = false;
        return;
      }
      spellInitRef.current = false;
      setEntityWorkspace(createIdleWorkspace());
    }
  }, [search.spell_id]);

  const spellQuery = useQuery({
    queryKey: ["scenarioBuilder", "spells", "get", search.spell_id],
    queryFn: () => trpc.scenarioBuilder.spells.get.query({ id: search.spell_id! }),
    enabled: !!search.spell_id && !spellInitRef.current,
    retry: false,
  });

  useEffect(() => {
    if (!search.spell_id || spellInitRef.current) return;
    if (!spellQuery.isFetched) return;

    spellInitRef.current = true;

    if (spellQuery.data) {
      const entityData = spellQuery.data as { name: string; [key: string]: unknown };
      if (!search.tab) {
        setActiveTabState("Spells");
      }
      setEntityWorkspace({
        mode: "edit",
        entityType: "spell",
        entityId: search.spell_id,
        data: entityData,
        formValues: { name: entityData.name },
        isDirty: false,
      });
      const tabToCheck = isValidTab(search.tab) ? search.tab : "Spells";
      if (tabToCheck === "Spells") {
        setPerTabSelection((prev) => ({ ...prev, Spells: search.spell_id! }));
      }
    } else {
      setEntityWorkspace({
        mode: "not-found",
        entityType: "spell",
        entityId: search.spell_id,
        data: null,
        formValues: {},
        isDirty: false,
      });
    }
  }, [search.spell_id, search.tab, setActiveTabState, spellQuery.isFetched, spellQuery.data]);

  // URL-driven scenario initialization
  const scenarioInitRef = useRef(false);
  const prevScenarioIdRef = useRef(search.scenario_id);
  const skipScenarioResetRef = useRef(false);

  useEffect(() => {
    if (search.scenario_id !== prevScenarioIdRef.current) {
      prevScenarioIdRef.current = search.scenario_id;
      if (skipScenarioResetRef.current) {
        skipScenarioResetRef.current = false;
        return;
      }
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
      const scenarioData = scenarioQuery.data as { name: string; [key: string]: unknown };
      setScenarioWorkspace({
        mode: "edit",
        entityType: "scenario",
        entityId: search.scenario_id,
        data: scenarioData,
        formValues: { name: scenarioData.name },
        isDirty: false,
      });
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
        if (pendingEntityIdRef.current !== id) return;
        const entityData = data as { name: string; [key: string]: unknown };
        setEntityWorkspace({
          mode: "edit",
          entityType,
          entityId: id,
          data: entityData,
          formValues: { name: entityData.name },
          isDirty: false,
        });
        setPerTabSelection((prev) => ({ ...prev, [tab]: id }));
        const urlParam = tab === "Effects" ? "effect_id" : tab === "Spells" ? "spell_id" : "entity_id";
        navigate?.({ search: (prev) => ({ ...prev, [urlParam]: id }), replace: true });
      } catch {
        if (pendingEntityIdRef.current !== id) return;
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
      if (pendingScenarioIdRef.current !== id) return;
      const scenarioData = data as { name: string; [key: string]: unknown };
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
  }, [navigate]);

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
            formValues: { name: "" },
            isDirty: false,
          });
          setPerTabSelection((prev) => ({ ...prev, Scenarios: null }));
          skipScenarioResetRef.current = true;
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
          skipEntityResetRef.current = true;
          const paramToRemove = action.tab === "Effects" ? "effect_id" : action.tab === "Spells" ? "spell_id" : "entity_id";
          navigate?.({
            search: (prev) => {
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
