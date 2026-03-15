import { useQuery } from "@tanstack/react-query";
import { trpc } from "~/lib/trpc";
import type { TabName, EntityTab } from "../types";

export function useEntityListQueries(activeTab: TabName, backgroundEnabled: boolean) {
  const spellsList = useQuery({
    queryKey: ["scenarioBuilder", "spells", "list"],
    queryFn: () => trpc.scenarioBuilder.spells.list.query({}),
    enabled: activeTab === "Spells" || backgroundEnabled,
  });
  const itemsList = useQuery({
    queryKey: ["scenarioBuilder", "items", "list"],
    queryFn: () => trpc.scenarioBuilder.items.list.query({}),
    enabled: activeTab === "Items" || backgroundEnabled,
  });
  const unitsList = useQuery({
    queryKey: ["scenarioBuilder", "units", "list"],
    queryFn: () => trpc.scenarioBuilder.units.list.query({}),
    enabled: activeTab === "Units" || backgroundEnabled,
  });

  const listData: Record<EntityTab, { items: { id: string; name: string }[] } | undefined> = {
    Effects: undefined,
    Spells: spellsList.data as { items: { id: string; name: string }[] } | undefined,
    Items: itemsList.data as { items: { id: string; name: string }[] } | undefined,
    Units: unitsList.data as { items: { id: string; name: string }[] } | undefined,
  };

  const entityListLoading: Record<EntityTab, boolean> = {
    Effects: false,
    Spells: spellsList.isLoading,
    Items: itemsList.isLoading,
    Units: unitsList.isLoading,
  };

  return { listData, entityListLoading };
}
