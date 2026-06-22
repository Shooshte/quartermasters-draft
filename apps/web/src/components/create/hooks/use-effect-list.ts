import type { AppRouter } from "@qd/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useCallback, useState } from "react";
import { trpc } from "~/lib/trpc";
import { EFFECTS_PAGE_SIZE, type EffectSortBy, type EffectSortDir } from "../types";

export function useEffectList(isActiveTab: boolean, backgroundEnabled: boolean) {
  const [effectPage, setEffectPage] = useState(1);
  const [effectSortBy, setEffectSortBy] = useState<EffectSortBy>("name");
  const [effectSortDir, setEffectSortDir] = useState<EffectSortDir>("asc");

  const effectsList = useQuery({
    queryKey: ["scenarioBuilder", "effects", "list", effectPage, effectSortBy, effectSortDir],
    queryFn: () =>
      trpc.scenarioBuilder.effects.list.query({
        page: effectPage,
        limit: EFFECTS_PAGE_SIZE,
        sortBy: effectSortBy,
        sortDir: effectSortDir,
      }),
    enabled: isActiveTab || backgroundEnabled,
    placeholderData: keepPreviousData,
  });

  type EffectListOutput = inferRouterOutputs<AppRouter>["scenarioBuilder"]["effects"]["list"];
  const effectListItems: EffectListOutput["items"] = effectsList.data?.items ?? [];
  const effectTotalCount: EffectListOutput["totalCount"] = effectsList.data?.totalCount ?? 0;
  const effectTotalPages = Math.max(1, Math.ceil(effectTotalCount / EFFECTS_PAGE_SIZE));

  const setEffectSort = useCallback((sortBy: EffectSortBy, sortDir: EffectSortDir) => {
    setEffectSortBy(sortBy);
    setEffectSortDir(sortDir);
    setEffectPage(1);
  }, []);

  const setEffectPageAction = useCallback((page: number) => {
    setEffectPage(page);
  }, []);

  return {
    effectsList,
    effectListItems,
    effectPage,
    effectTotalPages,
    effectTotalCount,
    effectSortBy,
    effectSortDir,
    setEffectSort,
    setEffectPage: setEffectPageAction,
    effectIsFetching: effectsList.isFetching,
  };
}
