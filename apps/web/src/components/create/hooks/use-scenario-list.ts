import type { AppRouter } from "@qd/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useCallback, useState } from "react";
import { trpc } from "~/lib/trpc";
import { SCENARIOS_PAGE_SIZE, type ScenarioSortBy, type ScenarioSortDir } from "../types";

export function useScenarioList(isActiveTab: boolean, backgroundEnabled: boolean) {
  const [scenarioPage, setScenarioPage] = useState(1);
  const [scenarioSortBy, setScenarioSortBy] = useState<ScenarioSortBy>("name");
  const [scenarioSortDir, setScenarioSortDir] = useState<ScenarioSortDir>("asc");

  const scenariosList = useQuery({
    queryKey: [
      "scenarioBuilder",
      "scenarios",
      "list",
      scenarioPage,
      scenarioSortBy,
      scenarioSortDir,
    ],
    queryFn: () =>
      trpc.scenarioBuilder.scenarios.list.query({
        page: scenarioPage,
        limit: SCENARIOS_PAGE_SIZE,
        sortBy: scenarioSortBy,
        sortDir: scenarioSortDir,
      }),
    enabled: isActiveTab || backgroundEnabled,
    placeholderData: keepPreviousData,
  });

  type ScenarioListOutput = inferRouterOutputs<AppRouter>["scenarioBuilder"]["scenarios"]["list"];
  const scenarioListItems: ScenarioListOutput["items"] = scenariosList.data?.items ?? [];
  const scenarioTotalCount: ScenarioListOutput["totalCount"] = scenariosList.data?.totalCount ?? 0;
  const scenarioTotalPages = Math.max(1, Math.ceil(scenarioTotalCount / SCENARIOS_PAGE_SIZE));

  const setScenarioSort = useCallback((sortBy: ScenarioSortBy, sortDir: ScenarioSortDir) => {
    setScenarioSortBy(sortBy);
    setScenarioSortDir(sortDir);
    setScenarioPage(1);
  }, []);

  const setScenarioPageAction = useCallback((page: number) => {
    setScenarioPage(page);
  }, []);

  return {
    scenariosList,
    scenarioListItems,
    scenarioPage,
    scenarioTotalPages,
    scenarioTotalCount,
    scenarioSortBy,
    scenarioSortDir,
    setScenarioSort,
    setScenarioPage: setScenarioPageAction,
    scenarioIsFetching: scenariosList.isFetching,
  };
}
