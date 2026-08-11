import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const _mockListQueries: Record<string, ReturnType<typeof vi.fn>> = {};
const _mockGetQueries: Record<string, ReturnType<typeof vi.fn>> = {};

const {
  mockEffectsList,
  mockItemsList,
  mockUnitsList,
  mockScenariosList,
  mockEffectsGet,
  mockItemsGet,
  mockUnitsGet,
  mockScenariosGet,
  mockScenariosDelete,
  mockEffectsCreate,
  mockEffectsUpdate,
  mockEffectsDelete,
  mockItemsCreate,
  mockItemsUpdate,
  mockItemsDelete,
  mockUnitsCreate,
  mockUnitsUpdate,
  mockUnitsDelete,
  mockScenariosCreate,
  mockScenariosUpdate,
} = vi.hoisted(() => {
  const mockEffectsList = vi.fn().mockResolvedValue({ items: [] });
  const mockItemsList = vi.fn().mockResolvedValue({ items: [] });
  const mockUnitsList = vi.fn().mockResolvedValue({ items: [] });
  const mockScenariosList = vi.fn().mockResolvedValue({ items: [] });
  const mockEffectsGet = vi.fn().mockRejectedValue(new Error("not found"));
  const mockEffectsCreate = vi.fn().mockResolvedValue({
    id: "e-new",
    name: "New Effect",
    timingType: "instant",
    effectType: "buff",
  });
  const mockEffectsUpdate = vi.fn().mockResolvedValue({
    id: "e1",
    name: "Updated Effect",
    timingType: "instant",
    effectType: "buff",
  });
  const mockEffectsDelete = vi.fn().mockResolvedValue({ success: true });
  const mockItemsCreate = vi.fn().mockResolvedValue({
    id: "i-new",
    name: "New Item",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    dodge: 0,
    criticalChance: 0,
    activationManaCost: 0,
    activationHealthCost: 0,
    effectIds: ["eff-1"],
  });
  const mockItemsUpdate = vi.fn().mockResolvedValue({
    id: "i1",
    name: "Updated Item",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    dodge: 0,
    criticalChance: 0,
    activationManaCost: 0,
    activationHealthCost: 0,
    effectIds: ["eff-1"],
  });
  const mockItemsDelete = vi.fn().mockResolvedValue({ success: true });
  const mockItemsGet = vi.fn().mockRejectedValue(new Error("not found"));
  const mockUnitsCreate = vi.fn().mockResolvedValue({
    id: "u-new",
    name: "New Unit",
    meleeDmg: 0,
    health: 0,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    speed: 0,
    dodge: 0,
    criticalChance: 0,
    itemIds: ["it-1"],
  });
  const mockUnitsUpdate = vi.fn().mockResolvedValue({
    id: "u1",
    name: "Updated Unit",
    meleeDmg: 0,
    health: 120,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    speed: 0,
    dodge: 0,
    criticalChance: 0,
    itemIds: ["it-1"],
  });
  const mockUnitsGet = vi.fn().mockRejectedValue(new Error("not found"));
  const mockUnitsDelete = vi.fn().mockResolvedValue({ success: true });
  const mockScenariosCreate = vi.fn().mockResolvedValue({
    id: "sc-new",
    name: "New Scenario",
    rows: [
      { id: "r1", rowType: "melee", assignments: [] },
      { id: "r2", rowType: "ranged", assignments: [] },
      { id: "r3", rowType: "support", assignments: [] },
      { id: "r4", rowType: "tank", assignments: [] },
    ],
  });
  const mockScenariosUpdate = vi.fn().mockResolvedValue({
    id: "sc1",
    name: "Updated Scenario",
    rows: [
      { id: "r1", rowType: "melee", assignments: [] },
      { id: "r2", rowType: "ranged", assignments: [] },
      { id: "r3", rowType: "support", assignments: [] },
      { id: "r4", rowType: "tank", assignments: [] },
    ],
  });
  const mockScenariosGet = vi.fn().mockRejectedValue(new Error("not found"));
  const mockScenariosDelete = vi.fn().mockResolvedValue({ success: true });
  return {
    mockEffectsList,
    mockItemsList,
    mockUnitsList,
    mockScenariosList,
    mockEffectsGet,
    mockItemsGet,
    mockUnitsGet,
    mockScenariosGet,
    mockScenariosDelete,
    mockEffectsCreate,
    mockEffectsUpdate,
    mockEffectsDelete,
    mockItemsCreate,
    mockItemsUpdate,
    mockItemsDelete,
    mockUnitsCreate,
    mockUnitsUpdate,
    mockUnitsDelete,
    mockScenariosCreate,
    mockScenariosUpdate,
  };
});

vi.mock("~/lib/trpc", () => ({
  trpc: {
    scenarioBuilder: {
      effects: {
        list: { query: mockEffectsList },
        get: { query: mockEffectsGet },
        create: { mutate: mockEffectsCreate },
        update: { mutate: mockEffectsUpdate },
        delete: { mutate: mockEffectsDelete },
      },
      items: {
        list: { query: mockItemsList },
        get: { query: mockItemsGet },
        create: { mutate: mockItemsCreate },
        update: { mutate: mockItemsUpdate },
        delete: { mutate: mockItemsDelete },
      },
      units: {
        list: { query: mockUnitsList },
        get: { query: mockUnitsGet },
        create: { mutate: mockUnitsCreate },
        update: { mutate: mockUnitsUpdate },
        delete: { mutate: mockUnitsDelete },
      },
      scenarios: {
        list: { query: mockScenariosList },
        get: { query: mockScenariosGet },
        create: { mutate: mockScenariosCreate },
        update: { mutate: mockScenariosUpdate },
        delete: { mutate: mockScenariosDelete },
      },
    },
  },
}));

import { useCreatePageState } from "~/components/create/use-create-page-state";

function createWrapper() {
  return createWrapperWithClient().wrapper;
}

function createWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return {
    queryClient,
    wrapper({ children }: { children: React.ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    },
  };
}

function resetMocks() {
  vi.clearAllMocks();
  mockEffectsList.mockResolvedValue({ items: [], totalCount: 0 });
  mockItemsList.mockResolvedValue({ items: [], totalCount: 0 });
  mockUnitsList.mockResolvedValue({ items: [] });
  mockScenariosList.mockResolvedValue({ items: [], totalCount: 0 });
  mockEffectsGet.mockRejectedValue(new Error("not found"));
  mockEffectsCreate.mockResolvedValue({
    id: "e-new",
    name: "New Effect",
    timingType: "instant",
    effectType: "buff",
  });
  mockEffectsUpdate.mockResolvedValue({
    id: "e1",
    name: "Updated Effect",
    timingType: "instant",
    effectType: "buff",
  });
  mockEffectsDelete.mockResolvedValue({ success: true });
  mockItemsCreate.mockResolvedValue({
    id: "i-new",
    name: "New Item",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    dodge: 0,
    criticalChance: 0,
    activationManaCost: 0,
    activationHealthCost: 0,
    effectIds: ["eff-1"],
  });
  mockItemsUpdate.mockResolvedValue({
    id: "i1",
    name: "Updated Item",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    dodge: 0,
    criticalChance: 0,
    activationManaCost: 0,
    activationHealthCost: 0,
    effectIds: ["eff-1"],
  });
  mockItemsDelete.mockResolvedValue({ success: true });
  mockItemsGet.mockRejectedValue(new Error("not found"));
  mockUnitsCreate.mockResolvedValue({
    id: "u-new",
    name: "New Unit",
    meleeDmg: 0,
    health: 0,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    speed: 0,
    dodge: 0,
    criticalChance: 0,
    itemIds: ["it-1"],
  });
  mockUnitsUpdate.mockResolvedValue({
    id: "u1",
    name: "Updated Unit",
    meleeDmg: 0,
    health: 120,
    rangedDmg: 0,
    manaRegen: 0,
    spellDmg: 0,
    speed: 0,
    dodge: 0,
    criticalChance: 0,
    itemIds: ["it-1"],
  });
  mockUnitsGet.mockRejectedValue(new Error("not found"));
  mockUnitsDelete.mockResolvedValue({ success: true });
  mockScenariosCreate.mockResolvedValue({
    id: "sc-new",
    name: "New Scenario",
    rows: [
      { id: "r1", rowType: "melee", assignments: [] },
      { id: "r2", rowType: "ranged", assignments: [] },
      { id: "r3", rowType: "support", assignments: [] },
      { id: "r4", rowType: "tank", assignments: [] },
    ],
  });
  mockScenariosUpdate.mockResolvedValue({
    id: "sc1",
    name: "Updated Scenario",
    rows: [
      { id: "r1", rowType: "melee", assignments: [] },
      { id: "r2", rowType: "ranged", assignments: [] },
      { id: "r3", rowType: "support", assignments: [] },
      { id: "r4", rowType: "tank", assignments: [] },
    ],
  });
  mockScenariosGet.mockRejectedValue(new Error("not found"));
  mockScenariosDelete.mockResolvedValue({ success: true });
}

