import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { ScenarioLibraryList } from "./scenario-library-list";
import { EffectLibraryList } from "./effect-library-list";
import { SpellLibraryList } from "./spell-library-list";
import { ItemLibraryList } from "./item-library-list";
import { UnitLibraryList } from "./unit-library-list";
import { TABS, type TabName, type ScenarioSortBy, type ScenarioSortDir, type EffectSortBy, type EffectSortDir, type SpellSortBy, type SpellSortDir, type ItemSortBy, type ItemSortDir, type UnitSortBy, type UnitSortDir } from "./types";

interface LibraryPanelProps {
  activeTab: TabName;
  perTabSelection: Record<TabName, string | null>;
  listLoading: Record<TabName, boolean>;
  listFetching: Record<TabName, boolean>;
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
  // Effect-specific props
  effectListItems: { id: string; name: string; timingType: string; effectType: string }[];
  effectPage: number;
  effectTotalPages: number;
  effectSortBy: EffectSortBy;
  effectSortDir: EffectSortDir;
  onEffectPageChange: (page: number) => void;
  onEffectSortChange: (sortBy: EffectSortBy, sortDir: EffectSortDir) => void;
  onDeleteEffect: (id: string, name: string) => void;
  // Spell-specific props
  spellListItems: { id: string; name: string; targetPolicy: string; updatedAt: Date }[];
  spellPage: number;
  spellTotalPages: number;
  spellSortBy: SpellSortBy;
  spellSortDir: SpellSortDir;
  onSpellPageChange: (page: number) => void;
  onSpellSortChange: (sortBy: SpellSortBy, sortDir: SpellSortDir) => void;
  onDeleteSpell: (id: string, name: string) => void;
  // Item-specific props
  itemListItems: { id: string; name: string; updatedAt: Date }[];
  itemPage: number;
  itemTotalPages: number;
  itemSortBy: ItemSortBy;
  itemSortDir: ItemSortDir;
  onItemPageChange: (page: number) => void;
  onItemSortChange: (sortBy: ItemSortBy, sortDir: ItemSortDir) => void;
  onDeleteItem: (id: string, name: string) => void;
  // Unit-specific props
  unitListItems: { id: string; name: string; updatedAt: Date }[];
  unitPage: number;
  unitTotalPages: number;
  unitSortBy: UnitSortBy;
  unitSortDir: UnitSortDir;
  onUnitPageChange: (page: number) => void;
  onUnitSortChange: (sortBy: UnitSortBy, sortDir: UnitSortDir) => void;
  onDeleteUnit: (id: string, name: string) => void;
}

export function LibraryPanel({
  activeTab,
  perTabSelection,
  listLoading,
  listFetching,
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
  effectListItems,
  effectPage,
  effectTotalPages,
  effectSortBy,
  effectSortDir,
  onEffectPageChange,
  onEffectSortChange,
  onDeleteEffect,
  spellListItems,
  spellPage,
  spellTotalPages,
  spellSortBy,
  spellSortDir,
  onSpellPageChange,
  onSpellSortChange,
  onDeleteSpell,
  itemListItems,
  itemPage,
  itemTotalPages,
  itemSortBy,
  itemSortDir,
  onItemPageChange,
  onItemSortChange,
  onDeleteItem,
  unitListItems,
  unitPage,
  unitTotalPages,
  unitSortBy,
  unitSortDir,
  onUnitPageChange,
  onUnitSortChange,
  onDeleteUnit,
}: LibraryPanelProps) {
  return (
    <div data-testid="library-panel" className="flex flex-1 flex-col overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(val) => onTabChange(val as TabName)}
        className="flex flex-1 flex-col min-h-0"
      >
          <TabsList variant="banner">
            {TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value="Effects" className="flex-1 min-h-0 overflow-auto p-4">
            <EffectLibraryList
              items={effectListItems}
              isLoading={listLoading.Effects}
              isFetching={listFetching.Effects}
              selectedId={perTabSelection.Effects}
              page={effectPage}
              totalPages={effectTotalPages}
              sortBy={effectSortBy}
              sortDir={effectSortDir}
              onSelect={(id) => onSelectRecord("Effects", id)}
              onCreateNew={() => onCreateNew("Effects")}
              onDelete={(id) => {
                const item = effectListItems.find((e) => e.id === id);
                onDeleteEffect(id, item?.name ?? "");
              }}
              onPageChange={onEffectPageChange}
              onSortChange={onEffectSortChange}
            />
          </TabsContent>
          <TabsContent value="Spells" className="flex-1 min-h-0 overflow-auto p-4">
            <SpellLibraryList
              items={spellListItems}
              isLoading={listLoading.Spells}
              isFetching={listFetching.Spells}
              selectedId={perTabSelection.Spells}
              page={spellPage}
              totalPages={spellTotalPages}
              sortBy={spellSortBy}
              sortDir={spellSortDir}
              onSelect={(id) => onSelectRecord("Spells", id)}
              onCreateNew={() => onCreateNew("Spells")}
              onDelete={(id) => {
                const item = spellListItems.find((s) => s.id === id);
                onDeleteSpell(id, item?.name ?? "");
              }}
              onPageChange={onSpellPageChange}
              onSortChange={onSpellSortChange}
            />
          </TabsContent>
          <TabsContent value="Items" className="flex-1 min-h-0 overflow-auto p-4">
            <ItemLibraryList
              items={itemListItems}
              isLoading={listLoading.Items}
              isFetching={listFetching.Items}
              selectedId={perTabSelection.Items}
              page={itemPage}
              totalPages={itemTotalPages}
              sortBy={itemSortBy}
              sortDir={itemSortDir}
              onSelect={(id) => onSelectRecord("Items", id)}
              onCreateNew={() => onCreateNew("Items")}
              onDelete={(id) => {
                const item = itemListItems.find((i) => i.id === id);
                onDeleteItem(id, item?.name ?? "");
              }}
              onPageChange={onItemPageChange}
              onSortChange={onItemSortChange}
            />
          </TabsContent>
          <TabsContent value="Units" className="flex-1 min-h-0 overflow-auto p-4">
            <UnitLibraryList
              items={unitListItems}
              isLoading={listLoading.Units}
              isFetching={listFetching.Units}
              selectedId={perTabSelection.Units}
              page={unitPage}
              totalPages={unitTotalPages}
              sortBy={unitSortBy}
              sortDir={unitSortDir}
              onSelect={(id) => onSelectRecord("Units", id)}
              onCreateNew={() => onCreateNew("Units")}
              onDelete={(id) => {
                const item = unitListItems.find((u) => u.id === id);
                onDeleteUnit(id, item?.name ?? "");
              }}
              onPageChange={onUnitPageChange}
              onSortChange={onUnitSortChange}
            />
          </TabsContent>
          <TabsContent value="Scenarios" className="flex-1 min-h-0 overflow-auto p-4">
            <ScenarioLibraryList
              items={scenarioListItems}
              isLoading={listLoading.Scenarios}
              isFetching={listFetching.Scenarios}
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
