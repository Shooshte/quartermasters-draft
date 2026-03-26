import { useState, useCallback } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@qd/api";
import { trpc } from "~/lib/trpc";
import {
  type ItemSortBy,
  type ItemSortDir,
  ITEMS_PAGE_SIZE,
} from "../types";

export function useItemList(isActiveTab: boolean, backgroundEnabled: boolean) {
  const [itemPage, setItemPage] = useState(1);
  const [itemSortBy, setItemSortBy] = useState<ItemSortBy>("name");
  const [itemSortDir, setItemSortDir] = useState<ItemSortDir>("asc");

  const itemsList = useQuery({
    queryKey: ["scenarioBuilder", "items", "list", itemPage, itemSortBy, itemSortDir],
    queryFn: () => trpc.scenarioBuilder.items.list.query({
      page: itemPage,
      limit: ITEMS_PAGE_SIZE,
      sortBy: itemSortBy,
      sortDir: itemSortDir,
    }),
    enabled: isActiveTab || backgroundEnabled,
    placeholderData: keepPreviousData,
  });

  type ItemListOutput = inferRouterOutputs<AppRouter>["scenarioBuilder"]["items"]["list"];
  const itemListItems: ItemListOutput["items"] = itemsList.data?.items ?? [];
  const itemTotalCount: ItemListOutput["totalCount"] = itemsList.data?.totalCount ?? 0;
  const itemTotalPages = Math.max(1, Math.ceil(itemTotalCount / ITEMS_PAGE_SIZE));

  const setItemSort = useCallback((sortBy: ItemSortBy, sortDir: ItemSortDir) => {
    setItemSortBy(sortBy);
    setItemSortDir(sortDir);
    setItemPage(1);
  }, []);

  const setItemPageAction = useCallback((page: number) => {
    setItemPage(page);
  }, []);

  return {
    itemsList,
    itemListItems,
    itemPage,
    itemTotalPages,
    itemTotalCount,
    itemSortBy,
    itemSortDir,
    setItemSort,
    setItemPage: setItemPageAction,
    itemIsFetching: itemsList.isFetching,
  };
}
