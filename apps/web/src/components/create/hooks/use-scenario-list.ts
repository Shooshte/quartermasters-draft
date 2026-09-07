import type { ScenarioListOutput } from "@qd/api-client";
import { api } from "~/lib/api";
import {
  SCENARIOS_PAGE_SIZE,
  type ScenarioLibraryLinkageFilter,
  type ScenarioSortBy,
  type ScenarioSortDir,
} from "../types";
import { useEntityList } from "./use-entity-list";

export function useScenarioList(
  isActiveTab: boolean,
  backgroundEnabled: boolean,
  linkageFilter: ScenarioLibraryLinkageFilter,
) {
  const list = useEntityList<ScenarioListOutput["items"][number], ScenarioSortBy>({
    enabled: isActiveTab || backgroundEnabled,
    initialSortBy: "name",
    pageSize: SCENARIOS_PAGE_SIZE,
    queryKey: ["scenarioBuilder", "scenarios", "list", linkageFilter],
    queryPage: ({ page, sortBy, sortDir }) =>
      api.scenarioBuilder.scenarios.list.query({
        page,
        limit: SCENARIOS_PAGE_SIZE,
        sortBy,
        sortDir,
        linkageFilter,
      }),
  });

  return {
    scenariosList: list.query,
    scenarioListItems: list.items,
    scenarioPage: list.page,
    scenarioTotalPages: list.totalPages,
    scenarioTotalCount: list.totalCount,
    scenarioSortBy: list.sortBy,
    scenarioSortDir: list.sortDir as ScenarioSortDir,
    setScenarioSort: list.setSort,
    setScenarioPage: list.setPage,
    scenarioIsFetching: list.isFetching,
  };
}
