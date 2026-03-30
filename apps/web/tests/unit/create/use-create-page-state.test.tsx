import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockListQueries: Record<string, ReturnType<typeof vi.fn>> = {};
const mockGetQueries: Record<string, ReturnType<typeof vi.fn>> = {};

const { mockEffectsList, mockSpellsList, mockItemsList, mockUnitsList, mockScenariosList,
        mockEffectsGet, mockSpellsGet, mockItemsGet, mockUnitsGet, mockScenariosGet,
        mockScenariosDelete, mockSpellsDelete, mockEffectsCreate, mockEffectsUpdate, mockEffectsDelete,
        mockSpellsCreate, mockSpellsUpdate, mockItemsCreate, mockItemsUpdate, mockItemsDelete,
        mockUnitsCreate, mockUnitsUpdate, mockUnitsDelete, mockScenariosCreate, mockScenariosUpdate } = vi.hoisted(() => {
  const mockEffectsList = vi.fn().mockResolvedValue({ items: [] });
  const mockSpellsList = vi.fn().mockResolvedValue({ items: [] });
  const mockItemsList = vi.fn().mockResolvedValue({ items: [] });
  const mockUnitsList = vi.fn().mockResolvedValue({ items: [] });
  const mockScenariosList = vi.fn().mockResolvedValue({ items: [] });
  const mockEffectsGet = vi.fn().mockRejectedValue(new Error("not found"));
  const mockEffectsCreate = vi.fn().mockResolvedValue({ id: "e-new", name: "New Effect", timingType: "instant", effectType: "buff" });
  const mockEffectsUpdate = vi.fn().mockResolvedValue({ id: "e1", name: "Updated Effect", timingType: "instant", effectType: "buff" });
  const mockEffectsDelete = vi.fn().mockResolvedValue({ success: true });
  const mockSpellsCreate = vi.fn().mockResolvedValue({
    id: "s-new",
    name: "New Spell",
    description: null,
    targetPolicy: "random",
    effectIds: ["eff-1"],
  });
  const mockSpellsUpdate = vi.fn().mockResolvedValue({
    id: "s1",
    name: "Updated Spell",
    description: null,
    targetPolicy: "random",
    effectIds: ["eff-1"],
  });
  const mockSpellsGet = vi.fn().mockRejectedValue(new Error("not found"));
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
    spellIds: ["sp-1"],
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
    spellIds: ["sp-1"],
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
  const mockSpellsDelete = vi.fn().mockResolvedValue({ success: true });
  return {
    mockEffectsList, mockSpellsList, mockItemsList, mockUnitsList, mockScenariosList,
    mockEffectsGet, mockSpellsGet, mockItemsGet, mockUnitsGet, mockScenariosGet,
    mockScenariosDelete, mockSpellsDelete, mockEffectsCreate, mockEffectsUpdate, mockEffectsDelete,
    mockSpellsCreate, mockSpellsUpdate, mockItemsCreate, mockItemsUpdate, mockItemsDelete,
    mockUnitsCreate, mockUnitsUpdate, mockUnitsDelete, mockScenariosCreate, mockScenariosUpdate,
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
      spells: {
        list: { query: mockSpellsList },
        get: { query: mockSpellsGet },
        create: { mutate: mockSpellsCreate },
        update: { mutate: mockSpellsUpdate },
        delete: { mutate: mockSpellsDelete },
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
      return (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
    },
  };
}

function resetMocks() {
  vi.clearAllMocks();
  mockEffectsList.mockResolvedValue({ items: [], totalCount: 0 });
  mockSpellsList.mockResolvedValue({ items: [], totalCount: 0 });
  mockItemsList.mockResolvedValue({ items: [], totalCount: 0 });
  mockUnitsList.mockResolvedValue({ items: [] });
  mockScenariosList.mockResolvedValue({ items: [], totalCount: 0 });
  mockEffectsGet.mockRejectedValue(new Error("not found"));
  mockEffectsCreate.mockResolvedValue({ id: "e-new", name: "New Effect", timingType: "instant", effectType: "buff" });
  mockEffectsUpdate.mockResolvedValue({ id: "e1", name: "Updated Effect", timingType: "instant", effectType: "buff" });
  mockEffectsDelete.mockResolvedValue({ success: true });
  mockSpellsCreate.mockResolvedValue({
    id: "s-new",
    name: "New Spell",
    description: null,
    targetPolicy: "random",
    effectIds: ["eff-1"],
  });
  mockSpellsUpdate.mockResolvedValue({
    id: "s1",
    name: "Updated Spell",
    description: null,
    targetPolicy: "random",
    effectIds: ["eff-1"],
  });
  mockSpellsGet.mockRejectedValue(new Error("not found"));
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
    spellIds: ["sp-1"],
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
    spellIds: ["sp-1"],
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
  mockSpellsDelete.mockResolvedValue({ success: true });
}

describe("useCreatePageState — isDirty (full form surface)", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("entity isDirty is false when formValues match original data", async () => {
    mockSpellsGet.mockResolvedValueOnce({ id: "s1", name: "Fireball", description: "", targetPolicy: "random", effectIds: ["eff-1"], damage: 50 });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.selectRecord("Spells", "s1");
    });

    expect(result.current.entityWorkspace.isDirty).toBe(false);
  });

  it("entity isDirty is true when any form field differs from original data", async () => {
    mockSpellsGet.mockResolvedValueOnce({ id: "s1", name: "Fireball", description: "", targetPolicy: "random", effectIds: ["eff-1"], damage: 50 });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.selectRecord("Spells", "s1");
    });

    // Change a non-name field
    act(() => {
      result.current.updateEntityField("damage", 100);
    });

    expect(result.current.entityWorkspace.isDirty).toBe(true);
  });

  it("entity isDirty returns to false when field is reverted to original", async () => {
    mockSpellsGet.mockResolvedValueOnce({ id: "s1", name: "Fireball", description: "", targetPolicy: "random", effectIds: ["eff-1"], damage: 50 });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.selectRecord("Spells", "s1");
    });

    act(() => {
      result.current.updateEntityField("damage", 100);
    });
    expect(result.current.entityWorkspace.isDirty).toBe(true);

    act(() => {
      result.current.updateEntityField("damage", 50);
    });
    expect(result.current.entityWorkspace.isDirty).toBe(false);
  });

  it("spell isDirty returns to false after reverting a name change when original description is null", async () => {
    mockSpellsGet.mockResolvedValueOnce({
      id: "s1",
      name: "Fireball",
      description: null,
      targetPolicy: "random",
      effectIds: ["eff-1"],
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.selectRecord("Spells", "s1");
    });

    act(() => {
      result.current.updateEntityField("name", "Fireball Updated");
    });
    expect(result.current.entityWorkspace.isDirty).toBe(true);

    act(() => {
      result.current.updateEntityField("name", "Fireball");
    });
    expect(result.current.entityWorkspace.isDirty).toBe(false);
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

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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
      intervalMs: 1000,
      triggerCount: 2,
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Effects" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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
      () => new Promise((resolve) => { resolveScenarios = resolve; }),
    );

    renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    // Scenarios list should have been called (active tab)
    expect(mockScenariosList).toHaveBeenCalled();
    // Other tabs should NOT have been called yet
    expect(mockEffectsList).not.toHaveBeenCalled();
    expect(mockSpellsList).not.toHaveBeenCalled();
    expect(mockItemsList).not.toHaveBeenCalled();
    expect(mockUnitsList).not.toHaveBeenCalled();

    // Resolve the active tab query
    await act(async () => {
      resolveScenarios({ items: [] });
    });
  });

  it("on cold load with Spells tab, only spells list query fires initially", async () => {
    let resolveSpells!: (v: { items: never[] }) => void;
    mockSpellsList.mockImplementation(
      () => new Promise((resolve) => { resolveSpells = resolve; }),
    );

    renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    expect(mockSpellsList).toHaveBeenCalled();
    expect(mockEffectsList).not.toHaveBeenCalled();
    expect(mockItemsList).not.toHaveBeenCalled();
    expect(mockUnitsList).not.toHaveBeenCalled();
    expect(mockScenariosList).not.toHaveBeenCalled();

    await act(async () => {
      resolveSpells({ items: [] });
    });
  });

  it("after the active tab settles, remaining tab queries fire", async () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    // Wait for queries to settle
    await waitFor(() => {
      expect(result.current.listLoading.Scenarios).toBe(false);
    });

    // Now the background queries should have fired
    await waitFor(() => {
      expect(mockEffectsList).toHaveBeenCalled();
      expect(mockSpellsList).toHaveBeenCalled();
      expect(mockItemsList).toHaveBeenCalled();
      expect(mockUnitsList).toHaveBeenCalled();
    });
  });
});

