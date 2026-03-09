import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { LibraryList } from "./library-list";
import { ScenarioLibraryList } from "./scenario-library-list";
import { TABS, ENTITY_TABS, TAB_TO_SINGULAR, type TabName, type ScenarioSortBy, type ScenarioSortDir } from "./types";

interface LibraryPanelProps {
  activeTab: TabName;
  perTabSelection: Record<TabName, string | null>;
  listData: Record<TabName, { items: { id: string; name: string }[] } | undefined>;
  listLoading: Record<TabName, boolean>;
  onTabChange: (tab: TabName) => void;
  onSelectRecord: (tab: TabName, id: string) => void;
  onCreateNew: (tab: TabName) => void;
  // Scenario-specific props
  scenarioListItems: { id: string; name: string; updatedAt: Date; createdAt: Date }[];
  scenarioPage: number;
  scenarioTotalPages: number;
  scenarioSortBy: ScenarioSortBy;
  scenarioSortDir: ScenarioSortDir;
  onScenarioPageChange: (page: number) => void;
  onScenarioSortChange: (sortBy: ScenarioSortBy, sortDir: ScenarioSortDir) => void;
  onDeleteScenario: (id: string, name: string) => void;
}

export function LibraryPanel({
  activeTab,
  perTabSelection,
  listData,
  listLoading,
  onTabChange,
  onSelectRecord,
  onCreateNew,
  scenarioListItems,
  scenarioPage,
  scenarioTotalPages,
  scenarioSortBy,
  scenarioSortDir,
  onScenarioPageChange,
  onScenarioSortChange,
  onDeleteScenario,
}: LibraryPanelProps) {
  return (
    <div data-testid="library-panel">
      <Tabs
        value={activeTab}
        onValueChange={(val) => onTabChange(val as TabName)}
      >
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
        {ENTITY_TABS.map((tab) => (
          <TabsContent key={tab} value={tab}>
            <LibraryList
              items={listData[tab]?.items ?? []}
              isLoading={listLoading[tab]}
              selectedId={perTabSelection[tab]}
              singularLabel={TAB_TO_SINGULAR[tab]}
              onSelect={(id) => onSelectRecord(tab, id)}
              onCreateNew={() => onCreateNew(tab)}
            />
          </TabsContent>
        ))}
        <TabsContent value="Scenarios">
          <ScenarioLibraryList
            items={scenarioListItems}
            isLoading={listLoading.Scenarios}
            selectedId={perTabSelection.Scenarios}
            page={scenarioPage}
            totalPages={scenarioTotalPages}
            sortBy={scenarioSortBy}
            sortDir={scenarioSortDir}
            onSelect={(id) => onSelectRecord("Scenarios", id)}
            onCreateNew={() => onCreateNew("Scenarios")}
            onDelete={(id) => {
              const item = scenarioListItems.find((s) => s.id === id);
              onDeleteScenario(id, item?.name ?? "");
            }}
            onPageChange={onScenarioPageChange}
            onSortChange={onScenarioSortChange}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
