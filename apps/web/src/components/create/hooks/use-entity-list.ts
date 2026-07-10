import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";

export type SortDirection = "asc" | "desc";

export interface EntityListController<TItem, TSortBy extends string> {
  items: TItem[];
  page: number;
  totalCount: number;
  totalPages: number;
  sortBy: TSortBy;
  sortDir: SortDirection;
  isLoading: boolean;
  isFetching: boolean;
  setPage(page: number): void;
  setSort(sortBy: TSortBy, sortDir: SortDirection): void;
}

export function useEntityList<TItem, TSortBy extends string>(options: {
  enabled: boolean;
  initialSortBy: TSortBy;
  pageSize: number;
  queryKey: readonly unknown[];
  queryPage(input: {
    page: number;
    sortBy: TSortBy;
    sortDir: SortDirection;
  }): Promise<{ items: TItem[]; totalCount: number; limit: number }>;
}): EntityListController<TItem, TSortBy> & { query: ReturnType<typeof useQuery> } {
  const [page, setPageState] = useState(1);
  const [sortBy, setSortBy] = useState(options.initialSortBy);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const query = useQuery({
    queryKey: [...options.queryKey, page, sortBy, sortDir],
    queryFn: () => options.queryPage({ page, sortBy, sortDir }),
    enabled: options.enabled,
    placeholderData: keepPreviousData,
  });
  const data = query.data as { items: TItem[]; totalCount: number; limit: number } | undefined;
  const totalCount = data?.totalCount ?? 0;

  const setPage = useCallback((nextPage: number) => setPageState(nextPage), []);
  const setSort = useCallback((nextSortBy: TSortBy, nextSortDir: SortDirection) => {
    setSortBy(nextSortBy);
    setSortDir(nextSortDir);
    setPageState(1);
  }, []);

  return {
    query,
    items: data?.items ?? [],
    page,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / options.pageSize)),
    sortBy,
    sortDir,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    setPage,
    setSort,
  };
}
