import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreatePageNavigate, CreatePageSearch } from "~/components/create/types";

const { mockQuery, mockListQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockListQuery: vi.fn().mockResolvedValue({ items: [] }),
}));

vi.mock("~/lib/trpc", () => {
  const createRouterProxy = () => ({
    list: { query: mockListQuery },
    get: { query: mockQuery },
  });
  return {
    trpc: {
      scenarioBuilder: {
        effects: createRouterProxy(),
        items: createRouterProxy(),
        units: createRouterProxy(),
        scenarios: createRouterProxy(),
      },
    },
  };
});

import { useCreatePageState } from "~/components/create/use-create-page-state";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("URL parameter sync", () => {
  let navigate: CreatePageNavigate & ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    navigate = vi.fn() as unknown as CreatePageNavigate & ReturnType<typeof vi.fn>;
    mockQuery.mockRejectedValue(new Error("not found"));
    mockListQuery.mockResolvedValue({ items: [] });
  });

  it("setActiveTab calls navigate with updated tab", () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, navigate), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setActiveTab("Items");
    });

    expect(navigate).toHaveBeenCalledWith({
      search: expect.any(Function),
      replace: true,
    });

    // Verify the search function produces the correct params
    const searchFn = navigate.mock.calls[0][0].search;
    const result2 = searchFn({ entity_id: "abc", scenario_id: "def" });
    expect(result2).toEqual({ entity_id: "abc", scenario_id: "def", tab: "Items" });
  });

  it("selectRecord for entity calls navigate with entity_id", async () => {
    mockQuery.mockResolvedValueOnce({ id: "e1", name: "Test Effect" });

    const { result } = renderHook(() => useCreatePageState({ tab: "Effects" }, navigate), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Effects", "e1");
    });

    expect(navigate).toHaveBeenCalledWith({
      search: expect.any(Function),
      replace: true,
    });

    const searchFn = navigate.mock.calls[0][0].search;
    const result2 = searchFn({ tab: "Effects" });
    expect(result2).toEqual({ tab: "Effects", effect_id: "e1" });
  });

  it("selectRecord for scenario calls navigate with scenario_id", async () => {
    mockQuery.mockResolvedValueOnce({ id: "s1", name: "Test Scenario" });

    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, navigate), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Scenarios", "s1");
    });

    expect(navigate).toHaveBeenCalledWith({
      search: expect.any(Function),
      replace: true,
    });

    const searchFn = navigate.mock.calls[0][0].search;
    const result2 = searchFn({ tab: "Scenarios" });
    expect(result2).toEqual({ tab: "Scenarios", scenario_id: "s1" });
  });

  it("selectRecord for item calls navigate with item_id", async () => {
    mockQuery.mockResolvedValueOnce({ id: "i1", name: "Test Item" });

    const { result } = renderHook(() => useCreatePageState({ tab: "Items" }, navigate), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Items", "i1");
    });

    expect(navigate).toHaveBeenCalledWith({
      search: expect.any(Function),
      replace: true,
    });

    const searchFn = navigate.mock.calls[0][0].search;
    const result2 = searchFn({ tab: "Items" });
    expect(result2).toEqual({ tab: "Items", item_id: "i1" });
  });

  it("selectRecord for unit calls navigate with unit_id", async () => {
    mockQuery.mockResolvedValueOnce({ id: "u1", name: "Test Unit" });

    const { result } = renderHook(() => useCreatePageState({ tab: "Units" }, navigate), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.selectRecord("Units", "u1");
    });

    expect(navigate).toHaveBeenCalledWith({
      search: expect.any(Function),
      replace: true,
    });

    const searchFn = navigate.mock.calls[0][0].search;
    const result2 = searchFn({ tab: "Units" });
    expect(result2).toEqual({ tab: "Units", unit_id: "u1" });
  });

  it("createNew for item removes item_id from URL", () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Items" }, navigate), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.createNew("Items");
    });

    expect(navigate).toHaveBeenCalledWith({
      search: expect.any(Function),
      replace: true,
    });

    const searchFn = navigate.mock.calls[0][0].search;
    const result2 = searchFn({ tab: "Items", item_id: "old-id", scenario_id: "s1" });
    expect(result2).not.toHaveProperty("item_id");
    expect(result2).toHaveProperty("scenario_id", "s1");
  });

  it("createNew for unit removes unit_id from URL", () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Units" }, navigate), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.createNew("Units");
    });

    expect(navigate).toHaveBeenCalledWith({
      search: expect.any(Function),
      replace: true,
    });

    const searchFn = navigate.mock.calls[0][0].search;
    const result2 = searchFn({ tab: "Units", unit_id: "old-id", scenario_id: "s1" });
    expect(result2).not.toHaveProperty("unit_id");
    expect(result2).toHaveProperty("scenario_id", "s1");
  });

  it("createNew for scenario removes scenario_id from URL", () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, navigate), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.createNew("Scenarios");
    });

    expect(navigate).toHaveBeenCalledWith({
      search: expect.any(Function),
      replace: true,
    });

    const searchFn = navigate.mock.calls[0][0].search;
    const result2 = searchFn({ tab: "Scenarios", entity_id: "e1", scenario_id: "old-id" });
    expect(result2).not.toHaveProperty("scenario_id");
    expect(result2).toHaveProperty("entity_id", "e1");
  });

  it("tab change preserves existing entity_id and scenario_id", () => {
    const { result } = renderHook(() => useCreatePageState({ tab: "Scenarios" }, navigate), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setActiveTab("Items");
    });

    const searchFn = navigate.mock.calls[0][0].search;
    const result2 = searchFn({ tab: "Scenarios", entity_id: "e1", scenario_id: "s1" });
    expect(result2).toEqual({ tab: "Items", entity_id: "e1", scenario_id: "s1" });
  });

  it("ignores a legacy spell_id without querying or creating a workspace", () => {
    const legacySearch = { spell_id: "removed-id" } as CreatePageSearch;
    const { result } = renderHook(() => useCreatePageState(legacySearch, navigate), {
      wrapper: createWrapper(),
    });

    expect(mockQuery).not.toHaveBeenCalled();
    expect(result.current.entityWorkspace.mode).toBe("idle");
    expect(result.current.entityWorkspace.entityType).toBeNull();
  });
});
