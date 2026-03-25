import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

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
        spells: createRouterProxy(),
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
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

describe("URL parameter sync", () => {
  let navigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    navigate = vi.fn();
    mockQuery.mockRejectedValue(new Error("not found"));
    mockListQuery.mockResolvedValue({ items: [] });
  });

  it("setActiveTab calls navigate with updated tab", () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, navigate),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setActiveTab("Spells");
    });

    expect(navigate).toHaveBeenCalledWith({
      search: expect.any(Function),
      replace: true,
    });

    // Verify the search function produces the correct params
    const searchFn = navigate.mock.calls[0][0].search;
    const result2 = searchFn({ entity_id: "abc", scenario_id: "def" });
    expect(result2).toEqual({ entity_id: "abc", scenario_id: "def", tab: "Spells" });
  });

  it("selectRecord for entity calls navigate with entity_id", async () => {
    mockQuery.mockResolvedValueOnce({ id: "e1", name: "Test Effect" });

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Effects" }, navigate),
      { wrapper: createWrapper() },
    );

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

    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, navigate),
      { wrapper: createWrapper() },
    );

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

  it("createNew for item removes item_id from URL", () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Items" }, navigate),
      { wrapper: createWrapper() },
    );

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

  it("createNew for spell removes spell_id from URL", () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Spells" }, navigate),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.createNew("Spells");
    });

    expect(navigate).toHaveBeenCalledWith({
      search: expect.any(Function),
      replace: true,
    });

    const searchFn = navigate.mock.calls[0][0].search;
    const result2 = searchFn({ tab: "Spells", spell_id: "old-id", scenario_id: "s1" });
    expect(result2).not.toHaveProperty("spell_id");
    expect(result2).toHaveProperty("scenario_id", "s1");
  });

  it("createNew for scenario removes scenario_id from URL", () => {
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, navigate),
      { wrapper: createWrapper() },
    );

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
    const { result } = renderHook(
      () => useCreatePageState({ tab: "Scenarios" }, navigate),
      { wrapper: createWrapper() },
    );

    act(() => {
      result.current.setActiveTab("Items");
    });

    const searchFn = navigate.mock.calls[0][0].search;
    const result2 = searchFn({ tab: "Scenarios", entity_id: "e1", scenario_id: "s1" });
    expect(result2).toEqual({ tab: "Items", entity_id: "e1", scenario_id: "s1" });
  });
});
