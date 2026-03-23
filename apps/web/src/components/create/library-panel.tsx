import { Card, CardContent } from "~/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "~/components/ui/tabs";
import { LibraryList } from "./library-list";
import { ScenarioLibraryList } from "./scenario-library-list";
import { EffectLibraryList } from "./effect-library-list";
import { SpellLibraryList } from "./spell-library-list";
import { TABS, ENTITY_TABS, TAB_TO_SINGULAR, type TabName, type EntityTab, type ScenarioSortBy, type ScenarioSortDir, type EffectSortBy, type EffectSortDir, type SpellSortBy, type SpellSortDir } from "./types";

const GENERIC_ENTITY_TABS = ENTITY_TABS.filter((t) => t !== "Effects" && t !== "Spells") as readonly EntityTab[];

interface LibraryPanelProps {
  activeTab: TabName;
  perTabSelection: Record<TabName, string | null>;
  listData: Record<EntityTab, { items: { id: string; name: string }[] } | undefined>;
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
  spellListItems: { id: string; name: string; description: string | null; targetPolicy: string; updatedAt: Date }[];
  spellPage: number;
  spellTotalPages: number;
  spellSortBy: SpellSortBy;
  spellSortDir: SpellSortDir;
  onSpellPageChange: (page: number) => void;
  onSpellSortChange: (sortBy: SpellSortBy, sortDir: SpellSortDir) => void;
  onDeleteSpell: (id: string, name: string) => void;
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
}: LibraryPanelProps) {
  return (
    <Card data-testid="library-panel" className="flex flex-1 flex-col overflow-auto pb-0">
      <CardContent className="flex-1">
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
          <TabsContent value="Effects">
            <EffectLibraryList
              items={effectListItems}
              isLoading={listLoading.Effects}
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
          <TabsContent value="Spells">
            <SpellLibraryList
              items={spellListItems}
              isLoading={listLoading.Spells}
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
          {GENERIC_ENTITY_TABS.map((tab) => (
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
      </CardContent>
    </Card>
  );
}
