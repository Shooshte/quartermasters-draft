import type { AppRouter } from "@qd/api";
import type { inferRouterOutputs } from "@trpc/server";
import { trpc } from "~/lib/trpc";
import {
  type LibraryLinkageFilter,
  SPELLS_PAGE_SIZE,
  type SpellSortBy,
  type SpellSortDir,
} from "../types";
import { useEntityList } from "./use-entity-list";

export function useSpellList(
  isActiveTab: boolean,
  backgroundEnabled: boolean,
  linkageFilter: LibraryLinkageFilter,
) {
  type SpellListOutput = inferRouterOutputs<AppRouter>["scenarioBuilder"]["spells"]["list"];
  const list = useEntityList<SpellListOutput["items"][number], SpellSortBy>({
    enabled: isActiveTab || backgroundEnabled,
    initialSortBy: "name",
    pageSize: SPELLS_PAGE_SIZE,
    queryKey: ["scenarioBuilder", "spells", "list", linkageFilter],
    queryPage: ({ page, sortBy, sortDir }) =>
      trpc.scenarioBuilder.spells.list.query({
        page,
        limit: SPELLS_PAGE_SIZE,
        sortBy,
        sortDir,
        linkageFilter,
      }),
  });

  return {
    spellsList: list.query,
    spellListItems: list.items,
    spellPage: list.page,
    spellTotalPages: list.totalPages,
    spellTotalCount: list.totalCount,
    spellSortBy: list.sortBy,
    spellSortDir: list.sortDir as SpellSortDir,
    setSpellSort: list.setSort,
    setSpellPage: list.setPage,
    spellIsFetching: list.isFetching,
  };
}
