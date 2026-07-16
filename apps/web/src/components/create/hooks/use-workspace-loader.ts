import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "~/lib/trpc";
import { createDefaultEffectFormValues, effectRecordToFormValues } from "../effect-form";
import {
  createDefaultItemFormValues,
  type ItemFormValues,
  isItemFormDirty,
  itemRecordToFormValues,
} from "../item-form";
import {
  createDefaultScenarioFormValues,
  isScenarioFormDirty,
  type ScenarioFormValues,
  scenarioRecordToFormValues,
} from "../scenario-form";
import { createDefaultSpellFormValues, spellRecordToFormValues } from "../spell-form";
import {
  type CreatePageNavigate,
  createIdleWorkspace,
  ENTITY_TYPE_TO_TAB,
  type EntityType,
  isEntityTab,
  TAB_TO_ENTITY_TYPE,
  TAB_TO_ROUTER_KEY,
  type TabName,
  type WorkspaceState,
} from "../types";
import {
  createDefaultUnitFormValues,
  isUnitFormDirty,
  type UnitFormValues,
  unitRecordToFormValues,
} from "../unit-form";

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

function getRequiredSearchId(id: string | undefined, paramName: string): string {
  if (!id) {
    throw new Error(`Missing required search parameter: ${paramName}`);
  }

  return id;
}