describe("useCreatePageState — listFetching field", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("exposes listFetching with boolean values for all 5 tabs", async () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    const { listFetching } = result.current;
    expect(listFetching).toBeDefined();
    const tabs = ["Effects", "Spells", "Items", "Units", "Scenarios"] as const;
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
    mockSpellsGet.mockImplementation(
      () => new Promise((resolve) => { resolveGet = resolve; }),
    );

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.selectRecord("Spells", "s1");
    });

    // Workspace should be in loading mode while the request is in flight
    expect(result.current.entityWorkspace.mode).toBe("loading");

    // Resolve and verify it transitions to edit
    await act(async () => {
      resolveGet({ id: "s1", name: "Fireball", damage: 50 });
    });

    expect(result.current.entityWorkspace.mode).toBe("edit");
  });

  it("scenario workspace enters loading mode while fetching", async () => {
    let resolveGet!: (v: Record<string, unknown>) => void;
    mockScenariosGet.mockImplementation(
      () => new Promise((resolve) => { resolveGet = resolve; }),
    );

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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
    let resolveSpell!: (value: Record<string, unknown>) => void;

    mockEffectsGet.mockResolvedValueOnce({
      id: "e1",
      name: "Barbarian Roar",
      timingType: "instant",
      effectType: "buff",
      intervalMs: null,
      triggerCount: null,
    });
    mockSpellsGet.mockImplementationOnce(
      () => new Promise((resolve) => {
        resolveSpell = resolve;
      }),
    );

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Effects" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.selectRecord("Effects", "e1");
    });

    act(() => {
      result.current.selectRecord("Spells", "s1");
    });

    expect(result.current.entityWorkspace.mode).toBe("loading");
    expect(result.current.entityWorkspace.entityType).toBe("effect");
    expect(result.current.entityWorkspace.entityId).toBe("s1");
    expect(result.current.entityWorkspace.data).toEqual({
      id: "e1",
      name: "Barbarian Roar",
      timingType: "instant",
      effectType: "buff",
      intervalMs: null,
      triggerCount: null,
    });
    expect(result.current.entityWorkspace.formValues).toMatchObject({
      name: "Barbarian Roar",
      timingType: "instant",
      effectType: "buff",
    });

    await act(async () => {
      resolveSpell({
        id: "s1",
        name: "Fireball",
        description: null,
        targetPolicy: "random",
        effectIds: ["eff-1"],
      });
    });

    expect(result.current.entityWorkspace.mode).toBe("edit");
    expect(result.current.entityWorkspace.entityType).toBe("spell");
    expect(result.current.entityWorkspace.formValues).toMatchObject({
      name: "Fireball",
      targetPolicy: "random",
      effectIds: ["eff-1"],
    });
  });

  it("discards stale entity response when a newer selection is made", async () => {
    let resolveFirst!: (v: Record<string, unknown>) => void;
    let resolveSecond!: (v: Record<string, unknown>) => void;

    mockSpellsGet
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    // Select record A
    act(() => {
      result.current.selectRecord("Spells", "s1");
    });

    // Immediately select record B (before A resolves)
    act(() => {
      result.current.selectRecord("Spells", "s2");
    });

    // B resolves first
    await act(async () => {
      resolveSecond({ id: "s2", name: "Ice Bolt", damage: 30 });
    });

    expect(result.current.entityWorkspace.entityId).toBe("s2");

    // A resolves late — should be discarded
    await act(async () => {
      resolveFirst({ id: "s1", name: "Fireball", damage: 50 });
    });

    // Workspace should still show B, not A
    expect(result.current.entityWorkspace.entityId).toBe("s2");
    expect((result.current.entityWorkspace.formValues as Record<string, unknown>).name).toBe("Ice Bolt");
  });

  it("discards stale scenario response when a newer selection is made", async () => {
    let resolveFirst!: (v: Record<string, unknown>) => void;
    let resolveSecond!: (v: Record<string, unknown>) => void;

    mockScenariosGet
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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
    expect((result.current.scenarioWorkspace.formValues as Record<string, unknown>).name).toBe("Siege");
  });
});

