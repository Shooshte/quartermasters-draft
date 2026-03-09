import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

const mockListQueries: Record<string, ReturnType<typeof vi.fn>> = {};
const mockGetQueries: Record<string, ReturnType<typeof vi.fn>> = {};

const { mockEffectsList, mockSpellsList, mockItemsList, mockUnitsList, mockScenariosList,
        mockEffectsGet, mockSpellsGet, mockItemsGet, mockUnitsGet, mockScenariosGet } = vi.hoisted(() => {
  const mockEffectsList = vi.fn().mockResolvedValue({ items: [] });
  const mockSpellsList = vi.fn().mockResolvedValue({ items: [] });
  const mockItemsList = vi.fn().mockResolvedValue({ items: [] });
  const mockUnitsList = vi.fn().mockResolvedValue({ items: [] });
  const mockScenariosList = vi.fn().mockResolvedValue({ items: [] });
  const mockEffectsGet = vi.fn().mockRejectedValue(new Error("not found"));
  const mockSpellsGet = vi.fn().mockRejectedValue(new Error("not found"));
  const mockItemsGet = vi.fn().mockRejectedValue(new Error("not found"));
  const mockUnitsGet = vi.fn().mockRejectedValue(new Error("not found"));
  const mockScenariosGet = vi.fn().mockRejectedValue(new Error("not found"));
  return {
    mockEffectsList, mockSpellsList, mockItemsList, mockUnitsList, mockScenariosList,
    mockEffectsGet, mockSpellsGet, mockItemsGet, mockUnitsGet, mockScenariosGet,
  };
});

vi.mock("~/lib/trpc", () => ({
  trpc: {
    scenarioBuilder: {
      effects: { list: { query: mockEffectsList }, get: { query: mockEffectsGet } },
      spells: { list: { query: mockSpellsList }, get: { query: mockSpellsGet } },
      items: { list: { query: mockItemsList }, get: { query: mockItemsGet } },
      units: { list: { query: mockUnitsList }, get: { query: mockUnitsGet } },
      scenarios: { list: { query: mockScenariosList }, get: { query: mockScenariosGet } },
    },
  },
}));

import { useCreatePageState } from "~/components/create/use-create-page-state";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("useCreatePageState — isDirty (full form surface)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEffectsList.mockResolvedValue({ items: [] });
    mockSpellsList.mockResolvedValue({ items: [] });
    mockItemsList.mockResolvedValue({ items: [] });
    mockUnitsList.mockResolvedValue({ items: [] });
    mockScenariosList.mockResolvedValue({ items: [] });
    mockEffectsGet.mockRejectedValue(new Error("not found"));
    mockSpellsGet.mockRejectedValue(new Error("not found"));
    mockItemsGet.mockRejectedValue(new Error("not found"));
    mockUnitsGet.mockRejectedValue(new Error("not found"));
    mockScenariosGet.mockRejectedValue(new Error("not found"));
  });

  it("entity isDirty is false when formValues match original data", async () => {
    mockSpellsGet.mockResolvedValueOnce({ id: "s1", name: "Fireball", damage: 50 });

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
    mockSpellsGet.mockResolvedValueOnce({ id: "s1", name: "Fireball", damage: 50 });

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
    mockSpellsGet.mockResolvedValueOnce({ id: "s1", name: "Fireball", damage: 50 });

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

  it("scenario isDirty is true when any form field differs from original", async () => {
    mockScenariosGet.mockResolvedValueOnce({ id: "sc1", name: "Ambush", difficulty: "hard" });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, vi.fn()),
      { wrapper: createWrapper() },
    );

    await act(async () => {
      result.current.selectRecord("Scenarios", "sc1");
    });

    act(() => {
      result.current.updateScenarioField("difficulty", "easy");
    });

    expect(result.current.scenarioWorkspace.isDirty).toBe(true);
  });
});