describe("useCreatePageState — isDirty (full form surface)", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("scenario isDirty is true when any form field differs from original", async () => {
    mockScenariosGet.mockResolvedValueOnce({
      id: "sc1",
      name: "Ambush",
      rows: [
        { id: "r1", rowType: "melee", assignments: [] },
        { id: "r2", rowType: "ranged", assignments: [] },
        { id: "r3", rowType: "support", assignments: [] },
        { id: "r4", rowType: "tank", assignments: [] },
      ],
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Scenarios", "sc1");
    });

    act(() => {
      result.current.updateScenarioField("name", "Ambush Updated");
    });

    expect(result.current.scenarioWorkspace.isDirty).toBe(true);
  });

  it("effect isDirty is true when a non-name field differs from original", async () => {
    mockEffectsGet.mockResolvedValueOnce({
      id: "e1",
      name: "Rage",
      timingType: "interval",
      effectType: "buff",
      triggerEveryActions: 2,
      triggerCount: 2,
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Effects" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Effects", "e1");
    });

    act(() => {
      result.current.updateEntityField("triggerCount", 3);
    });

    expect(result.current.entityWorkspace.isDirty).toBe(true);
  });
});

describe("useCreatePageState — lazy loading", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("on cold load with Scenarios tab, only scenarios list query fires initially", async () => {
    // Use a never-resolving promise for scenarios to check call counts before settling
    let resolveScenarios!: (v: { items: never[] }) => void;
    mockScenariosList.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveScenarios = resolve;
        }),
    );

    renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    // Scenarios list should have been called (active tab)
    expect(mockScenariosList).toHaveBeenCalled();
    // Other tabs should NOT have been called yet
    expect(mockEffectsList).not.toHaveBeenCalled();
    expect(mockItemsList).not.toHaveBeenCalled();
    expect(mockUnitsList).not.toHaveBeenCalled();

    // Resolve the active tab query
    await act(async () => {
      resolveScenarios({ items: [] });
    });
  });

  it("after the active tab settles, remaining tab queries fire", async () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    // Wait for queries to settle
    await waitFor(() => {
      expect(result.current.listLoading.Scenarios).toBe(false);
    });

    // Now the background queries should have fired
    await waitFor(() => {
      expect(mockEffectsList).toHaveBeenCalled();
      expect(mockItemsList).toHaveBeenCalled();
      expect(mockUnitsList).toHaveBeenCalled();
    });
  });

  it("loads linked item placement rows for scenario unit options", async () => {
    mockUnitsList.mockResolvedValue({
      items: [{ id: "u-ranger", name: "Ranger" }],
      totalCount: 1,
    });
    mockUnitsGet.mockResolvedValue({
      id: "u-ranger",
      name: "Ranger",
      itemIds: ["it-bow", "it-boots"],
    });
    mockItemsGet.mockImplementation(({ id }: { id: string }) =>
      Promise.resolve({
        id,
        allowedRowTypes: id === "it-bow" ? ["ranged"] : ["ranged", "support"],
      }),
    );

    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.createNew("Scenarios");
    });

    await waitFor(() => {
      expect(result.current.scenarioUnitOptions).toEqual([
        {
          id: "u-ranger",
          name: "Ranger",
          itemAllowedRowTypes: [["ranged"], ["ranged", "support"]],
        },
      ]);
    });
  });
});

describe("useCreatePageState — listFetching field", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("exposes listFetching with boolean values for all four tabs", async () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    const { listFetching } = result.current;
    expect(listFetching).toBeDefined();
    const tabs = ["Effects", "Items", "Units", "Scenarios"] as const;
    for (const tab of tabs) {
      expect(tab in listFetching).toBe(true);
      expect(typeof listFetching[tab]).toBe("boolean");
    }
  });
});

describe("useCreatePageState — loading state", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("entity workspace enters loading mode while fetching", async () => {
    let resolveGet!: (v: Record<string, unknown>) => void;
    mockItemsGet.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGet = resolve;
        }),
    );

    const { result } = renderHook(() => useCreatePageState({ tab: "Items" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.selectRecord("Items", "i1");
    });

    // Workspace should be in loading mode while the request is in flight
    expect(result.current.entityWorkspace.mode).toBe("loading");

    // Resolve and verify it transitions to edit
    await act(async () => {
      resolveGet({ id: "i1", name: "Oak Staff", effectIds: [] });
    });

    expect(result.current.entityWorkspace.mode).toBe("edit");
  });

  it("scenario workspace enters loading mode while fetching", async () => {
    let resolveGet!: (v: Record<string, unknown>) => void;
    mockScenariosGet.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGet = resolve;
        }),
    );

    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.selectRecord("Scenarios", "sc1");
    });

    expect(result.current.scenarioWorkspace.mode).toBe("loading");

    await act(async () => {
      resolveGet({ id: "sc1", name: "Ambush", difficulty: "hard" });
    });

    expect(result.current.scenarioWorkspace.mode).toBe("edit");
  });
});

describe("useCreatePageState — race condition protection", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("keeps the previous entity type and form while a cross-type record load is in flight", async () => {
    let resolveItem!: (value: Record<string, unknown>) => void;

    mockEffectsGet.mockResolvedValueOnce({
      id: "e1",
      name: "Barbarian Roar",
      timingType: "instant",
      effectType: "buff",
      triggerEveryActions: null,
      triggerCount: null,
    });
    mockItemsGet.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveItem = resolve;
        }),
    );

    const { result } = renderHook(() => useCreatePageState({ tab: "Effects" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Effects", "e1");
    });

    act(() => {
      result.current.selectRecord("Items", "i1");
    });

    expect(result.current.entityWorkspace.mode).toBe("loading");
    expect(result.current.entityWorkspace.entityType).toBe("effect");
    expect(result.current.entityWorkspace.entityId).toBe("i1");
    expect(result.current.entityWorkspace.data).toEqual({
      id: "e1",
      name: "Barbarian Roar",
      timingType: "instant",
      effectType: "buff",
      triggerEveryActions: null,
      triggerCount: null,
    });
    expect(result.current.entityWorkspace.formValues).toMatchObject({
      name: "Barbarian Roar",
      timingType: "instant",
      effectType: "buff",
    });

    await act(async () => {
      resolveItem({ id: "i1", name: "Oak Staff", effectIds: ["eff-1"] });
    });

    expect(result.current.entityWorkspace.mode).toBe("edit");
    expect(result.current.entityWorkspace.entityType).toBe("item");
    expect(result.current.entityWorkspace.formValues).toMatchObject({
      name: "Oak Staff",
      effectIds: ["eff-1"],
    });
  });

  it("discards stale entity response when a newer selection is made", async () => {
    let resolveFirst!: (v: Record<string, unknown>) => void;
    let resolveSecond!: (v: Record<string, unknown>) => void;

    mockItemsGet
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const { result } = renderHook(() => useCreatePageState({ tab: "Items" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    // Select record A
    act(() => {
      result.current.selectRecord("Items", "i1");
    });

    // Immediately select record B (before A resolves)
    act(() => {
      result.current.selectRecord("Items", "i2");
    });

    // B resolves first
    await act(async () => {
      resolveSecond({ id: "i2", name: "Iron Sword", effectIds: [] });
    });

    expect(result.current.entityWorkspace.entityId).toBe("i2");

    // A resolves late — should be discarded
    await act(async () => {
      resolveFirst({ id: "i1", name: "Oak Staff", effectIds: [] });
    });

    // Workspace should still show B, not A
    expect(result.current.entityWorkspace.entityId).toBe("i2");
    expect((result.current.entityWorkspace.formValues as Record<string, unknown>).name).toBe(
      "Iron Sword",
    );
  });

  it("discards stale scenario response when a newer selection is made", async () => {
    let resolveFirst!: (v: Record<string, unknown>) => void;
    let resolveSecond!: (v: Record<string, unknown>) => void;

    mockScenariosGet
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          }),
      );

    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    // Select scenario A
    act(() => {
      result.current.selectRecord("Scenarios", "sc1");
    });

    // Immediately select scenario B
    act(() => {
      result.current.selectRecord("Scenarios", "sc2");
    });

    // B resolves first
    await act(async () => {
      resolveSecond({ id: "sc2", name: "Siege", difficulty: "easy" });
    });

    expect(result.current.scenarioWorkspace.entityId).toBe("sc2");

    // A resolves late — should be discarded
    await act(async () => {
      resolveFirst({ id: "sc1", name: "Ambush", difficulty: "hard" });
    });

    expect(result.current.scenarioWorkspace.entityId).toBe("sc2");
    expect((result.current.scenarioWorkspace.formValues as Record<string, unknown>).name).toBe(
      "Siege",
    );
  });
});

