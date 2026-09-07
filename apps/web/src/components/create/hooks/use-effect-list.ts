import type { EffectListOutput } from "@qd/api-client";
import { api } from "~/lib/api";
import {
  EFFECTS_PAGE_SIZE,
  type EffectSortBy,
  type EffectSortDir,
  type LibraryLinkageFilter,
} from "../types";
import { useEntityList } from "./use-entity-list";

export function useEffectList(
  isActiveTab: boolean,
  backgroundEnabled: boolean,
  linkageFilter: LibraryLinkageFilter,
) {
  const list = useEntityList<EffectListOutput["items"][number], EffectSortBy>({
    enabled: isActiveTab || backgroundEnabled,
    initialSortBy: "name",
    pageSize: EFFECTS_PAGE_SIZE,
    queryKey: ["scenarioBuilder", "effects", "list", linkageFilter],
    queryPage: ({ page, sortBy, sortDir }) =>
      api.scenarioBuilder.effects.list.query({
        page,
        limit: EFFECTS_PAGE_SIZE,
        sortBy,
        sortDir,
        linkageFilter,
      }),
  });

  return {
    effectsList: list.query,
    effectListItems: list.items,
    effectPage: list.page,
    effectTotalPages: list.totalPages,
    effectTotalCount: list.totalCount,
    effectSortBy: list.sortBy,
    effectSortDir: list.sortDir as EffectSortDir,
    setEffectSort: list.setSort,
    setEffectPage: list.setPage,
    effectIsFetching: list.isFetching,
  };
}
