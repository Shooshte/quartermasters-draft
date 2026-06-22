import type { AppRouter } from "@qd/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useCallback, useState } from "react";
import { trpc } from "~/lib/trpc";
import { UNITS_PAGE_SIZE, type UnitSortBy, type UnitSortDir } from "../types";

export function useUnitList(isActiveTab: boolean, backgroundEnabled: boolean) {
  const [unitPage, setUnitPage] = useState(1);
  const [unitSortBy, setUnitSortBy] = useState<UnitSortBy>("name");
  const [unitSortDir, setUnitSortDir] = useState<UnitSortDir>("asc");

  const unitsList = useQuery({
    queryKey: ["scenarioBuilder", "units", "list", unitPage, unitSortBy, unitSortDir],
    queryFn: () =>
      trpc.scenarioBuilder.units.list.query({
        page: unitPage,
        limit: UNITS_PAGE_SIZE,
        sortBy: unitSortBy,
        sortDir: unitSortDir,
      }),
    enabled: isActiveTab || backgroundEnabled,
    placeholderData: keepPreviousData,
  });

  type UnitListOutput = inferRouterOutputs<AppRouter>["scenarioBuilder"]["units"]["list"];
  const unitListItems: UnitListOutput["items"] = unitsList.data?.items ?? [];
  const unitTotalCount: UnitListOutput["totalCount"] = unitsList.data?.totalCount ?? 0;
  const unitTotalPages = Math.max(1, Math.ceil(unitTotalCount / UNITS_PAGE_SIZE));

  const setUnitSort = useCallback((sortBy: UnitSortBy, sortDir: UnitSortDir) => {
    setUnitSortBy(sortBy);
    setUnitSortDir(sortDir);
    setUnitPage(1);
  }, []);

  const setUnitPageAction = useCallback((page: number) => {
    setUnitPage(page);
  }, []);

  return {
    unitsList,
    unitListItems,
    unitPage,
    unitTotalPages,
    unitTotalCount,
    unitSortBy,
    unitSortDir,
    setUnitSort,
    setUnitPage: setUnitPageAction,
    unitIsFetching: unitsList.isFetching,
  };
}
