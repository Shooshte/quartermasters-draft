import type { AppRouter } from "@qd/api";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import { useCallback, useState } from "react";
import { trpc } from "~/lib/trpc";
import {
  SPELLS_PAGE_SIZE,
  type LibraryLinkageFilter,
  type SpellSortBy,
  type SpellSortDir,
} from "../types";

export function useSpellList(
  isActiveTab: boolean,
  backgroundEnabled: boolean,
  linkageFilter: LibraryLinkageFilter,
) {
  const [spellPage, setSpellPage] = useState(1);
  const [spellSortBy, setSpellSortBy] = useState<SpellSortBy>("name");
  const [spellSortDir, setSpellSortDir] = useState<SpellSortDir>("asc");

  const spellsList = useQuery({
    queryKey: [
      "scenarioBuilder",
      "spells",
      "list",
      spellPage,
      spellSortBy,
      spellSortDir,
      linkageFilter,
    ],
    queryFn: () =>
      trpc.scenarioBuilder.spells.list.query({
        page: spellPage,
        limit: SPELLS_PAGE_SIZE,
        sortBy: spellSortBy,
        sortDir: spellSortDir,
        linkageFilter,
      }),
    enabled: isActiveTab || backgroundEnabled,
    placeholderData: keepPreviousData,
  });

  type SpellListOutput = inferRouterOutputs<AppRouter>["scenarioBuilder"]["spells"]["list"];
  const spellListItems: SpellListOutput["items"] = spellsList.data?.items ?? [];
  const spellTotalCount: SpellListOutput["totalCount"] = spellsList.data?.totalCount ?? 0;
  const spellTotalPages = Math.max(1, Math.ceil(spellTotalCount / SPELLS_PAGE_SIZE));

  const setSpellSort = useCallback((sortBy: SpellSortBy, sortDir: SpellSortDir) => {
    setSpellSortBy(sortBy);
    setSpellSortDir(sortDir);
    setSpellPage(1);
  }, []);

  const setSpellPageAction = useCallback((page: number) => {
    setSpellPage(page);
  }, []);

  return {
    spellsList,
    spellListItems,
    spellPage,
    spellTotalPages,
    spellTotalCount,
    spellSortBy,
    spellSortDir,
    setSpellSort,
    setSpellPage: setSpellPageAction,
    spellIsFetching: spellsList.isFetching,
  };
}