describe("useCreatePageState — URL param change resets", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("detects and loads an item from a generic entity_id", async () => {
    mockItemsGet.mockResolvedValue({
      id: "i1",
      name: "Iron Sword",
      effectIds: [],
    });

    const { result } = renderHook(() => useCreatePageState({ entity_id: "i1" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.activeTab).toBe("Items");
      expect(result.current.entityWorkspace).toMatchObject({
        mode: "edit",
        entityType: "item",
        entityId: "i1",
      });
      expect(result.current.perTabSelection.Items).toBe("i1");
    });
  });

  it("detects and loads a unit from a generic entity_id", async () => {
    mockUnitsGet.mockResolvedValue({
      id: "u1",
      name: "Mage",
      itemIds: [],
    });

    const { result } = renderHook(() => useCreatePageState({ entity_id: "u1" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.activeTab).toBe("Units");
      expect(result.current.entityWorkspace).toMatchObject({
        mode: "edit",
        entityType: "unit",
        entityId: "u1",
      });
      expect(result.current.perTabSelection.Units).toBe("u1");
    });
  });

  it("keeps a newer generic entity_id selection when older detectors resolve late", async () => {
    let resolveOlderEffect!: (value: Record<string, unknown>) => void;
    let resolveOlderItem!: (value: Record<string, unknown>) => void;
    let resolveOlderUnit!: (value: Record<string, unknown>) => void;

    mockEffectsGet.mockImplementation(({ id }: { id: string }) => {
      if (id === "older") {
        return new Promise((resolve) => {
          resolveOlderEffect = resolve;
        });
      }
      return Promise.reject(new Error("not found"));
    });
    mockItemsGet.mockImplementation(({ id }: { id: string }) => {
      if (id === "older") {
        return new Promise((resolve) => {
          resolveOlderItem = resolve;
        });
      }
      return Promise.resolve({ id: "newer", name: "Iron Sword", effectIds: [] });
    });
    mockUnitsGet.mockImplementation(({ id }: { id: string }) => {
      if (id === "older") {
        return new Promise((resolve) => {
          resolveOlderUnit = resolve;
        });
      }
      return Promise.reject(new Error("not found"));
    });

    const { result, rerender } = renderHook(
      (props: { search: { entity_id?: string } }) => useCreatePageState(props.search, vi.fn()),
      { wrapper: createWrapper(), initialProps: { search: { entity_id: "older" } } },
    );

    await waitFor(() => {
      expect(mockEffectsGet).toHaveBeenCalledWith({ id: "older" });
      expect(mockItemsGet).toHaveBeenCalledWith({ id: "older" });
      expect(mockUnitsGet).toHaveBeenCalledWith({ id: "older" });
    });

    rerender({ search: { entity_id: "newer" } });

    await waitFor(() => {
      expect(result.current.entityWorkspace).toMatchObject({
        mode: "edit",
        entityType: "item",
        entityId: "newer",
      });
    });

    await act(async () => {
      resolveOlderEffect({ id: "older", name: "Old Effect" });
      resolveOlderItem({ id: "older", name: "Old Item", effectIds: [] });
      resolveOlderUnit({ id: "older", name: "Old Unit", itemIds: [] });
    });

    expect(result.current.activeTab).toBe("Items");
    expect(result.current.entityWorkspace).toMatchObject({
      mode: "edit",
      entityType: "item",
      entityId: "newer",
    });
    expect(result.current.perTabSelection.Items).toBe("newer");
  });

  it("does not reset or refetch entity workspace when internal selection syncs the URL", async () => {
    mockItemsGet
      .mockResolvedValueOnce({ id: "i1", name: "Oak Staff", effectIds: [] })
      .mockResolvedValueOnce({ id: "i2", name: "Iron Sword", effectIds: [] });

    let currentSearch: { tab?: string; item_id?: string } = { tab: "Items", item_id: "i1" };
    let rerenderHook!: (props: { search: { tab?: string; item_id?: string } }) => void;
    const navigate = vi.fn(
      ({ search }: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => {
        currentSearch = search(currentSearch) as typeof currentSearch;
        rerenderHook({ search: currentSearch });
      },
    );

    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; item_id?: string } }) =>
        useCreatePageState(props.search, navigate),
      { wrapper: createWrapper(), initialProps: { search: currentSearch } },
    );
    rerenderHook = rerender;

    await waitFor(() => {
      expect(result.current.entityWorkspace.mode).toBe("edit");
      expect(result.current.entityWorkspace.entityId).toBe("i1");
    });

    act(() => {
      result.current.selectRecord("Items", "i2");
    });

    expect(result.current.entityWorkspace.mode).toBe("loading");
    expect(result.current.entityWorkspace.data).toEqual({
      id: "i1",
      name: "Oak Staff",
      effectIds: [],
    });

    await waitFor(() => {
      expect(result.current.entityWorkspace.mode).toBe("edit");
      expect(result.current.entityWorkspace.entityId).toBe("i2");
      expect(result.current.entityWorkspace.data).toEqual({
        id: "i2",
        name: "Iron Sword",
        effectIds: [],
      });
    });

    expect(mockItemsGet).toHaveBeenCalledTimes(2);
  });

  it("reloads entity when entity_id URL param changes", async () => {
    mockEffectsGet
      .mockResolvedValueOnce({
        id: "e1",
        name: "Burn",
        timingType: "instant",
        effectType: "damage",
      })
      .mockResolvedValueOnce({
        id: "e2",
        name: "Freeze",
        timingType: "instant",
        effectType: "debuff",
      });

    const search: { tab?: string; entity_id?: string; scenario_id?: string } = {
      tab: "Effects",
      entity_id: "e1",
    };
    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; entity_id?: string; scenario_id?: string } }) =>
        useCreatePageState(props.search, vi.fn()),
      { wrapper: createWrapper(), initialProps: { search } },
    );

    // Wait for entity A to load
    await waitFor(() => {
      expect(result.current.entityWorkspace.mode).toBe("edit");
      expect(result.current.entityWorkspace.entityId).toBe("e1");
    });

    // Navigate to a different entity_id
    rerender({ search: { tab: "Effects", entity_id: "e2" } });

    // Entity B should load
    await waitFor(() => {
      expect(result.current.entityWorkspace.entityId).toBe("e2");
      expect(result.current.entityWorkspace.mode).toBe("edit");
    });
  });

  it("resets entity workspace to idle when entity_id is removed", async () => {
    mockEffectsGet.mockResolvedValueOnce({
      id: "e1",
      name: "Burn",
      timingType: "instant",
      effectType: "damage",
    });

    const search = { tab: "Effects" as const, entity_id: "e1" };
    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; entity_id?: string; scenario_id?: string } }) =>
        useCreatePageState(props.search, vi.fn()),
      { wrapper: createWrapper(), initialProps: { search } },
    );

    await waitFor(() => {
      expect(result.current.entityWorkspace.mode).toBe("edit");
    });

    // Remove entity_id from URL
    rerender({ search: { tab: "Effects" } as typeof search });

    await waitFor(() => {
      expect(result.current.entityWorkspace.mode).toBe("idle");
      expect(result.current.entityWorkspace.entityId).toBeNull();
    });
  });

  it("reloads scenario when scenario_id URL param changes", async () => {
    mockScenariosGet
      .mockResolvedValueOnce({ id: "sc1", name: "Ambush", difficulty: "hard" })
      .mockResolvedValueOnce({ id: "sc2", name: "Siege", difficulty: "easy" });

    const search: { tab?: string; entity_id?: string; scenario_id?: string } = {
      tab: "Scenarios",
      scenario_id: "sc1",
    };
    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; entity_id?: string; scenario_id?: string } }) =>
        useCreatePageState(props.search, vi.fn()),
      { wrapper: createWrapper(), initialProps: { search } },
    );

    await waitFor(() => {
      expect(result.current.scenarioWorkspace.mode).toBe("edit");
      expect(result.current.scenarioWorkspace.entityId).toBe("sc1");
    });

    // Navigate to different scenario_id
    rerender({ search: { tab: "Scenarios", scenario_id: "sc2" } });

    await waitFor(() => {
      expect(result.current.scenarioWorkspace.entityId).toBe("sc2");
      expect(result.current.scenarioWorkspace.mode).toBe("edit");
    });
  });

  it("stores scenario selection when scenario_id loads while another tab is active", async () => {
    mockScenariosGet.mockResolvedValueOnce({
      id: "sc1",
      name: "Ambush",
      difficulty: "hard",
    });

    const search: { tab?: string; scenario_id?: string } = {
      tab: "Effects",
      scenario_id: "sc1",
    };
    const { result } = renderHook(
      (props: { search: { tab?: string; scenario_id?: string } }) =>
        useCreatePageState(props.search, vi.fn()),
      { wrapper: createWrapper(), initialProps: { search } },
    );

    expect(result.current.activeTab).toBe("Effects");

    await waitFor(() => {
      expect(result.current.scenarioWorkspace.mode).toBe("edit");
      expect(result.current.scenarioWorkspace.entityId).toBe("sc1");
      expect(result.current.perTabSelection.Scenarios).toBe("sc1");
      expect(result.current.perTabSelection.Effects).toBeNull();
    });
  });

  it("stores per-tab selections for mixed entity and scenario URL params", async () => {
    mockItemsGet.mockResolvedValueOnce({
      id: "i1",
      name: "Iron Sword",
      power: 10,
    });
    mockScenariosGet.mockResolvedValueOnce({
      id: "sc1",
      name: "Ambush",
      difficulty: "hard",
    });

    const search: { tab?: string; item_id?: string; scenario_id?: string } = {
      tab: "Items",
      item_id: "i1",
      scenario_id: "sc1",
    };
    const { result } = renderHook(
      (props: { search: { tab?: string; item_id?: string; scenario_id?: string } }) =>
        useCreatePageState(props.search, vi.fn()),
      { wrapper: createWrapper(), initialProps: { search } },
    );

    await waitFor(() => {
      expect(result.current.entityWorkspace.mode).toBe("edit");
      expect(result.current.entityWorkspace.entityId).toBe("i1");
      expect(result.current.scenarioWorkspace.mode).toBe("edit");
      expect(result.current.scenarioWorkspace.entityId).toBe("sc1");
      expect(result.current.perTabSelection.Items).toBe("i1");
      expect(result.current.perTabSelection.Scenarios).toBe("sc1");
    });
  });

  it("resets scenario workspace to idle when scenario_id is removed", async () => {
    mockScenariosGet.mockResolvedValueOnce({ id: "sc1", name: "Ambush", difficulty: "hard" });

    const search: { tab?: string; entity_id?: string; scenario_id?: string } = {
      tab: "Scenarios",
      scenario_id: "sc1",
    };
    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; entity_id?: string; scenario_id?: string } }) =>
        useCreatePageState(props.search, vi.fn()),
      { wrapper: createWrapper(), initialProps: { search } },
    );

    await waitFor(() => {
      expect(result.current.scenarioWorkspace.mode).toBe("edit");
    });

    // Remove scenario_id from URL
    rerender({ search: { tab: "Scenarios" } as typeof search });

    await waitFor(() => {
      expect(result.current.scenarioWorkspace.mode).toBe("idle");
      expect(result.current.scenarioWorkspace.entityId).toBeNull();
    });
  });

  it("does not reset or refetch scenario workspace when internal selection syncs the URL", async () => {
    mockScenariosGet
      .mockResolvedValueOnce({ id: "sc1", name: "Ambush", difficulty: "hard" })
      .mockResolvedValueOnce({ id: "sc2", name: "Siege", difficulty: "easy" });

    let currentSearch: { tab?: string; scenario_id?: string } = {
      tab: "Scenarios",
      scenario_id: "sc1",
    };
    let rerenderHook!: (props: { search: { tab?: string; scenario_id?: string } }) => void;
    const navigate = vi.fn(
      ({ search }: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => {
        currentSearch = search(currentSearch) as typeof currentSearch;
        rerenderHook({ search: currentSearch });
      },
    );

    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; scenario_id?: string } }) =>
        useCreatePageState(props.search, navigate),
      { wrapper: createWrapper(), initialProps: { search: currentSearch } },
    );
    rerenderHook = rerender;

    await waitFor(() => {
      expect(result.current.scenarioWorkspace.mode).toBe("edit");
      expect(result.current.scenarioWorkspace.entityId).toBe("sc1");
    });

    act(() => {
      result.current.selectRecord("Scenarios", "sc2");
    });

    expect(result.current.scenarioWorkspace.mode).toBe("loading");
    expect(result.current.scenarioWorkspace.data).toEqual({
      id: "sc1",
      name: "Ambush",
      difficulty: "hard",
    });

    await waitFor(() => {
      expect(result.current.scenarioWorkspace.mode).toBe("edit");
      expect(result.current.scenarioWorkspace.entityId).toBe("sc2");
      expect(result.current.scenarioWorkspace.data).toEqual({
        id: "sc2",
        name: "Siege",
        difficulty: "easy",
      });
    });

    expect(mockScenariosGet).toHaveBeenCalledTimes(2);
  });
});