describe("useCreatePageState — URL param change resets", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("does not reset or refetch entity workspace when internal selection syncs the URL", async () => {
    mockSpellsGet
      .mockResolvedValueOnce({ id: "s1", name: "Fireball", damage: 50 })
      .mockResolvedValueOnce({ id: "s2", name: "Ice Bolt", damage: 30 });

    let currentSearch: { tab?: string; spell_id?: string } = { tab: "Spells", spell_id: "s1" };
    let rerenderHook!: (props: { search: { tab?: string; spell_id?: string } }) => void;
    const navigate = vi.fn(({ search }: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => {
      currentSearch = search(currentSearch) as typeof currentSearch;
      rerenderHook({ search: currentSearch });
    });

    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; spell_id?: string } }) =>
        useCreatePageState(props.search, navigate),
      { wrapper: createWrapper(), initialProps: { search: currentSearch } },
    );
    rerenderHook = rerender;

    await waitFor(() => {
      expect(result.current.entityWorkspace.mode).toBe("edit");
      expect(result.current.entityWorkspace.entityId).toBe("s1");
    });

    act(() => {
      result.current.selectRecord("Spells", "s2");
    });

    expect(result.current.entityWorkspace.mode).toBe("loading");
    expect(result.current.entityWorkspace.data).toEqual({ id: "s1", name: "Fireball", damage: 50 });

    await waitFor(() => {
      expect(result.current.entityWorkspace.mode).toBe("edit");
      expect(result.current.entityWorkspace.entityId).toBe("s2");
      expect(result.current.entityWorkspace.data).toEqual({ id: "s2", name: "Ice Bolt", damage: 30 });
    });

    expect(mockSpellsGet).toHaveBeenCalledTimes(2);
  });

  it("reloads entity when entity_id URL param changes", async () => {
    mockSpellsGet
      .mockResolvedValueOnce({ id: "s1", name: "Fireball", damage: 50 })
      .mockResolvedValueOnce({ id: "s2", name: "Ice Bolt", damage: 30 });

    const search: { tab?: string; entity_id?: string; scenario_id?: string } = { tab: "Spells", entity_id: "s1" };
    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; entity_id?: string; scenario_id?: string } }) =>
        useCreatePageState(props.search, vi.fn()),
      { wrapper: createWrapper(), initialProps: { search } },
    );

    // Wait for entity A to load
    await waitFor(() => {
      expect(result.current.entityWorkspace.mode).toBe("edit");
      expect(result.current.entityWorkspace.entityId).toBe("s1");
    });

    // Navigate to a different entity_id
    rerender({ search: { tab: "Spells", entity_id: "s2" } });

    // Entity B should load
    await waitFor(() => {
      expect(result.current.entityWorkspace.entityId).toBe("s2");
      expect(result.current.entityWorkspace.mode).toBe("edit");
    });
  });

  it("resets entity workspace to idle when entity_id is removed", async () => {
    mockSpellsGet.mockResolvedValueOnce({ id: "s1", name: "Fireball", description: "", targetPolicy: "random", effectIds: ["eff-1"], damage: 50 });

    const search = { tab: "Spells" as const, entity_id: "s1" };
    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; entity_id?: string; scenario_id?: string } }) =>
        useCreatePageState(props.search, vi.fn()),
      { wrapper: createWrapper(), initialProps: { search } },
    );

    await waitFor(() => {
      expect(result.current.entityWorkspace.mode).toBe("edit");
    });

    // Remove entity_id from URL
    rerender({ search: { tab: "Spells" } as typeof search });

    await waitFor(() => {
      expect(result.current.entityWorkspace.mode).toBe("idle");
      expect(result.current.entityWorkspace.entityId).toBeNull();
    });
  });

  it("reloads scenario when scenario_id URL param changes", async () => {
    mockScenariosGet
      .mockResolvedValueOnce({ id: "sc1", name: "Ambush", difficulty: "hard" })
      .mockResolvedValueOnce({ id: "sc2", name: "Siege", difficulty: "easy" });

    const search: { tab?: string; entity_id?: string; scenario_id?: string } = { tab: "Scenarios", scenario_id: "sc1" };
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

    const search: { tab?: string; entity_id?: string; scenario_id?: string } = { tab: "Scenarios", scenario_id: "sc1" };
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

    let currentSearch: { tab?: string; scenario_id?: string } = { tab: "Scenarios", scenario_id: "sc1" };
    let rerenderHook!: (props: { search: { tab?: string; scenario_id?: string } }) => void;
    const navigate = vi.fn(({ search }: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => {
      currentSearch = search(currentSearch) as typeof currentSearch;
      rerenderHook({ search: currentSearch });
    });

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
    expect(result.current.scenarioWorkspace.data).toEqual({ id: "sc1", name: "Ambush", difficulty: "hard" });

    await waitFor(() => {
      expect(result.current.scenarioWorkspace.mode).toBe("edit");
      expect(result.current.scenarioWorkspace.entityId).toBe("sc2");
      expect(result.current.scenarioWorkspace.data).toEqual({ id: "sc2", name: "Siege", difficulty: "easy" });
    });

    expect(mockScenariosGet).toHaveBeenCalledTimes(2);
  });
});

