import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { describe, expect, it, vi } from "vitest";
import { useDeleteEntityDialog } from "~/components/create/hooks/use-delete-entity-dialog";
import { useEntityList } from "~/components/create/hooks/use-entity-list";

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useEntityList", () => {
  it("resets pagination when sorting changes", async () => {
    const queryPage = vi
      .fn()
      .mockResolvedValue({ items: [{ id: "one" }], totalCount: 45, limit: 20 });
    const { result } = renderHook(
      () =>
        useEntityList<{ id: string }, "name" | "updatedAt">({
          enabled: true,
          initialSortBy: "name" as const,
          pageSize: 20,
          queryKey: ["entities"],
          queryPage,
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.items).toEqual([{ id: "one" }]));
    act(() => result.current.setPage(3));
    expect(result.current.page).toBe(3);
    act(() => result.current.setSort("updatedAt", "desc"));
    expect(result.current.page).toBe(1);
    expect(result.current.sortBy).toBe("updatedAt");
    expect(result.current.sortDir).toBe("desc");
  });
});

describe("useDeleteEntityDialog", () => {
  it("closes after deleting, invalidating, and notifying the adapter", async () => {
    const deleteEntity = vi.fn().mockResolvedValue(undefined);
    const invalidate = vi.fn().mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    const { result } = renderHook(
      () =>
        useDeleteEntityDialog({
          deleteEntity,
          invalidate,
          onDeleted,
          fallbackError: "Delete failed.",
        }),
      { wrapper: createWrapper() },
    );

    act(() => result.current.request("one", "One"));
    expect(result.current.isOpen).toBe(true);
    await act(() => result.current.confirm());

    expect(deleteEntity).toHaveBeenCalledWith("one");
    expect(invalidate).toHaveBeenCalledOnce();
    expect(onDeleted).toHaveBeenCalledWith("one");
    expect(result.current.isOpen).toBe(false);
  });

  it("keeps the dialog open and exposes a mapped failure", async () => {
    const { result } = renderHook(
      () =>
        useDeleteEntityDialog({
          deleteEntity: vi.fn().mockRejectedValue(new Error("linked")),
          invalidate: vi.fn(),
          onDeleted: vi.fn(),
          fallbackError: "Delete failed.",
          mapError: () => "Entity is linked.",
        }),
      { wrapper: createWrapper() },
    );

    act(() => result.current.request("one", "One"));
    await act(() => result.current.confirm());
    expect(result.current.error).toBe("Entity is linked.");
    expect(result.current.isOpen).toBe(true);
  });

  it("ignores repeated confirmations while deletion is pending", async () => {
    let resolveDelete!: () => void;
    const pendingDelete = new Promise<void>((resolve) => {
      resolveDelete = resolve;
    });
    const deleteEntity = vi.fn().mockReturnValue(pendingDelete);
    const { result } = renderHook(
      () =>
        useDeleteEntityDialog({
          deleteEntity,
          invalidate: vi.fn().mockResolvedValue(undefined),
          onDeleted: vi.fn(),
          fallbackError: "Delete failed.",
        }),
      { wrapper: createWrapper() },
    );

    act(() => result.current.request("one", "One"));
    let firstConfirmation!: Promise<void>;
    let secondConfirmation!: Promise<void>;
    act(() => {
      firstConfirmation = result.current.confirm();
      secondConfirmation = result.current.confirm();
    });

    expect(deleteEntity).toHaveBeenCalledOnce();

    await act(async () => {
      resolveDelete();
      await Promise.all([firstConfirmation, secondConfirmation]);
    });
  });
});