describe("useCreatePageState — linked entity navigation", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("replaces a dirty unit with its linked item only after discard and switches the tab URL", async () => {
    mockUnitsGet.mockResolvedValueOnce({
      id: "u1",
      name: "Barbarian",
      meleeDmg: 0,
      health: 100,
      mana: 100,
      rangedDmg: 0,
      manaRegen: 0,
      spellDmg: 0,
      speed: 0,
      dodge: 0,
      criticalChance: 0,
      itemIds: ["i1"],
    });
    mockItemsGet.mockResolvedValueOnce({
      id: "i1",
      name: "Iron Sword",
      meleeDmg: 10,
      rangedDmg: 0,
      mana: 0,
      manaRegen: 0,
      spellDmg: 0,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      effectIds: [],
    });

    let currentSearch: Record<string, unknown> = {
      tab: "Units",
      scenario_id: "sc1",
    };
    let rerenderHook!: (props: { search: Record<string, unknown> }) => void;
    const navigate = vi.fn(
      ({ search }: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => {
        currentSearch = search(currentSearch);
        rerenderHook({ search: currentSearch });
      },
    );
    const { result, rerender } = renderHook(
      (props: { search: Record<string, unknown> }) => useCreatePageState(props.search, navigate),
      { wrapper: createWrapper(), initialProps: { search: currentSearch } },
    );
    rerenderHook = rerender;

    await act(async () => {
      result.current.selectRecord("Units", "u1");
    });
    act(() => {
      result.current.updateEntityField("name", "Barbarian Updated");
      result.current.selectRecord("Items", "i1");
    });

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.activeTab).toBe("Units");
    expect(result.current.entityWorkspace.formValues.name).toBe("Barbarian Updated");

    act(() => {
      result.current.cancelDiscard();
    });
    expect(result.current.isDialogOpen).toBe(false);
    expect(result.current.entityWorkspace.formValues.name).toBe("Barbarian Updated");

    act(() => {
      result.current.selectRecord("Items", "i1");
    });
    expect(result.current.isDialogOpen).toBe(true);
    await act(async () => {
      result.current.confirmDiscard();
    });

    await waitFor(() => {
      expect(result.current.activeTab).toBe("Items");
      expect(result.current.entityWorkspace.entityType).toBe("item");
      expect(result.current.entityWorkspace.formValues.name).toBe("Iron Sword");
    });
    expect(currentSearch).toEqual({ tab: "Items", item_id: "i1", scenario_id: "sc1" });
  });
});

describe("useCreatePageState — scenario list features", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("exposes scenario sort and page state with defaults", async () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    expect(result.current.scenarioSortBy).toBe("name");
    expect(result.current.scenarioSortDir).toBe("asc");
    expect(result.current.scenarioPage).toBe(1);
  });

  it("setScenarioSort updates sort and resets page to 1", async () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setScenarioPage(2);
    });
    expect(result.current.scenarioPage).toBe(2);

    act(() => {
      result.current.setScenarioSort("updatedAt", "desc");
    });
    expect(result.current.scenarioSortBy).toBe("updatedAt");
    expect(result.current.scenarioSortDir).toBe("desc");
    expect(result.current.scenarioPage).toBe(1);
  });

  it("setScenarioPage updates page", () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setScenarioPage(3);
    });
    expect(result.current.scenarioPage).toBe(3);
  });

  it("scenarioTotalPages is computed from totalCount", async () => {
    mockScenariosList.mockResolvedValue({
      items: Array.from({ length: 10 }, (_, i) => ({
        id: `s${i}`,
        name: `Scenario ${i}`,
        updatedAt: new Date(),
        createdAt: new Date(),
      })),
      totalCount: 25,
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.scenarioTotalPages).toBe(2);
    });
  });
});

