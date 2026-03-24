import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@qd/api";
import { trpc } from "~/lib/trpc";
import {
  type SpellSortBy,
  type SpellSortDir,
  SPELLS_PAGE_SIZE,
} from "../types";

export function useSpellList(isActiveTab: boolean, backgroundEnabled: boolean) {
  const [spellPage, setSpellPage] = useState(1);
  const [spellSortBy, setSpellSortBy] = useState<SpellSortBy>("name");
  const [spellSortDir, setSpellSortDir] = useState<SpellSortDir>("asc");

  const spellsList = useQuery({
    queryKey: ["scenarioBuilder", "spells", "list", spellPage, spellSortBy, spellSortDir],
    queryFn: () => trpc.scenarioBuilder.spells.list.query({
      page: spellPage,
      limit: SPELLS_PAGE_SIZE,
      sortBy: spellSortBy,
      sortDir: spellSortDir,
    }),
    enabled: isActiveTab || backgroundEnabled,
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
  };
}