describe("useCreatePageState — scenario list features", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("exposes scenario sort and page state with defaults", async () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    expect(result.current.scenarioSortBy).toBe("name");
    expect(result.current.scenarioSortDir).toBe("asc");
    expect(result.current.scenarioPage).toBe(1);
  });

  it("setScenarioSort updates sort and resets page to 1", async () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.scenarioTotalPages).toBe(2);
    });
  });
});

describe("useCreatePageState — effect save flows", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("create new effect initializes the full default form state", () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Effects" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.createNew("Effects");
    });

    expect(result.current.entityWorkspace.mode).toBe("create");
    expect(result.current.entityWorkspace.formValues).toMatchObject({
      name: "",
      timingType: "instant",
      effectType: "buff",
      intervalMs: null,
      triggerCount: null,
    });
  });

  it("effect load hydrates the full form state", async () => {
    mockEffectsGet.mockResolvedValueOnce({
      id: "e1",
      name: "Rage",
      timingType: "interval",
      effectType: "buff",
      intervalMs: 1000,
      triggerCount: 2,
      meleeDmg: 1.5,
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Effects" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.selectRecord("Effects", "e1");
    });

    expect(result.current.entityWorkspace.formValues).toMatchObject({
      name: "Rage",
      timingType: "interval",
      effectType: "buff",
      intervalMs: 1000,
      triggerCount: 2,
      meleeDmg: 1.5,
    });
  });

  it("successful create switches to edit mode and syncs effect_id", async () => {
    let currentSearch: { tab?: string; effect_id?: string } = { tab: "Effects" };
    let rerenderHook!: (props: { search: { tab?: string; effect_id?: string } }) => void;
    const navigate = vi.fn(({ search }: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => {
      currentSearch = search(currentSearch) as typeof currentSearch;
      rerenderHook({ search: currentSearch });
    });

    mockEffectsCreate.mockResolvedValueOnce({
      id: "e-created",
      name: "Arc Spark",
      timingType: "instant",
      effectType: "damage",
      intervalMs: null,
      triggerCount: null,
    });

    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; effect_id?: string } }) => useCreatePageState(props.search, navigate),
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

  it("successful update clears dirty state", async () => {
    mockEffectsGet.mockResolvedValueOnce({
      id: "e1",
      name: "Rage",
      timingType: "instant",
      effectType: "buff",
      intervalMs: null,
      triggerCount: null,
    });
    mockEffectsUpdate.mockResolvedValueOnce({
      id: "e1",
      name: "Rage Updated",
      timingType: "instant",
      effectType: "buff",
      intervalMs: null,
      triggerCount: null,
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Effects" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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
      intervalMs: null,
      triggerCount: null,
    });
    mockEffectsUpdate.mockRejectedValueOnce(new Error("An effect with this name already exists."));

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Effects" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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

describe("useCreatePageState — spell save flows", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("successful create switches to edit mode and syncs spell_id", async () => {
    let currentSearch: { tab?: string; spell_id?: string } = { tab: "Spells" };
    let rerenderHook!: (props: { search: { tab?: string; spell_id?: string } }) => void;
    const navigate = vi.fn(({ search }: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => {
      currentSearch = search(currentSearch) as typeof currentSearch;
      rerenderHook({ search: currentSearch });
    });

    mockSpellsCreate.mockResolvedValueOnce({
      id: "s-created",
      name: "Arcane Volley",
      description: null,
      targetPolicy: "random",
      effectIds: ["eff-1"],
    });

    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; spell_id?: string } }) => useCreatePageState(props.search, navigate),
      { wrapper: createWrapper(), initialProps: { search: currentSearch } },
    );
    rerenderHook = rerender;

    act(() => {
      result.current.createNew("Spells");
      result.current.updateEntityField("name", "Arcane Volley");
      result.current.updateEntityField("targetPolicy", "random");
      result.current.updateEntityField("effectIds", ["eff-1"]);
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(mockSpellsCreate).toHaveBeenCalledWith({
      name: "Arcane Volley",
      description: null,
      targetPolicy: "random",
      effectIds: ["eff-1"],
    });
    expect(result.current.entityWorkspace.mode).toBe("edit");
    expect(result.current.entityWorkspace.entityId).toBe("s-created");
    expect(currentSearch.spell_id).toBe("s-created");
  });

  it("does not attempt to save a spell without linked effects", async () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.createNew("Spells");
      result.current.updateEntityField("name", "Arcane Volley");
      result.current.updateEntityField("targetPolicy", "random");
      result.current.updateEntityField("effectIds", []);
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(mockSpellsCreate).not.toHaveBeenCalled();
    expect(mockSpellsUpdate).not.toHaveBeenCalled();
  });
});