describe("useCreatePageState — library linkage filters", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("changes the shared linkage filter and resets the active tab page to 1", () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Units" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setUnitPage(2);
    });
    expect(result.current.unitPage).toBe(2);

    act(() => {
      result.current.setLinkageFilter({ mode: "unlinked" });
    });

    expect(result.current.linkageFilter).toEqual({ mode: "unlinked" });
    expect(result.current.unitPage).toBe(1);
  });

  it("passes the shared linkage filter to list queries", async () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Units" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setLinkageFilter({
        mode: "scenario",
        scenarioId: "a2000000-0000-4000-8000-000000000001",
      });
    });

    await waitFor(() => {
      expect(mockUnitsList).toHaveBeenCalledWith(
        expect.objectContaining({
          linkageFilter: {
            mode: "scenario",
            scenarioId: "a2000000-0000-4000-8000-000000000001",
          },
        }),
      );
    });
  });

  it("does not clear a loaded workspace when the library filter changes", async () => {
    mockUnitsGet.mockResolvedValueOnce({
      id: "u1",
      name: "Barbarian",
      meleeDmg: 0,
      health: 120,
      rangedDmg: 0,
      mana: 0,
      manaRegen: 0,
      spellDmg: 0,
      speed: 0,
      dodge: 0,
      criticalChance: 0,
      itemIds: [],
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Units" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Units", "u1");
    });

    expect(result.current.entityWorkspace.entityId).toBe("u1");

    act(() => {
      result.current.setLinkageFilter({ mode: "unlinked" });
    });

    expect(result.current.entityWorkspace.entityId).toBe("u1");
    expect(result.current.entityWorkspace.formValues.name).toBe("Barbarian");
  });
});

