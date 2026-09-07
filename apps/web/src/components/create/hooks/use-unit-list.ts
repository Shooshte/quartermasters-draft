import type { UnitListOutput } from "@qd/api-client";
import { api } from "~/lib/api";
import {
  type LibraryLinkageFilter,
  UNITS_PAGE_SIZE,
  type UnitSortBy,
  type UnitSortDir,
} from "../types";
import { useEntityList } from "./use-entity-list";

export function useUnitList(
  isActiveTab: boolean,
  backgroundEnabled: boolean,
  linkageFilter: LibraryLinkageFilter,
) {
  const list = useEntityList<UnitListOutput["items"][number], UnitSortBy>({
    enabled: isActiveTab || backgroundEnabled,
    initialSortBy: "name",
    pageSize: UNITS_PAGE_SIZE,
    queryKey: ["scenarioBuilder", "units", "list", linkageFilter],
    queryPage: ({ page, sortBy, sortDir }) =>
      api.scenarioBuilder.units.list.query({
        page,
        limit: UNITS_PAGE_SIZE,
        sortBy,
        sortDir,
        linkageFilter,
      }),
  });

  return {
    unitsList: list.query,
    unitListItems: list.items,
    unitPage: list.page,
    unitTotalPages: list.totalPages,
    unitTotalCount: list.totalCount,
    unitSortBy: list.sortBy,
    unitSortDir: list.sortDir as UnitSortDir,
    setUnitSort: list.setSort,
    setUnitPage: list.setPage,
    unitIsFetching: list.isFetching,
  };
}