describe("useCreatePageState — item save flows", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("successful create switches to edit mode and syncs item_id", async () => {
    let currentSearch: { tab?: string; item_id?: string } = { tab: "Items" };
    let rerenderHook!: (props: { search: { tab?: string; item_id?: string } }) => void;
    const navigate = vi.fn(({ search }: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => {
      currentSearch = search(currentSearch) as typeof currentSearch;
      rerenderHook({ search: currentSearch });
    });

    mockItemsCreate.mockResolvedValueOnce({
      id: "i-created",
      name: "Bronze Buckler",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 0,
      spellDmg: 0,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      spellIds: ["sp-1"],
    });

    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; item_id?: string } }) => useCreatePageState(props.search, navigate),
      { wrapper: createWrapper(), initialProps: { search: currentSearch } },
    );
    rerenderHook = rerender;

    act(() => {
      result.current.createNew("Items");
      result.current.updateEntityField("name", "Bronze Buckler");
      result.current.updateEntityField("meleeDmg", "12.5");
      result.current.updateEntityField("spellIds", ["sp-1"]);
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(mockItemsCreate).toHaveBeenCalledWith({
      name: "Bronze Buckler",
      meleeDmg: 12.5,
      rangedDmg: 0,
      manaRegen: 0,
      spellDmg: 0,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      spellIds: ["sp-1"],
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
      spellDmg: 12,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      spellIds: ["sp-1"],
    });
    mockItemsUpdate.mockResolvedValueOnce({
      id: "i1",
      name: "Oak Staff",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 3,
      spellDmg: 20,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      spellIds: ["sp-1"],
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Items" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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
      spellDmg: 20,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      spellIds: ["sp-1"],
    });
    expect(result.current.entityWorkspace.isDirty).toBe(false);
  });

  it("saves a new item without linked spells", async () => {
    mockItemsCreate.mockResolvedValueOnce({
      id: "i-spell-less",
      name: "Spell-less Relic",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 0,
      spellDmg: 0,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      spellIds: [],
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Items" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.createNew("Items");
      result.current.updateEntityField("name", "Spell-less Relic");
      result.current.updateEntityField("spellIds", []);
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(mockItemsCreate).toHaveBeenCalledWith({
      name: "Spell-less Relic",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 0,
      spellDmg: 0,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      spellIds: [],
    });
    expect(mockItemsUpdate).not.toHaveBeenCalled();
  });

  it("updates an existing item to remove its final linked spell", async () => {
    mockItemsGet.mockResolvedValueOnce({
      id: "i1",
      name: "Oak Staff",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 3,
      spellDmg: 12,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      spellIds: ["sp-1"],
    });
    mockItemsUpdate.mockResolvedValueOnce({
      id: "i1",
      name: "Oak Staff",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 3,
      spellDmg: 12,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      spellIds: [],
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Items" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.selectRecord("Items", "i1");
    });

    act(() => {
      result.current.updateEntityField("spellIds", []);
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
      spellDmg: 12,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      spellIds: [],
    });
  });

  it("marks a new item workspace dirty after the user changes create-form values", async () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Items" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.createNew("Items");
      result.current.updateEntityField("name", "Bronze Buckler");
      result.current.updateEntityField("spellIds", ["sp-1"]);
    });

    expect(result.current.entityWorkspace.isDirty).toBe(true);
  });

  it("treats linked spell ids as an unordered set for dirty checks", async () => {
    mockItemsGet.mockResolvedValueOnce({
      id: "i1",
      name: "Oak Staff",
      meleeDmg: 0,
      rangedDmg: 0,
      manaRegen: 3,
      spellDmg: 12,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      spellIds: ["sp-1", "sp-2"],
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Items" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.selectRecord("Items", "i1");
    });

    act(() => {
      result.current.updateEntityField("spellIds", ["sp-2", "sp-1"]);
    });

    expect(result.current.entityWorkspace.isDirty).toBe(false);
  });

  it("loads spell options across multiple list pages for the item workspace", async () => {
    mockSpellsList.mockImplementation(({ page, limit }: { page: number; limit: number }) => {
      if (page === 1) {
        return Promise.resolve({
          items: Array.from({ length: limit }, (_, index) => ({
            id: `sp-${index + 1}`,
            name: `Spell ${index + 1}`,
            targetPolicy: "random",
          })),
          totalCount: limit + 1,
        });
      }

      return Promise.resolve({
        items: [{ id: "sp-101", name: "Spell 101", targetPolicy: "random" }],
        totalCount: limit + 1,
      });
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Items" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.createNew("Items");
    });

    await waitFor(() => {
      expect(result.current.spellOptions).toHaveLength(101);
    });

    expect(mockSpellsList).toHaveBeenNthCalledWith(1, {
      limit: 100,
      page: 1,
      sortBy: "name",
      sortDir: "asc",
    });
    expect(mockSpellsList).toHaveBeenNthCalledWith(2, {
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
      spellDmg: 12,
      dodge: 0,
      criticalChance: 0,
      activationManaCost: 0,
      activationHealthCost: 0,
      spellIds: ["sp-1"],
    });
    mockItemsUpdate.mockRejectedValueOnce(new Error("An item with this name already exists."));

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Items" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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
    const navigate = vi.fn(({ search }: { search: (prev: Record<string, unknown>) => Record<string, unknown> }) => {
      currentSearch = search(currentSearch) as typeof currentSearch;
      rerenderHook({ search: currentSearch });
    });

    mockUnitsCreate.mockResolvedValueOnce({
      id: "u-created",
      name: "Bronze Sentinel",
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

    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; unit_id?: string } }) => useCreatePageState(props.search, navigate),
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
      spellDmg: 0,
      speed: 0,
      dodge: 0,
      criticalChance: 0,
      itemIds: ["it-1"],
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
      spellDmg: 0,
      speed: 1,
      dodge: 5,
      criticalChance: 10,
      itemIds: ["it-3", "it-1"],
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Units" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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
      spellDmg: 0,
      speed: 1,
      dodge: 5,
      criticalChance: 10,
      itemIds: ["it-3", "it-1"],
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
      spellDmg: 0,
      speed: 0,
      dodge: 0,
      criticalChance: 0,
      itemIds: [],
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Units" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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
      spellDmg: 0,
      speed: 0,
      dodge: 0,
      criticalChance: 0,
      itemIds: [],
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
      spellDmg: 0,
      speed: 1,
      dodge: 5,
      criticalChance: 10,
      itemIds: ["it-1", "it-3"],
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Units" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.selectRecord("Units", "u1");
    });

    act(() => {
      result.current.updateEntityField("itemIds", ["it-3", "it-1"]);
    });

    expect(result.current.entityWorkspace.isDirty).toBe(true);
  });

  it("loads item options across multiple list pages for the unit workspace", async () => {
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
        items: [{ id: "it-101", name: "Item 101" }],
        totalCount: limit + 1,
      });
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Units" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.createNew("Units");
    });

    await waitFor(() => {
      expect(result.current.itemOptions).toHaveLength(101);
    });

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
      spellDmg: 0,
      speed: 1,
      dodge: 5,
      criticalChance: 10,
      itemIds: ["it-1"],
    });
    mockUnitsUpdate.mockRejectedValueOnce(new Error("A unit with this name already exists."));

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Units" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.requestDeleteScenario("sc1", "Ambush at Dawn");
    });

    expect(result.current.isDeleteDialogOpen).toBe(true);
    expect(result.current.deleteTarget).toEqual({ id: "sc1", name: "Ambush at Dawn" });
  });

  it("cancelDeleteScenario closes delete dialog", () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, mockNavigate),
      { wrapper: createWrapper() },
    );

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