describe("useCreatePageState — effect save flows", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("create new effect initializes the full default form state", () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Effects" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.createNew("Effects");
    });

    expect(result.current.entityWorkspace.mode).toBe("create");
    expect(result.current.entityWorkspace.formValues).toMatchObject({
      name: "",
      timingType: "instant",
      effectType: "buff",
      triggerEveryActions: null,
      triggerCount: null,
    });
  });

  it("effect load hydrates the full form state", async () => {
    mockEffectsGet.mockResolvedValueOnce({
      id: "e1",
      name: "Rage",
      timingType: "interval",
      effectType: "buff",
      triggerEveryActions: 2,
      triggerCount: 2,
      meleeDmg: 1.5,
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Effects" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Effects", "e1");
    });

    expect(result.current.entityWorkspace.formValues).toMatchObject({
      name: "Rage",
      timingType: "interval",
      effectType: "buff",
      triggerEveryActions: 2,
      triggerCount: 2,
      meleeDmg: 1.5,
    });
  });

  it("successful create switches to edit mode and syncs effect_id", async () => {
    let currentSearch: { tab?: string; effect_id?: string } = { tab: "Effects" };
    let rerenderHook!: (props: { search: { tab?: string; effect_id?: string } }) => void;
    const navigate = vi.fn(
      ({ search }: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => {
        currentSearch = search(currentSearch) as typeof currentSearch;
        rerenderHook({ search: currentSearch });
      },
    );

    mockEffectsCreate.mockResolvedValueOnce({
      id: "e-created",
      name: "Arc Spark",
      timingType: "instant",
      effectType: "damage",
      triggerEveryActions: null,
      triggerCount: null,
    });

    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; effect_id?: string } }) =>
        useCreatePageState(props.search, navigate),
      { wrapper: createWrapper(), initialProps: { search: currentSearch } },
    );
    rerenderHook = rerender;

    act(() => {
      result.current.createNew("Effects");
      result.current.updateEntityField("name", "Arc Spark");
      result.current.updateEntityField("effectType", "damage");
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(mockEffectsCreate).toHaveBeenCalled();
    expect(result.current.entityWorkspace.mode).toBe("edit");
    expect(result.current.entityWorkspace.entityId).toBe("e-created");
    expect(currentSearch.effect_id).toBe("e-created");
  });

  it("saves interval timing with the action-based API fields", async () => {
    mockEffectsCreate.mockResolvedValueOnce({
      id: "e-created",
      name: "Battle Rhythm",
      timingType: "interval",
      effectType: "buff",
      triggerEveryActions: 2,
      triggerCount: 3,
      lastsForActions: null,
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Effects" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.createNew("Effects");
      result.current.updateEntityField("name", "Battle Rhythm");
      result.current.updateEntityField("timingType", "interval");
      result.current.updateEntityField("triggerEveryActions", 2);
      result.current.updateEntityField("triggerCount", 3);
      result.current.updateEntityField("lastsForActions", 4);
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(mockEffectsCreate).toHaveBeenCalledOnce();
    const payload = mockEffectsCreate.mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      name: "Battle Rhythm",
      timingType: "interval",
      triggerEveryActions: 2,
      triggerCount: 3,
      lastsForActions: null,
    });
    expect(payload).not.toHaveProperty("intervalTicks");
    expect(payload).not.toHaveProperty("durationTicks");
  });

  it("clears a stale action duration from an instant direct-effect payload", async () => {
    mockEffectsCreate.mockResolvedValueOnce({
      id: "e-created",
      name: "Arc Spark",
      timingType: "instant",
      effectType: "damage",
      triggerEveryActions: null,
      triggerCount: null,
      lastsForActions: null,
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Effects" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.createNew("Effects");
      result.current.updateEntityField("name", "Arc Spark");
      result.current.updateEntityField("effectType", "damage");
      result.current.updateEntityField("directSpellDmg", 4);
      result.current.updateEntityField("lastsForActions", 4);
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(mockEffectsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Arc Spark",
        effectType: "damage",
        directSpellDmg: 4,
        lastsForActions: null,
      }),
    );
  });

  it("successful update clears dirty state", async () => {
    mockEffectsGet.mockResolvedValueOnce({
      id: "e1",
      name: "Rage",
      timingType: "instant",
      effectType: "buff",
      triggerEveryActions: null,
      triggerCount: null,
    });
    mockEffectsUpdate.mockResolvedValueOnce({
      id: "e1",
      name: "Rage Updated",
      timingType: "instant",
      effectType: "buff",
      triggerEveryActions: null,
      triggerCount: null,
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Effects" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Effects", "e1");
    });

    act(() => {
      result.current.updateEntityField("name", "Rage Updated");
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(mockEffectsUpdate).toHaveBeenCalled();
    expect(result.current.entityWorkspace.isDirty).toBe(false);
  });

  it("save failure keeps form dirty and surfaces error", async () => {
    mockEffectsGet.mockResolvedValueOnce({
      id: "e1",
      name: "Rage",
      timingType: "instant",
      effectType: "buff",
      triggerEveryActions: null,
      triggerCount: null,
    });
    mockEffectsUpdate.mockRejectedValueOnce(new Error("An effect with this name already exists."));

    const { result } = renderHook(() => useCreatePageState({ tab: "Effects" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Effects", "e1");
    });

    act(() => {
      result.current.updateEntityField("name", "Duplicate");
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(result.current.entityWorkspace.isDirty).toBe(true);
    expect(result.current.entitySaveError).toContain("already exists");
  });
});

describe("useCreatePageState — item save flows", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("successful create switches to edit mode and syncs item_id", async () => {
    let currentSearch: { tab?: string; item_id?: string } = { tab: "Items" };
    let rerenderHook!: (props: { search: { tab?: string; item_id?: string } }) => void;
    const navigate = vi.fn(
      ({ search }: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => {
        currentSearch = search(currentSearch) as typeof currentSearch;
        rerenderHook({ search: currentSearch });
      },
    );

    mockItemsCreate.mockResolvedValueOnce({
      id: "i-created",
      name: "Bronze Buckler",
      meleeDmg: 0,
      rangedDmg: 0,
      mana: 0,
      manaRegen: 0,
      spellDmg: 0,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      effectIds: ["sp-1"],
      allowedRowTypes: [],
    });

    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; item_id?: string } }) =>
        useCreatePageState(props.search, navigate),
      { wrapper: createWrapper(), initialProps: { search: currentSearch } },
    );
    rerenderHook = rerender;

    act(() => {
      result.current.createNew("Items");
      result.current.updateEntityField("name", "Bronze Buckler");
      result.current.updateEntityField("meleeDmg", "12.5");
      result.current.updateEntityField("effectIds", ["sp-1"]);
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(mockItemsCreate).toHaveBeenCalledWith({
      name: "Bronze Buckler",
      meleeDmg: 12.5,
      rangedDmg: 0,
      manaRegen: 0,
      mana: 0,
      spellDmg: 0,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      effectIds: ["sp-1"],
      allowedRowTypes: [],
    });
    expect(result.current.entityWorkspace.mode).toBe("edit");
    expect(result.current.entityWorkspace.entityId).toBe("i-created");
    expect(currentSearch.item_id).toBe("i-created");
  });

  it("successful update clears dirty state", async () => {
    mockItemsGet.mockResolvedValueOnce({
      id: "i1",
      name: "Oak Staff",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 3,
      mana: 0,
      spellDmg: 12,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      effectIds: ["sp-1"],
      allowedRowTypes: [],
    });
    mockItemsUpdate.mockResolvedValueOnce({
      id: "i1",
      name: "Oak Staff",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 3,
      mana: 0,
      spellDmg: 20,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      effectIds: ["sp-1"],
      allowedRowTypes: [],
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Items" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Items", "i1");
    });

    act(() => {
      result.current.updateEntityField("spellDmg", "20");
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(mockItemsUpdate).toHaveBeenCalledWith({
      id: "i1",
      name: "Oak Staff",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 3,
      mana: 0,
      spellDmg: 20,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      effectIds: ["sp-1"],
      allowedRowTypes: [],
    });
    expect(result.current.entityWorkspace.isDirty).toBe(false);
  });

  it("saves a new item without linked effects", async () => {
    mockItemsCreate.mockResolvedValueOnce({
      id: "i-effect-less",
      name: "Plain Relic",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 0,
      mana: 0,
      spellDmg: 0,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      effectIds: [],
      allowedRowTypes: [],
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Items" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.createNew("Items");
      result.current.updateEntityField("name", "Plain Relic");
      result.current.updateEntityField("effectIds", []);
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(mockItemsCreate).toHaveBeenCalledWith({
      name: "Plain Relic",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 0,
      mana: 0,
      spellDmg: 0,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      effectIds: [],
      allowedRowTypes: [],
    });
    expect(mockItemsUpdate).not.toHaveBeenCalled();
  });

  it("updates an existing item to remove its final linked effect", async () => {
    mockItemsGet.mockResolvedValueOnce({
      id: "i1",
      name: "Oak Staff",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 3,
      mana: 0,
      spellDmg: 12,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      effectIds: ["sp-1"],
    });
    mockItemsUpdate.mockResolvedValueOnce({
      id: "i1",
      name: "Oak Staff",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 3,
      mana: 0,
      spellDmg: 12,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      effectIds: [],
      allowedRowTypes: [],
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Items" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Items", "i1");
    });

    act(() => {
      result.current.updateEntityField("effectIds", []);
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(mockItemsUpdate).toHaveBeenCalledWith({
      id: "i1",
      name: "Oak Staff",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 3,
      mana: 0,
      spellDmg: 12,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      effectIds: [],
      allowedRowTypes: [],
    });
  });

  it("marks a new item workspace dirty after the user changes create-form values", async () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Items" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.createNew("Items");
      result.current.updateEntityField("name", "Bronze Buckler");
      result.current.updateEntityField("effectIds", ["sp-1"]);
    });

    expect(result.current.entityWorkspace.isDirty).toBe(true);
  });

  it("treats linked effect ids as ordered for dirty checks", async () => {
    mockItemsGet.mockResolvedValueOnce({
      id: "i1",
      name: "Oak Staff",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 3,
      mana: 0,
      spellDmg: 12,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      effectIds: ["sp-1", "sp-2"],
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Items" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Items", "i1");
    });

    act(() => {
      result.current.updateEntityField("effectIds", ["sp-2", "sp-1"]);
    });

    expect(result.current.entityWorkspace.isDirty).toBe(true);
  });

  it("loads effect options across multiple list pages for the item workspace", async () => {
    mockEffectsList.mockImplementation(({ page, limit }: { page: number; limit: number }) => {
      if (page === 1) {
        return Promise.resolve({
          items: Array.from({ length: limit }, (_, index) => ({
            id: `eff-${index + 1}`,
            name: `Effect ${index + 1}`,
            effectType: "damage",
          })),
          totalCount: limit + 1,
        });
      }

      return Promise.resolve({
        items: [{ id: "eff-101", name: "Effect 101", effectType: "damage" }],
        totalCount: limit + 1,
      });
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Items" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.createNew("Items");
    });

    await waitFor(() => {
      expect(result.current.effectOptions).toHaveLength(101);
    });

    expect(mockEffectsList).toHaveBeenNthCalledWith(1, {
      limit: 100,
      page: 1,
      sortBy: "name",
      sortDir: "asc",
    });
    expect(mockEffectsList).toHaveBeenNthCalledWith(2, {
      limit: 100,
      page: 2,
      sortBy: "name",
      sortDir: "asc",
    });
  });

  it("maps duplicate item names to a user-facing error", async () => {
    mockItemsGet.mockResolvedValueOnce({
      id: "i1",
      name: "Oak Staff",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 3,
      mana: 0,
      spellDmg: 12,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      effectIds: ["sp-1"],
    });
    mockItemsUpdate.mockRejectedValueOnce(new Error("An item with this name already exists."));

    const { result } = renderHook(() => useCreatePageState({ tab: "Items" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Items", "i1");
    });

    act(() => {
      result.current.updateEntityField("name", "Iron Sword");
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(result.current.entitySaveError).toBe("An item with this name already exists");
    expect(result.current.entityWorkspace.isDirty).toBe(true);
  });
});

describe("useCreatePageState — unit save flows", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("successful create switches to edit mode and syncs unit_id", async () => {
    let currentSearch: { tab?: string; unit_id?: string } = { tab: "Units" };
    let rerenderHook!: (props: { search: { tab?: string; unit_id?: string } }) => void;
    const navigate = vi.fn(
      ({ search }: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => {
        currentSearch = search(currentSearch) as typeof currentSearch;
        rerenderHook({ search: currentSearch });
      },
    );

    mockUnitsCreate.mockResolvedValueOnce({
      id: "u-created",
      name: "Bronze Sentinel",
      meleeDmg: 0,
      health: 0,
      rangedDmg: 0,
      manaRegen: 0,
      mana: 100,
      spellDmg: 0,
      speed: 0,
      dodge: 0,
      criticalChance: 0,
      itemIds: ["it-1"],
      targetScope: "enemies",
      targetPriority: "highest_health",
      targetCount: 1,
      selectionShape: "individual",
    });

    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; unit_id?: string } }) =>
        useCreatePageState(props.search, navigate),
      { wrapper: createWrapper(), initialProps: { search: currentSearch } },
    );
    rerenderHook = rerender;

    act(() => {
      result.current.createNew("Units");
      result.current.updateEntityField("name", "Bronze Sentinel");
      result.current.updateEntityField("itemIds", ["it-1"]);
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(mockUnitsCreate).toHaveBeenCalledWith({
      name: "Bronze Sentinel",
      meleeDmg: 0,
      health: 0,
      rangedDmg: 0,
      manaRegen: 0,
      mana: 100,
      spellDmg: 0,
      speed: 0,
      dodge: 0,
      criticalChance: 0,
      itemIds: ["it-1"],
      targetScope: "enemies",
      targetPriority: "highest_health",
      targetCount: 1,
      selectionShape: "individual",
    });
    expect(result.current.entityWorkspace.mode).toBe("edit");
    expect(result.current.entityWorkspace.entityId).toBe("u-created");
    expect(currentSearch.unit_id).toBe("u-created");
  });

  it("successful update clears dirty state and preserves item order", async () => {
    mockUnitsGet.mockResolvedValueOnce({
      id: "u1",
      name: "Barbarian",
      meleeDmg: 15,
      health: 100,
      rangedDmg: 0,
      manaRegen: 0,
      mana: 100,
      spellDmg: 0,
      speed: 1,
      dodge: 5,
      criticalChance: 10,
      itemIds: ["it-1", "it-3"],
    });
    mockUnitsUpdate.mockResolvedValueOnce({
      id: "u1",
      name: "Barbarian",
      meleeDmg: 15,
      health: 120,
      rangedDmg: 0,
      manaRegen: 0,
      mana: 100,
      spellDmg: 0,
      speed: 1,
      dodge: 5,
      criticalChance: 10,
      itemIds: ["it-3", "it-1"],
      targetScope: "enemies",
      targetPriority: "highest_health",
      targetCount: 1,
      selectionShape: "individual",
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Units" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Units", "u1");
    });

    act(() => {
      result.current.updateEntityField("health", "120");
      result.current.updateEntityField("itemIds", ["it-3", "it-1"]);
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(mockUnitsUpdate).toHaveBeenCalledWith({
      id: "u1",
      name: "Barbarian",
      meleeDmg: 15,
      health: 120,
      rangedDmg: 0,
      manaRegen: 0,
      mana: 100,
      spellDmg: 0,
      speed: 1,
      dodge: 5,
      criticalChance: 10,
      itemIds: ["it-3", "it-1"],
      targetScope: "enemies",
      targetPriority: "highest_health",
      targetCount: 1,
      selectionShape: "individual",
    });
    expect(result.current.entityWorkspace.isDirty).toBe(false);
  });

  it("saves a new unit without linked items", async () => {
    mockUnitsCreate.mockResolvedValueOnce({
      id: "u-barehand",
      name: "Barehand Adept",
      meleeDmg: 0,
      health: 0,
      rangedDmg: 0,
      manaRegen: 0,
      mana: 100,
      spellDmg: 0,
      speed: 0,
      dodge: 0,
      criticalChance: 0,
      itemIds: [],
      targetScope: "enemies",
      targetPriority: "highest_health",
      targetCount: 1,
      selectionShape: "individual",
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Units" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.createNew("Units");
      result.current.updateEntityField("name", "Barehand Adept");
      result.current.updateEntityField("itemIds", []);
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(mockUnitsCreate).toHaveBeenCalledWith({
      name: "Barehand Adept",
      meleeDmg: 0,
      health: 0,
      rangedDmg: 0,
      manaRegen: 0,
      mana: 100,
      spellDmg: 0,
      speed: 0,
      dodge: 0,
      criticalChance: 0,
      itemIds: [],
      targetScope: "enemies",
      targetPriority: "highest_health",
      targetCount: 1,
      selectionShape: "individual",
    });
  });

  it("treats linked item ids as ordered and duplicate-aware for dirty checks", async () => {
    mockUnitsGet.mockResolvedValueOnce({
      id: "u1",
      name: "Barbarian",
      meleeDmg: 15,
      health: 100,
      rangedDmg: 0,
      manaRegen: 0,
      mana: 100,
      spellDmg: 0,
      speed: 1,
      dodge: 5,
      criticalChance: 10,
      itemIds: ["it-1", "it-3"],
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Units" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Units", "u1");
    });

    act(() => {
      result.current.updateEntityField("itemIds", ["it-3", "it-1"]);
    });

    expect(result.current.entityWorkspace.isDirty).toBe(true);
  });

  it("loads item options across multiple list pages for the unit workspace", async () => {
    const finalItem = {
      id: "it-101",
      name: "Item 101",
      meleeDmg: 8,
      rangedDmg: 1,
      mana: 2,
      manaRegen: 3,
      spellDmg: 4,
      dodge: 5,
      criticalChance: 6,
    };

    mockItemsList.mockImplementation(({ page, limit }: { page: number; limit: number }) => {
      if (page === 1) {
        return Promise.resolve({
          items: Array.from({ length: limit }, (_, index) => ({
            id: `it-${index + 1}`,
            name: `Item ${index + 1}`,
          })),
          totalCount: limit + 1,
        });
      }

      return Promise.resolve({
        items: [finalItem],
        totalCount: limit + 1,
      });
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Units" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.createNew("Units");
    });

    await waitFor(() => {
      expect(result.current.itemOptions).toHaveLength(101);
    });

    expect(result.current.itemOptions.at(-1)).toEqual(finalItem);

    expect(mockItemsList).toHaveBeenNthCalledWith(1, {
      limit: 100,
      page: 1,
      sortBy: "name",
      sortDir: "asc",
    });
    expect(mockItemsList).toHaveBeenNthCalledWith(2, {
      limit: 100,
      page: 2,
      sortBy: "name",
      sortDir: "asc",
    });
  });

  it("maps duplicate unit names to a user-facing error", async () => {
    mockUnitsGet.mockResolvedValueOnce({
      id: "u1",
      name: "Barbarian",
      meleeDmg: 15,
      health: 100,
      rangedDmg: 0,
      manaRegen: 0,
      mana: 100,
      spellDmg: 0,
      speed: 1,
      dodge: 5,
      criticalChance: 10,
      itemIds: ["it-1"],
    });
    mockUnitsUpdate.mockRejectedValueOnce(new Error("A unit with this name already exists."));

    const { result } = renderHook(() => useCreatePageState({ tab: "Units" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Units", "u1");
    });

    act(() => {
      result.current.updateEntityField("name", "Mage");
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(result.current.entitySaveError).toBe("A unit with this name already exists");
    expect(result.current.entityWorkspace.isDirty).toBe(true);
  });
});

describe("useCreatePageState — delete scenario", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("requestDeleteScenario opens delete dialog", () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.requestDeleteScenario("sc1", "Ambush at Dawn");
    });

    expect(result.current.isDeleteDialogOpen).toBe(true);
    expect(result.current.deleteTarget).toEqual({ id: "sc1", name: "Ambush at Dawn" });
  });

  it("cancelDeleteScenario closes delete dialog", () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.requestDeleteScenario("sc1", "Ambush at Dawn");
    });
    expect(result.current.isDeleteDialogOpen).toBe(true);

    act(() => {
      result.current.cancelDeleteScenario();
    });
    expect(result.current.isDeleteDialogOpen).toBe(false);
    expect(result.current.deleteTarget).toBeNull();
  });

  it("confirmDeleteScenario calls delete and closes dialog", async () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.requestDeleteScenario("sc1", "Ambush at Dawn");
    });

    await act(async () => {
      await result.current.confirmDeleteScenario();
    });

    expect(mockScenariosDelete).toHaveBeenCalledWith({ id: "sc1" });
    expect(result.current.isDeleteDialogOpen).toBe(false);
    expect(result.current.deleteTarget).toBeNull();
  });

  it("confirmDeleteScenario sets deleteError on mutation failure", async () => {
    mockScenariosDelete.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.requestDeleteScenario("sc1", "Ambush at Dawn");
    });

    await act(async () => {
      await result.current.confirmDeleteScenario();
    });

    expect(result.current.deleteError).toBe("Failed to delete scenario. Please try again.");
    expect(result.current.isDeleteDialogOpen).toBe(true);
    expect(result.current.deleteTarget).toEqual({ id: "sc1", name: "Ambush at Dawn" });
  });

  it("deleteError is cleared when cancel is called", async () => {
    mockScenariosDelete.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.requestDeleteScenario("sc1", "Ambush at Dawn");
    });

    await act(async () => {
      await result.current.confirmDeleteScenario();
    });

    expect(result.current.deleteError).toBe("Failed to delete scenario. Please try again.");

    act(() => {
      result.current.cancelDeleteScenario();
    });

    expect(result.current.deleteError).toBeNull();
  });

  it("deleting the open scenario clears workspace", async () => {
    mockScenariosGet.mockResolvedValueOnce({ id: "sc1", name: "Ambush", difficulty: "hard" });
    const mockNavigate = vi.fn();

    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, mockNavigate), {
      wrapper: createWrapper(),
    });

    // Load a scenario
    await act(async () => {
      result.current.selectRecord("Scenarios", "sc1");
    });

    expect(result.current.scenarioWorkspace.entityId).toBe("sc1");

    // Request delete
    act(() => {
      result.current.requestDeleteScenario("sc1", "Ambush");
    });

    // Confirm
    await act(async () => {
      await result.current.confirmDeleteScenario();
    });

    expect(result.current.scenarioWorkspace.mode).toBe("idle");
    expect(result.current.scenarioWorkspace.entityId).toBeNull();
  });
});

