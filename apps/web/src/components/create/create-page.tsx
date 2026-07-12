import { useNavigate } from "@tanstack/react-router";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import { EntityWorkspace } from "./entity-workspace";
import { LibraryPanel } from "./library-panel";
import { ScenarioWorkspace } from "./scenario-workspace";
import type { CreatePageNavigate } from "./types";
import { UnsavedChangesDialog } from "./unsaved-changes-dialog";
import { useCreatePageState } from "./use-create-page-state";

interface CreatePageProps {
  search: {
    tab?: string;
    entity_id?: string;
    effect_id?: string;
    spell_id?: string;
    scenario_id?: string;
    item_id?: string;
    unit_id?: string;
  };
}

export function CreatePage({ search }: CreatePageProps) {
  const navigate = useNavigate();
  const navigateWithSearchUpdate: CreatePageNavigate = (opts) =>
    navigate(opts as Parameters<typeof navigate>[0]);
  const state = useCreatePageState(search, navigateWithSearchUpdate);
  const { domains, navigation, options, workspaces } = state;
  const deleteDialogs = [
    {
      open: domains.scenarios.deletion.isOpen,
      entityName: domains.scenarios.deletion.target?.name ?? "",
      entityLabel: "scenario",
      errorMessage: domains.scenarios.deletion.error,
      onCancel: domains.scenarios.deletion.cancel,
      onConfirm: domains.scenarios.deletion.confirm,
    },
    {
      open: domains.effects.deletion.isOpen,
      entityName: domains.effects.deletion.target?.name ?? "",
      entityLabel: "effect",
      errorMessage: domains.effects.deletion.error,
      onCancel: domains.effects.deletion.cancel,
      onConfirm: domains.effects.deletion.confirm,
    },
    {
      open: domains.spells.deletion.isOpen,
      entityName: domains.spells.deletion.target?.name ?? "",
      entityLabel: "spell",
      errorMessage: domains.spells.deletion.error,
      onCancel: domains.spells.deletion.cancel,
      onConfirm: domains.spells.deletion.confirm,
    },
    {
      open: domains.items.deletion.isOpen,
      entityName: domains.items.deletion.target?.name ?? "",
      entityLabel: "item",
      errorMessage: domains.items.deletion.error,
      onCancel: domains.items.deletion.cancel,
      onConfirm: domains.items.deletion.confirm,
    },
    {
      open: domains.units.deletion.isOpen,
      entityName: domains.units.deletion.target?.name ?? "",
      entityLabel: "unit",
      errorMessage: domains.units.deletion.error,
      onCancel: domains.units.deletion.cancel,
      onConfirm: domains.units.deletion.confirm,
    },
  ];

  return (
    <main className="flex flex-1 min-h-0 overflow-hidden">
      <div className="flex w-[42%] min-w-0 flex-col border-r border-border/50">
        <LibraryPanel
          activeTab={state.activeTab}
          linkageFilter={state.linkageFilter}
          scenarioFilterOptions={options.scenarioFilters}
          perTabSelection={navigation.perTabSelection}
          listLoading={state.listLoading}
          listFetching={state.listFetching}
          onTabChange={state.setActiveTab}
          onLinkageFilterChange={state.setLinkageFilter}
          onSelectRecord={navigation.selectRecord}
          onCreateNew={navigation.createNew}
          scenarioListItems={domains.scenarios.list.items}
          scenarioPage={domains.scenarios.list.page}
          scenarioTotalPages={domains.scenarios.list.totalPages}
          scenarioSortBy={domains.scenarios.list.sortBy}
          scenarioSortDir={domains.scenarios.list.sortDir}
          onScenarioPageChange={domains.scenarios.list.setPage}
          onScenarioSortChange={domains.scenarios.list.setSort}
          onDeleteScenario={domains.scenarios.deletion.request}
          effectListItems={domains.effects.list.items}
          effectPage={domains.effects.list.page}
          effectTotalPages={domains.effects.list.totalPages}
          effectSortBy={domains.effects.list.sortBy}
          effectSortDir={domains.effects.list.sortDir}
          onEffectPageChange={domains.effects.list.setPage}
          onEffectSortChange={domains.effects.list.setSort}
          onDeleteEffect={domains.effects.deletion.request}
          spellListItems={domains.spells.list.items}
          spellPage={domains.spells.list.page}
          spellTotalPages={domains.spells.list.totalPages}
          spellSortBy={domains.spells.list.sortBy}
          spellSortDir={domains.spells.list.sortDir}
          onSpellPageChange={domains.spells.list.setPage}
          onSpellSortChange={domains.spells.list.setSort}
          onDeleteSpell={domains.spells.deletion.request}
          itemListItems={domains.items.list.items}
          itemPage={domains.items.list.page}
          itemTotalPages={domains.items.list.totalPages}
          itemSortBy={domains.items.list.sortBy}
          itemSortDir={domains.items.list.sortDir}
          onItemPageChange={domains.items.list.setPage}
          onItemSortChange={domains.items.list.setSort}
          onDeleteItem={domains.items.deletion.request}
          unitListItems={domains.units.list.items}
          unitPage={domains.units.list.page}
          unitTotalPages={domains.units.list.totalPages}
          unitSortBy={domains.units.list.sortBy}
          unitSortDir={domains.units.list.sortDir}
          onUnitPageChange={domains.units.list.setPage}
          onUnitSortChange={domains.units.list.setSort}
          onDeleteUnit={domains.units.deletion.request}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col min-h-0 animate-fade-in">
        <ScenarioWorkspace
          workspace={workspaces.scenario}
          onFieldChange={workspaces.updateScenarioField}
          onSave={state.scenarioSave.save}
          isSaving={state.scenarioSave.isSaving}
          saveError={state.scenarioSave.error}
          unitOptions={options.scenarioUnits}
        />
        <div data-testid="workspace-divider" className="border-t border-border" />
        <EntityWorkspace
          workspace={workspaces.entity}
          onFieldChange={workspaces.updateEntityField}
          onSave={state.entitySave.save}
          isSaving={state.entitySave.isSaving}
          saveError={state.entitySave.error}
          effectOptions={options.effects}
          spellOptions={options.spells}
          itemOptions={options.items}
        />
      </div>
      <UnsavedChangesDialog
        open={navigation.discard.isOpen}
        onCancel={navigation.discard.cancel}
        onDiscard={navigation.discard.confirm}
      />
      {deleteDialogs.map((dialog) => (
        <DeleteConfirmDialog key={dialog.entityLabel} {...dialog} />
      ))}
    </main>
  );
}