describe("useCreatePageState — spell list features", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("exposes spell sort and page state with defaults", async () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    expect(result.current.spellSortBy).toBe("name");
    expect(result.current.spellSortDir).toBe("asc");
    expect(result.current.spellPage).toBe(1);
  });

  it("setSpellSort updates sort and resets page to 1", async () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setSpellPage(2);
    });
    expect(result.current.spellPage).toBe(2);

    act(() => {
      result.current.setSpellSort("targetPolicy", "desc");
    });
    expect(result.current.spellSortBy).toBe("targetPolicy");
    expect(result.current.spellSortDir).toBe("desc");
    expect(result.current.spellPage).toBe(1);
  });

  it("setSpellPage updates page", () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setSpellPage(3);
    });
    expect(result.current.spellPage).toBe(3);
  });

  it("spellTotalPages is computed from totalCount", async () => {
    mockSpellsList.mockResolvedValue({
      items: Array.from({ length: 10 }, (_, i) => ({
        id: `sp${i}`,
        name: `Spell ${i}`,
        description: `Desc ${i}`,
        targetPolicy: "random",
        updatedAt: new Date(),
      })),
      totalCount: 25,
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(result.current.spellTotalPages).toBe(2);
    });
  });
});

describe("useCreatePageState — delete spell", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("requestDeleteSpell opens delete dialog", () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.requestDeleteSpell("sp1", "Fireball");
    });

    expect(result.current.isDeleteSpellDialogOpen).toBe(true);
    expect(result.current.deleteSpellTarget).toEqual({ id: "sp1", name: "Fireball" });
  });

  it("cancelDeleteSpell closes delete dialog", () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.requestDeleteSpell("sp1", "Fireball");
    });
    expect(result.current.isDeleteSpellDialogOpen).toBe(true);

    act(() => {
      result.current.cancelDeleteSpell();
    });
    expect(result.current.isDeleteSpellDialogOpen).toBe(false);
    expect(result.current.deleteSpellTarget).toBeNull();
  });

  it("confirmDeleteSpell calls delete and closes dialog", async () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.requestDeleteSpell("sp1", "Fireball");
    });

    await act(async () => {
      await result.current.confirmDeleteSpell();
    });

    expect(mockSpellsDelete).toHaveBeenCalledWith({ id: "sp1" });
    expect(result.current.isDeleteSpellDialogOpen).toBe(false);
    expect(result.current.deleteSpellTarget).toBeNull();
  });

  it("confirmDeleteSpell sets deleteError on mutation failure", async () => {
    mockSpellsDelete.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.requestDeleteSpell("sp1", "Fireball");
    });

    await act(async () => {
      await result.current.confirmDeleteSpell();
    });

    expect(result.current.deleteSpellError).toBe("Failed to delete spell. Please try again.");
    expect(result.current.isDeleteSpellDialogOpen).toBe(true);
    expect(result.current.deleteSpellTarget).toEqual({ id: "sp1", name: "Fireball" });
  });

  it("surfaces linked-item dependency errors without closing the dialog", async () => {
    mockSpellsDelete.mockRejectedValueOnce({
      data: { code: "CONFLICT" },
      shape: { data: { code: "CONFLICT" } },
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.requestDeleteSpell("sp1", "Fireball");
    });

    await act(async () => {
      await result.current.confirmDeleteSpell();
    });

    expect(result.current.isDeleteSpellDialogOpen).toBe(true);
    expect(result.current.deleteSpellError).toBe(
      "Cannot delete spell while it is linked to one or more items.",
    );
  });

  it("deleteError is cleared when cancel is called", async () => {
    mockSpellsDelete.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.requestDeleteSpell("sp1", "Fireball");
    });

    await act(async () => {
      await result.current.confirmDeleteSpell();
    });

    expect(result.current.deleteSpellError).toBe("Failed to delete spell. Please try again.");

    act(() => {
      result.current.cancelDeleteSpell();
    });

    expect(result.current.deleteSpellError).toBeNull();
  });

  it("deleting the open spell clears workspace", async () => {
    mockSpellsGet.mockResolvedValueOnce({ id: "sp1", name: "Fireball", targetPolicy: "highest_health" });
    const mockNavigate = vi.fn();

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, mockNavigate),
      { wrapper: createWrapper() },
    );

    // Load a spell
    await act(async () => {
      result.current.selectRecord("Spells", "sp1");
    });

    expect(result.current.entityWorkspace.entityId).toBe("sp1");

    // Request delete
    act(() => {
      result.current.requestDeleteSpell("sp1", "Fireball");
    });

    // Confirm
    await act(async () => {
      await result.current.confirmDeleteSpell();
    });

    expect(result.current.entityWorkspace.mode).toBe("idle");
    expect(result.current.entityWorkspace.entityId).toBeNull();
  });
});