describe("useCreatePageState — delete effect", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("surfaces linked-item dependency errors without closing the dialog", async () => {
    mockEffectsDelete.mockRejectedValueOnce({
      data: { code: "CONFLICT" },
      shape: { data: { code: "CONFLICT" } },
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Effects" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.requestDeleteEffect("eff1", "Barbarian Roar");
    });

    await act(async () => {
      await result.current.confirmDeleteEffect();
    });

    expect(result.current.isDeleteEffectDialogOpen).toBe(true);
    expect(result.current.deleteEffectError).toBe(
      "Cannot delete effect while it is linked to one or more items.",
    );
  });
});

describe("useCreatePageState — scenario save flow", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("creates a scenario, syncs the URL, and clears dirty state", async () => {
    const navigate = vi.fn();
    const { queryClient, wrapper } = createWrapperWithClient();
    const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");
    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, navigate), {
      wrapper,
    });

    act(() => {
      result.current.createNew("Scenarios");
      result.current.updateScenarioField("name", "Frontier Watch");
      result.current.updateScenarioField("rows", [
        { rowType: "tank", unitIds: [] },
        { rowType: "melee", unitIds: ["u-1"] },
        { rowType: "ranged", unitIds: [] },
        { rowType: "support", unitIds: [] },
      ]);
    });

    await act(async () => {
      await result.current.saveScenario();
    });

    expect(mockScenariosCreate).toHaveBeenCalledWith({
      name: "Frontier Watch",
      rows: [
        { rowType: "ranged", unitIds: [] },
        { rowType: "support", unitIds: [] },
        { rowType: "melee", unitIds: ["u-1"] },
        { rowType: "tank", unitIds: [] },
      ],
    });
    expect(result.current.scenarioWorkspace.mode).toBe("edit");
    expect(result.current.scenarioWorkspace.isDirty).toBe(false);

    const navigateCall = navigate.mock.calls.at(-1)?.[0];
    expect(navigateCall).toEqual({
      search: expect.any(Function),
      replace: true,
    });
    expect(navigateCall.search({ tab: "Scenarios" })).toEqual({
      tab: "Scenarios",
      scenario_id: "sc-new",
    });
    expect(setQueryDataSpy).toHaveBeenCalledWith(
      ["scenarioBuilder", "scenarios", "get", "sc-new"],
      expect.objectContaining({
        id: "sc-new",
        name: "New Scenario",
      }),
    );
  });

  it("updates an existing scenario", async () => {
    mockScenariosGet.mockResolvedValueOnce({
      id: "sc1",
      name: "Ambush at Dawn",
      rows: [
        { id: "r1", rowType: "melee", assignments: [] },
        { id: "r2", rowType: "ranged", assignments: [] },
        { id: "r3", rowType: "support", assignments: [] },
        { id: "r4", rowType: "tank", assignments: [] },
      ],
    });

    const { queryClient, wrapper } = createWrapperWithClient();
    const setQueryDataSpy = vi.spyOn(queryClient, "setQueryData");
    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper,
    });

    await act(async () => {
      result.current.selectRecord("Scenarios", "sc1");
    });

    act(() => {
      result.current.updateScenarioField("name", "Ambush at Dusk");
    });

    await act(async () => {
      await result.current.saveScenario();
    });

    expect(mockScenariosUpdate).toHaveBeenCalledWith({
      id: "sc1",
      name: "Ambush at Dusk",
      rows: [
        { rowType: "ranged", unitIds: [] },
        { rowType: "support", unitIds: [] },
        { rowType: "melee", unitIds: [] },
        { rowType: "tank", unitIds: [] },
      ],
    });
    expect(setQueryDataSpy).toHaveBeenCalledWith(
      ["scenarioBuilder", "scenarios", "get", "sc1"],
      expect.objectContaining({
        id: "sc1",
        name: "Updated Scenario",
      }),
    );
  });

  it("saves the latest entity links even when the save callback was captured before a linked-record edit", async () => {
    mockItemsGet.mockResolvedValueOnce({
      id: "it1",
      name: "Oak Staff",
      meleeDmg: 0,
      rangedDmg: 0,
      mana: 0,
      manaRegen: 0,
      spellDmg: 0,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      effectIds: ["sp-1", "sp-2"],
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Items" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Items", "it1");
    });

    const staleSaveEntity = result.current.saveEntity;

    act(() => {
      result.current.updateEntityField("effectIds", ["sp-2"]);
    });

    await act(async () => {
      await staleSaveEntity();
    });

    expect(mockItemsUpdate).toHaveBeenCalledWith({
      id: "it1",
      name: "Oak Staff",
      meleeDmg: 0,
      rangedDmg: 0,
      mana: 0,
      manaRegen: 0,
      spellDmg: 0,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      effectIds: ["sp-2"],
      allowedRowTypes: [],
    });
  });

  it("saves the latest scenario rows even when the save callback was captured before a row edit", async () => {
    mockScenariosGet.mockResolvedValueOnce({
      id: "sc1",
      name: "Ambush at Dawn",
      rows: [
        {
          id: "r1",
          rowType: "melee",
          assignments: [
            { assignmentId: "a1", unitId: "u-1", unitName: "Barbarian", position: 1 },
            { assignmentId: "a2", unitId: "u-4", unitName: "Samurai", position: 2 },
          ],
        },
        { id: "r2", rowType: "ranged", assignments: [] },
        { id: "r3", rowType: "support", assignments: [] },
        { id: "r4", rowType: "tank", assignments: [] },
      ],
    });

    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Scenarios", "sc1");
    });

    const staleSaveScenario = result.current.saveScenario;

    act(() => {
      result.current.updateScenarioField("rows", [
        { rowType: "ranged", unitIds: [] },
        { rowType: "support", unitIds: [] },
        { rowType: "melee", unitIds: ["u-1"] },
        { rowType: "tank", unitIds: [] },
      ]);
    });

    await act(async () => {
      await staleSaveScenario();
    });

    expect(mockScenariosUpdate).toHaveBeenCalledWith({
      id: "sc1",
      name: "Ambush at Dawn",
      rows: [
        { rowType: "ranged", unitIds: [] },
        { rowType: "support", unitIds: [] },
        { rowType: "melee", unitIds: ["u-1"] },
        { rowType: "tank", unitIds: [] },
      ],
    });
  });

  it("blocks saving when the scenario name is missing", async () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.createNew("Scenarios");
    });

    await act(async () => {
      await result.current.saveScenario();
    });

    expect(mockScenariosCreate).not.toHaveBeenCalled();
  });

  it("maps duplicate-name errors to the scenario save error message", async () => {
    mockScenariosCreate.mockRejectedValueOnce(
      new Error("A scenario with this name already exists."),
    );

    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.createNew("Scenarios");
      result.current.updateScenarioField("name", "Ambush at Dawn");
    });

    await act(async () => {
      await result.current.saveScenario();
    });

    expect(result.current.scenarioSaveError).toBe("A scenario with this name already exists");
  });
});