export function computeIsDirty(
  formValues: WorkspaceState["formValues"],
  originalData: WorkspaceState["data"],
  entityType: WorkspaceState["entityType"],
): boolean {
  if (entityType === "item") {
    return isItemFormDirty(
      formValues as ItemFormValues,
      originalData as Record<string, unknown> | null,
    );
  }
  if (entityType === "unit") {
    return isUnitFormDirty(
      formValues as UnitFormValues,
      originalData as Record<string, unknown> | null,
    );
  }
  if (entityType === "scenario") {
    return isScenarioFormDirty(
      formValues as ScenarioFormValues,
      originalData as Record<string, unknown> | null,
    );
  }

  const normalise = (value: unknown) => (value === null || value === undefined ? "" : value);

  return Object.keys(formValues).some((key) => {
    const current = formValues[key];
    const original = originalData ? originalData[key] : "";
    const compatibilityDefault =
      entityType === "spell" && key === "targetScope" && original === undefined
        ? "self_and_others"
        : original;
    if (Array.isArray(current) && Array.isArray(original)) {
      return current.length !== original.length || current.some((v, i) => v !== original[i]);
    }
    return normalise(current) !== normalise(compatibilityDefault);
  });
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
    queryFn: () =>
      trpc.scenarioBuilder.effects.get.query({
        id: getRequiredSearchId(search.entity_id, "entity_id"),
      }),
    enabled: !!search.entity_id && !entityInitRef.current,
    retry: false,
  });
  const entityDetectSpells = useQuery({
    queryKey: ["scenarioBuilder", "spells", "get", search.entity_id],
    queryFn: () =>
      trpc.scenarioBuilder.spells.get.query({
        id: getRequiredSearchId(search.entity_id, "entity_id"),
      }),
    enabled: !!search.entity_id && !entityInitRef.current,
    retry: false,
  });

  useEffect(() => {
    const entityId = search.entity_id;
    if (!entityId || entityInitRef.current) return;
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
      if (!search.tab) {
        setActiveTabState(entityTab);
      }
      setEntityWorkspace({
        mode: "edit",
        entityType: found.type,
        entityId,
        data: entityData,
        formValues:
          found.type === "effect"
            ? effectRecordToFormValues(entityData)
            : found.type === "spell"
              ? spellRecordToFormValues(entityData)
              : found.type === "item"
                ? itemRecordToFormValues(entityData)
                : found.type === "unit"
                  ? unitRecordToFormValues(entityData)
                  : { name: entityData.name },
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
    search.tab,
    setActiveTabState,
    entityDetectEffects.isFetched,
    entityDetectEffects.data,
    entityDetectSpells.isFetched,
    entityDetectSpells.data,
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
    queryFn: () =>
      trpc.scenarioBuilder.effects.get.query({
        id: getRequiredSearchId(search.effect_id, "effect_id"),
      }),
    enabled: !!search.effect_id && !effectInitRef.current,
    retry: false,
  });

  useEffect(() => {
    const effectId = search.effect_id;
    if (!effectId || effectInitRef.current) return;
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
        entityId: effectId,
        data: entityData,
        formValues: effectRecordToFormValues(entityData),
        isDirty: false,
      });
      setPerTabSelection((prev) => ({ ...prev, Effects: effectId }));
    } else {
      setEntityWorkspace({
        mode: "not-found",
        entityType: "effect",
        entityId: effectId,
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
    queryFn: () =>
      trpc.scenarioBuilder.spells.get.query({
        id: getRequiredSearchId(search.spell_id, "spell_id"),
      }),
    enabled: !!search.spell_id && !spellInitRef.current,
    retry: false,
  });

  useEffect(() => {
    const spellId = search.spell_id;
    if (!spellId || spellInitRef.current) return;
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
        entityId: spellId,
        data: entityData,
        formValues: spellRecordToFormValues(entityData),
        isDirty: false,
      });
      setPerTabSelection((prev) => ({ ...prev, Spells: spellId }));
    } else {
      setEntityWorkspace({
        mode: "not-found",
        entityType: "spell",
        entityId: spellId,
        data: null,
        formValues: {},
        isDirty: false,
      });
    }
  }, [search.spell_id, search.tab, setActiveTabState, spellQuery.isFetched, spellQuery.data]);

  // URL-driven initialization for item_id
  const itemInitRef = useRef(false);
  const prevItemIdRef = useRef(search.item_id);

  useEffect(() => {
    if (search.item_id !== prevItemIdRef.current) {
      prevItemIdRef.current = search.item_id;
      if (skipEntityResetRef.current) {
        skipEntityResetRef.current = false;
        return;
      }
      itemInitRef.current = false;
      setEntityWorkspace(createIdleWorkspace());
    }
  }, [search.item_id]);

  const itemQuery = useQuery({
    queryKey: ["scenarioBuilder", "items", "get", search.item_id],
    queryFn: () =>
      trpc.scenarioBuilder.items.get.query({
        id: getRequiredSearchId(search.item_id, "item_id"),
      }),
    enabled: !!search.item_id && !itemInitRef.current,
    retry: false,
  });

  useEffect(() => {
    const itemId = search.item_id;
    if (!itemId || itemInitRef.current) return;
    if (!itemQuery.isFetched) return;

    itemInitRef.current = true;

    if (itemQuery.data) {
      const entityData = itemQuery.data as { name: string; [key: string]: unknown };
      if (!search.tab) {
        setActiveTabState("Items");
      }
      setEntityWorkspace({
        mode: "edit",
        entityType: "item",
        entityId: itemId,
        data: entityData,
        formValues: itemRecordToFormValues(entityData),
        isDirty: false,
      });
      setPerTabSelection((prev) => ({ ...prev, Items: itemId }));
    } else {
      setEntityWorkspace({
        mode: "not-found",
        entityType: "item",
        entityId: itemId,
        data: null,
        formValues: {},
        isDirty: false,
      });
    }
  }, [search.item_id, search.tab, setActiveTabState, itemQuery.isFetched, itemQuery.data]);

  // URL-driven initialization for unit_id
  const unitInitRef = useRef(false);
  const prevUnitIdRef = useRef(search.unit_id);

  useEffect(() => {
    if (search.unit_id !== prevUnitIdRef.current) {
      prevUnitIdRef.current = search.unit_id;
      if (skipEntityResetRef.current) {
        skipEntityResetRef.current = false;
        return;
      }
      unitInitRef.current = false;
      setEntityWorkspace(createIdleWorkspace());
    }
  }, [search.unit_id]);

  const unitQuery = useQuery({
    queryKey: ["scenarioBuilder", "units", "get", search.unit_id],
    queryFn: () =>
      trpc.scenarioBuilder.units.get.query({
        id: getRequiredSearchId(search.unit_id, "unit_id"),
      }),
    enabled: !!search.unit_id && !unitInitRef.current,
    retry: false,
  });

  useEffect(() => {
    const unitId = search.unit_id;
    if (!unitId || unitInitRef.current) return;
    if (!unitQuery.isFetched) return;

    unitInitRef.current = true;

    if (unitQuery.data) {
      const entityData = unitQuery.data as { name: string; [key: string]: unknown };
      if (!search.tab) {
        setActiveTabState("Units");
      }
      setEntityWorkspace({
        mode: "edit",
        entityType: "unit",
        entityId: unitId,
        data: entityData,
        formValues: unitRecordToFormValues(entityData),
        isDirty: false,
      });
      setPerTabSelection((prev) => ({ ...prev, Units: unitId }));
    } else {
      setEntityWorkspace({
        mode: "not-found",
        entityType: "unit",
        entityId: unitId,
        data: null,
        formValues: {},
        isDirty: false,
      });
    }
  }, [search.unit_id, search.tab, setActiveTabState, unitQuery.isFetched, unitQuery.data]);

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
    queryFn: () =>
      trpc.scenarioBuilder.scenarios.get.query({
        id: getRequiredSearchId(search.scenario_id, "scenario_id"),
      }),
    enabled: !!search.scenario_id && !scenarioInitRef.current,
    retry: false,
  });

  useEffect(() => {
    const scenarioId = search.scenario_id;
    if (!scenarioId || scenarioInitRef.current) return;
    if (!scenarioQuery.isFetched) return;

    scenarioInitRef.current = true;

    if (scenarioQuery.data) {
      const scenarioData = scenarioQuery.data as { name: string; [key: string]: unknown };
      setScenarioWorkspace({
        mode: "edit",
        entityType: "scenario",
        entityId: scenarioId,
        data: scenarioData,
        formValues: scenarioRecordToFormValues(scenarioData),
        isDirty: false,
      });
      setPerTabSelection((prev) => ({ ...prev, Scenarios: scenarioId }));
    } else {
      setScenarioWorkspace({
        mode: "not-found",
        entityType: "scenario",
        entityId: scenarioId,
        data: null,
        formValues: {},
        isDirty: false,
      });
    }
  }, [search.scenario_id, scenarioQuery.isFetched, scenarioQuery.data]);

  const pendingEntityIdRef = useRef<string | null>(null);
  const pendingScenarioIdRef = useRef<string | null>(null);

  const loadEntity = useCallback(
    async (tab: TabName, id: string) => {
      if (!isEntityTab(tab)) return;
      const requestedEntityType = TAB_TO_ENTITY_TYPE[tab];
      const routerKey = TAB_TO_ROUTER_KEY[tab];
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
        const data = await trpc.scenarioBuilder[routerKey].get.query({ id });
        if (pendingEntityIdRef.current !== id) return;
        const entityData = data as { name: string; [key: string]: unknown };
        setEntityWorkspace({
          mode: "edit",
          entityType: requestedEntityType,
          entityId: id,
          data: entityData,
          formValues:
            requestedEntityType === "effect"
              ? effectRecordToFormValues(entityData)
              : requestedEntityType === "spell"
                ? spellRecordToFormValues(entityData)
                : requestedEntityType === "item"
                  ? itemRecordToFormValues(entityData)
                  : requestedEntityType === "unit"
                    ? unitRecordToFormValues(entityData)
                    : { name: entityData.name },
          isDirty: false,
        });
        setPerTabSelection((prev) => ({ ...prev, [tab]: id }));
        const urlParam =
          tab === "Effects"
            ? "effect_id"
            : tab === "Spells"
              ? "spell_id"
              : tab === "Items"
                ? "item_id"
                : tab === "Units"
                  ? "unit_id"
                  : "entity_id";

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
    [navigate],
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
        const data = await trpc.scenarioBuilder.scenarios.get.query({ id });
        if (pendingScenarioIdRef.current !== id) return;
        const scenarioData = data as { name: string; [key: string]: unknown };
        setScenarioWorkspace({
          mode: "edit",
          entityType: "scenario",
          entityId: id,
          data: scenarioData,
          formValues: scenarioRecordToFormValues(scenarioData),
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
    [navigate],
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
            formValues: createDefaultScenarioFormValues(),
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
          setEntityWorkspace({
            mode: "create",
            entityType,
            entityId: null,
            data: null,
            formValues:
              entityType === "effect"
                ? createDefaultEffectFormValues()
                : entityType === "spell"
                  ? createDefaultSpellFormValues()
                  : entityType === "item"
                    ? createDefaultItemFormValues()
                    : entityType === "unit"
                      ? createDefaultUnitFormValues()
                      : { name: "" },
            isDirty: false,
          });
          setPerTabSelection((prev) => ({ ...prev, [action.tab]: null }));
          skipEntityResetRef.current = true;
          const paramToRemove =
            action.tab === "Effects"
              ? "effect_id"
              : action.tab === "Spells"
                ? "spell_id"
                : action.tab === "Items"
                  ? "item_id"
                  : action.tab === "Units"
                    ? "unit_id"
                    : "entity_id";
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