describe("useCreatePageState — delete effect", () => {
  beforeEach(() => {
    resetMocks();
  });

  it("surfaces linked-spell dependency errors without closing the dialog", async () => {
    mockEffectsDelete.mockRejectedValueOnce({
      data: { code: "CONFLICT" },
      shape: { data: { code: "CONFLICT" } },
    });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Effects" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.requestDeleteEffect("eff1", "Barbarian Roar");
    });

    await act(async () => {
      await result.current.confirmDeleteEffect();
    });

    expect(result.current.isDeleteEffectDialogOpen).toBe(true);
    expect(result.current.deleteEffectError).toBe(
      "Cannot delete effect while it is linked to one or more spells.",
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
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, navigate),
      { wrapper },
    );

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
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper },
    );

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

  it("blocks saving when the scenario name is missing", async () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.createNew("Scenarios");
    });

    await act(async () => {
      await result.current.saveScenario();
    });

    expect(mockScenariosCreate).not.toHaveBeenCalled();
  });

  it("maps duplicate-name errors to the scenario save error message", async () => {
    mockScenariosCreate.mockRejectedValueOnce(new Error("A scenario with this name already exists."));

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

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

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Effects" }, vi.fn()),
      { wrapper },
    );

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

  it("invalidates all spell queries after creating a spell", async () => {
    const { queryClient, wrapper } = createWrapperWithClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper },
    );

    act(() => {
      result.current.createNew("Spells");
      result.current.updateEntityField("name", "New Spell");
      result.current.updateEntityField("targetPolicy", "random");
      result.current.updateEntityField("effectIds", ["eff-1"]);
    });

    await act(async () => {
      await result.current.saveEntity();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["scenarioBuilder", "spells"],
    });
  });

  it("invalidates all item queries after creating an item", async () => {
    const { queryClient, wrapper } = createWrapperWithClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Items" }, vi.fn()),
      { wrapper },
    );

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
  });

  it("invalidates all unit queries after creating a unit", async () => {
    const { queryClient, wrapper } = createWrapperWithClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Units" }, vi.fn()),
      { wrapper },
    );

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

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper },
    );

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

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Effects" }, vi.fn()),
      { wrapper },
    );

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

  it("invalidates all spell queries after deleting a spell", async () => {
    const { queryClient, wrapper } = createWrapperWithClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, vi.fn()),
      { wrapper },
    );

    act(() => {
      result.current.requestDeleteSpell("sp1", "Fireball");
    });

    await act(async () => {
      await result.current.confirmDeleteSpell();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["scenarioBuilder", "spells"],
    });
  });

  it("invalidates all item queries after deleting an item", async () => {
    const { queryClient, wrapper } = createWrapperWithClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Items" }, vi.fn()),
      { wrapper },
    );

    act(() => {
      result.current.requestDeleteItem("it1", "Oak Staff");
    });

    await act(async () => {
      await result.current.confirmDeleteItem();
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["scenarioBuilder", "items"],
    });
  });

  it("invalidates all unit queries after deleting a unit", async () => {
    const { queryClient, wrapper } = createWrapperWithClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Units" }, vi.fn()),
      { wrapper },
    );

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

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper },
    );

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