describe("useCreatePageState — lazy loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEffectsList.mockResolvedValue({ items: [] });
    mockSpellsList.mockResolvedValue({ items: [] });
    mockItemsList.mockResolvedValue({ items: [] });
    mockUnitsList.mockResolvedValue({ items: [] });
    mockScenariosList.mockResolvedValue({ items: [] });
    mockEffectsGet.mockRejectedValue(new Error("not found"));
    mockSpellsGet.mockRejectedValue(new Error("not found"));
    mockItemsGet.mockRejectedValue(new Error("not found"));
    mockUnitsGet.mockRejectedValue(new Error("not found"));
    mockScenariosGet.mockRejectedValue(new Error("not found"));
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

describe("useCreatePageState — loading state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEffectsList.mockResolvedValue({ items: [] });
    mockSpellsList.mockResolvedValue({ items: [] });
    mockItemsList.mockResolvedValue({ items: [] });
    mockUnitsList.mockResolvedValue({ items: [] });
    mockScenariosList.mockResolvedValue({ items: [] });
    mockEffectsGet.mockRejectedValue(new Error("not found"));
    mockSpellsGet.mockRejectedValue(new Error("not found"));
    mockItemsGet.mockRejectedValue(new Error("not found"));
    mockUnitsGet.mockRejectedValue(new Error("not found"));
    mockScenariosGet.mockRejectedValue(new Error("not found"));
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
    vi.clearAllMocks();
    mockEffectsList.mockResolvedValue({ items: [] });
    mockSpellsList.mockResolvedValue({ items: [] });
    mockItemsList.mockResolvedValue({ items: [] });
    mockUnitsList.mockResolvedValue({ items: [] });
    mockScenariosList.mockResolvedValue({ items: [] });
    mockEffectsGet.mockRejectedValue(new Error("not found"));
    mockSpellsGet.mockRejectedValue(new Error("not found"));
    mockItemsGet.mockRejectedValue(new Error("not found"));
    mockUnitsGet.mockRejectedValue(new Error("not found"));
    mockScenariosGet.mockRejectedValue(new Error("not found"));
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
    vi.clearAllMocks();
    mockEffectsList.mockResolvedValue({ items: [] });
    mockSpellsList.mockResolvedValue({ items: [] });
    mockItemsList.mockResolvedValue({ items: [] });
    mockUnitsList.mockResolvedValue({ items: [] });
    mockScenariosList.mockResolvedValue({ items: [] });
    mockEffectsGet.mockRejectedValue(new Error("not found"));
    mockSpellsGet.mockRejectedValue(new Error("not found"));
    mockItemsGet.mockRejectedValue(new Error("not found"));
    mockUnitsGet.mockRejectedValue(new Error("not found"));
    mockScenariosGet.mockRejectedValue(new Error("not found"));
  });

  it("reloads entity when entity_id URL param changes", async () => {
    mockSpellsGet
      .mockResolvedValueOnce({ id: "s1", name: "Fireball", damage: 50 })
      .mockResolvedValueOnce({ id: "s2", name: "Ice Bolt", damage: 30 });

    const search = { tab: "Spells" as const, entity_id: "s1" };
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
    mockSpellsGet.mockResolvedValueOnce({ id: "s1", name: "Fireball", damage: 50 });

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
    rerender({ search: { tab: "Spells" } });

    await waitFor(() => {
      expect(result.current.entityWorkspace.mode).toBe("idle");
      expect(result.current.entityWorkspace.entityId).toBeNull();
    });
  });

  it("reloads scenario when scenario_id URL param changes", async () => {
    mockScenariosGet
      .mockResolvedValueOnce({ id: "sc1", name: "Ambush", difficulty: "hard" })
      .mockResolvedValueOnce({ id: "sc2", name: "Siege", difficulty: "easy" });

    const search = { tab: "Scenarios" as const, scenario_id: "sc1" };
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

  it("resets scenario workspace to idle when scenario_id is removed", async () => {
    mockScenariosGet.mockResolvedValueOnce({ id: "sc1", name: "Ambush", difficulty: "hard" });

    const search = { tab: "Scenarios" as const, scenario_id: "sc1" };
    const { result, rerender } = renderHook(
      (props: { search: { tab?: string; entity_id?: string; scenario_id?: string } }) =>
        useCreatePageState(props.search, vi.fn()),
      { wrapper: createWrapper(), initialProps: { search } },
    );

    await waitFor(() => {
      expect(result.current.scenarioWorkspace.mode).toBe("edit");
    });

    // Remove scenario_id from URL
    rerender({ search: { tab: "Scenarios" } });

    await waitFor(() => {
      expect(result.current.scenarioWorkspace.mode).toBe("idle");
      expect(result.current.scenarioWorkspace.entityId).toBeNull();
    });
  });
});
