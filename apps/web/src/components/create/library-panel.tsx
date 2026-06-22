import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { Select } from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { EffectLibraryList } from "./effect-library-list";
import { ItemLibraryList } from "./item-library-list";
import { ScenarioLibraryList } from "./scenario-library-list";
import { SpellLibraryList } from "./spell-library-list";
import {
  type EffectSortBy,
  type EffectSortDir,
  type ItemSortBy,
  type ItemSortDir,
  type LibraryLinkageFilter,
  type ScenarioSortBy,
  type ScenarioSortDir,
  type SpellSortBy,
  type SpellSortDir,
  TABS,
  type TabName,
  type UnitSortBy,
  type UnitSortDir,
} from "./types";
import { UnitLibraryList } from "./unit-library-list";

interface LibraryPanelProps {
  activeTab: TabName;
  linkageFilter: LibraryLinkageFilter;
  scenarioFilterOptions: { id: string; name: string }[];
  perTabSelection: Record<TabName, string | null>;
  listLoading: Record<TabName, boolean>;
  listFetching: Record<TabName, boolean>;
  onTabChange: (tab: TabName) => void;
  onLinkageFilterChange: (filter: LibraryLinkageFilter) => void;
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

function LibraryLinkageToolbar({
  activeTab,
  linkageFilter,
  scenarioFilterOptions,
  onLinkageFilterChange,
}: {
  activeTab: TabName;
  linkageFilter: LibraryLinkageFilter;
  scenarioFilterOptions: { id: string; name: string }[];
  onLinkageFilterChange: (filter: LibraryLinkageFilter) => void;
}) {
  const effectiveMode =
    activeTab === "Scenarios" && linkageFilter.mode === "scenario" ? "all" : linkageFilter.mode;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-3">
      <div className="inline-flex overflow-hidden rounded-md border border-input">
        {(
          [
            ["all", "All"],
            ["linked", "Linked"],
            ["unlinked", "Unlinked"],
          ] as const
        ).map(([mode, label]) => (
          <Button
            key={mode}
            type="button"
            variant={effectiveMode === mode ? "default" : "ghost"}
            size="sm"
            className="h-8 rounded-none border-0 px-3 shadow-none"
            onClick={() => onLinkageFilterChange({ mode })}
          >
            {label}
          </Button>
        ))}
      </div>
      {activeTab !== "Scenarios" && (
        <Select
          aria-label="Filter by scenario"
          className="h-8 w-[190px]"
          value={linkageFilter.mode === "scenario" ? linkageFilter.scenarioId : ""}
          onChange={(event) => {
            const scenarioId = event.currentTarget.value;
            if (scenarioId) {
              onLinkageFilterChange({ mode: "scenario", scenarioId });
            }
          }}
        >
          <option value="">Scenario...</option>
          {scenarioFilterOptions.map((scenario) => (
            <option key={scenario.id} value={scenario.id}>
              {scenario.name}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}

export function LibraryPanel({
  activeTab,
  linkageFilter,
  scenarioFilterOptions,
  perTabSelection,
  listLoading,
  listFetching,
  onTabChange,
  onLinkageFilterChange,
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
  const tabContentByName: Record<TabName, ReactNode> = {
    Effects: (
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
        onDelete={onDeleteEffect}
        onPageChange={onEffectPageChange}
        onSortChange={onEffectSortChange}
      />
    ),
    Spells: (
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
        onDelete={onDeleteSpell}
        onPageChange={onSpellPageChange}
        onSortChange={onSpellSortChange}
      />
    ),
    Items: (
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
        onDelete={onDeleteItem}
        onPageChange={onItemPageChange}
        onSortChange={onItemSortChange}
      />
    ),
    Units: (
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
        onDelete={onDeleteUnit}
        onPageChange={onUnitPageChange}
        onSortChange={onUnitSortChange}
      />
    ),
    Scenarios: (
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
        onDelete={onDeleteScenario}
        onPageChange={onScenarioPageChange}
        onSortChange={onScenarioSortChange}
      />
    ),
  };

  return (
    <div data-testid="library-panel" className="flex flex-1 flex-col overflow-hidden">
      <Tabs
        value={activeTab}
        onValueChange={(val) => onTabChange(val as TabName)}
        className="flex flex-1 flex-col min-h-0"
      >
        <TabsList variant="banner" data-testid="library-tabs-header">
          {TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
        <LibraryLinkageToolbar
          activeTab={activeTab}
          linkageFilter={linkageFilter}
          scenarioFilterOptions={scenarioFilterOptions}
          onLinkageFilterChange={onLinkageFilterChange}
        />
        {TABS.map((tab) => (
          <TabsContent key={tab} value={tab} className="flex-1 min-h-0 overflow-auto p-4">
            {tabContentByName[tab]}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
