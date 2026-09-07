import type { ItemListOutput } from "@qd/api-client";
import { api } from "~/lib/api";
import {
  ITEMS_PAGE_SIZE,
  type ItemSortBy,
  type ItemSortDir,
  type LibraryLinkageFilter,
} from "../types";
import { useEntityList } from "./use-entity-list";

export function useItemList(
  isActiveTab: boolean,
  backgroundEnabled: boolean,
  linkageFilter: LibraryLinkageFilter,
) {
  const list = useEntityList<ItemListOutput["items"][number], ItemSortBy>({
    enabled: isActiveTab || backgroundEnabled,
    initialSortBy: "name",
    pageSize: ITEMS_PAGE_SIZE,
    queryKey: ["scenarioBuilder", "items", "list", linkageFilter],
    queryPage: ({ page, sortBy, sortDir }) =>
      api.scenarioBuilder.items.list.query({
        page,
        limit: ITEMS_PAGE_SIZE,
        sortBy,
        sortDir,
        linkageFilter,
      }),
  });

  return {
    itemsList: list.query,
    itemListItems: list.items,
    itemPage: list.page,
    itemTotalPages: list.totalPages,
    itemTotalCount: list.totalCount,
    itemSortBy: list.sortBy,
    itemSortDir: list.sortDir as ItemSortDir,
    setItemSort: list.setSort,
    setItemPage: list.setPage,
    itemIsFetching: list.isFetching,
  };
}
