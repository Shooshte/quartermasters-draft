import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { LibraryList } from "./library-list";
import { TABS, TAB_TO_SINGULAR, type TabName } from "./types";

interface LibraryPanelProps {
  activeTab: TabName;
  perTabSelection: Record<TabName, string | null>;
  listData: Record<TabName, { items: { id: string; name: string }[] } | undefined>;
  listLoading: Record<TabName, boolean>;
  onTabChange: (tab: TabName) => void;
  onSelectRecord: (tab: TabName, id: string) => void;
  onCreateNew: (tab: TabName) => void;
}

export function LibraryPanel({
  activeTab,
  perTabSelection,
  listData,
  listLoading,
  onTabChange,
  onSelectRecord,
  onCreateNew,
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
        {TABS.map((tab) => (
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
      </Tabs>
    </div>
  );
}
