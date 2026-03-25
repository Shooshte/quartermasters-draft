import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@qd/api";
import { trpc } from "~/lib/trpc";
import {
  type UnitSortBy,
  type UnitSortDir,
  UNITS_PAGE_SIZE,
} from "../types";

export function useUnitList(isActiveTab: boolean, backgroundEnabled: boolean) {
  const [unitPage, setUnitPage] = useState(1);
  const [unitSortBy, setUnitSortBy] = useState<UnitSortBy>("name");
  const [unitSortDir, setUnitSortDir] = useState<UnitSortDir>("asc");

  const unitsList = useQuery({
    queryKey: ["scenarioBuilder", "units", "list", unitPage, unitSortBy, unitSortDir],
    queryFn: () => trpc.scenarioBuilder.units.list.query({
      page: unitPage,
      limit: UNITS_PAGE_SIZE,
      sortBy: unitSortBy,
      sortDir: unitSortDir,
    }),
    enabled: isActiveTab || backgroundEnabled,
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
  };
}