describe("useCreatePageState — query invalidation after save", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("invalidates all effect queries after creating an effect", async () => {
    const { queryClient, wrapper } = createWrapperWithClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreatePageState({ tab: "Effects" }, vi.fn()), {
      wrapper,
    });

    act(() => {
      result.current.createNew("Effects");
      result.current.updateEntityField("name", "New Effect");
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["scenarioBuilder", "effects"],
    });
  });

  it("invalidates all item queries after creating an item", async () => {
    const { queryClient, wrapper } = createWrapperWithClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreatePageState({ tab: "Items" }, vi.fn()), { wrapper });

    act(() => {
      result.current.createNew("Items");
      result.current.updateEntityField("name", "New Item");
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["scenarioBuilder", "items"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["scenarioBuilder", "units", "all-options-for-scenarios"],
    });
  });

  it("invalidates all unit queries after creating a unit", async () => {
    const { queryClient, wrapper } = createWrapperWithClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreatePageState({ tab: "Units" }, vi.fn()), { wrapper });

    act(() => {
      result.current.createNew("Units");
      result.current.updateEntityField("name", "New Unit");
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["scenarioBuilder", "units"],
    });
  });

  it("invalidates all scenario queries after creating a scenario", async () => {
    const { queryClient, wrapper } = createWrapperWithClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper,
    });

    act(() => {
      result.current.createNew("Scenarios");
      result.current.updateScenarioField("name", "Test Scenario");
    });

    await act(async () => {
      await result.current.saveScenario();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["scenarioBuilder", "scenarios"],
    });
  });
});

describe("useCreatePageState — query invalidation after delete", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("invalidates all effect queries after deleting an effect", async () => {
    const { queryClient, wrapper } = createWrapperWithClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreatePageState({ tab: "Effects" }, vi.fn()), {
      wrapper,
    });

    act(() => {
      result.current.requestDeleteEffect("eff1", "Barbarian Roar");
    });

    await act(async () => {
      await result.current.confirmDeleteEffect();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["scenarioBuilder", "effects"],
    });
  });

  it("invalidates all item queries after deleting an item", async () => {
    const { queryClient, wrapper } = createWrapperWithClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreatePageState({ tab: "Items" }, vi.fn()), { wrapper });

    act(() => {
      result.current.requestDeleteItem("it1", "Oak Staff");
    });

    await act(async () => {
      await result.current.confirmDeleteItem();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["scenarioBuilder", "items"],
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["scenarioBuilder", "units", "all-options-for-scenarios"],
    });
  });

  it("invalidates all unit queries after deleting a unit", async () => {
    const { queryClient, wrapper } = createWrapperWithClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreatePageState({ tab: "Units" }, vi.fn()), { wrapper });

    act(() => {
      result.current.requestDeleteUnit("u1", "Barbarian");
    });

    await act(async () => {
      await result.current.confirmDeleteUnit();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["scenarioBuilder", "units"],
    });
  });

  it("invalidates all scenario queries after deleting a scenario", async () => {
    const { queryClient, wrapper } = createWrapperWithClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, vi.fn()), {
      wrapper,
    });

    act(() => {
      result.current.requestDeleteScenario("sc1", "Ambush at Dawn");
    });

    await act(async () => {
      await result.current.confirmDeleteScenario();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["scenarioBuilder", "scenarios"],
    });
  });
});
