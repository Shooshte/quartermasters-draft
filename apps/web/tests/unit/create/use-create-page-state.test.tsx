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
