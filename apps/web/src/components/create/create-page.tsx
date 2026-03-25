import { useNavigate } from "@tanstack/react-router";
import { useCreatePageState } from "./use-create-page-state";
import { EntityWorkspace } from "./entity-workspace";
import { ScenarioWorkspace } from "./scenario-workspace";
import { LibraryPanel } from "./library-panel";
import { UnsavedChangesDialog } from "./unsaved-changes-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";

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
  const state = useCreatePageState(search, navigate);

  return (
    <main className="flex h-[calc(100vh-60px)]">
      <div className="w-[42%] border-r flex flex-col">
        <LibraryPanel
          activeTab={state.activeTab}
          perTabSelection={state.perTabSelection}
          listLoading={state.listLoading}
          onTabChange={state.setActiveTab}
          onSelectRecord={state.selectRecord}
          onCreateNew={state.createNew}
          scenarioListItems={state.scenarioListItems}
          scenarioPage={state.scenarioPage}
          scenarioTotalPages={state.scenarioTotalPages}
          scenarioSortBy={state.scenarioSortBy}
          scenarioSortDir={state.scenarioSortDir}
          onScenarioPageChange={state.setScenarioPage}
          onScenarioSortChange={state.setScenarioSort}
          onDeleteScenario={state.requestDeleteScenario}
          effectListItems={state.effectListItems}
          effectPage={state.effectPage}
          effectTotalPages={state.effectTotalPages}
          effectSortBy={state.effectSortBy}
          effectSortDir={state.effectSortDir}
          onEffectPageChange={state.setEffectPage}
          onEffectSortChange={state.setEffectSort}
          onDeleteEffect={state.requestDeleteEffect}
          spellListItems={state.spellListItems}
          spellPage={state.spellPage}
          spellTotalPages={state.spellTotalPages}
          spellSortBy={state.spellSortBy}
          spellSortDir={state.spellSortDir}
          onSpellPageChange={state.setSpellPage}
          onSpellSortChange={state.setSpellSort}
          onDeleteSpell={state.requestDeleteSpell}
          itemListItems={state.itemListItems}
          itemPage={state.itemPage}
          itemTotalPages={state.itemTotalPages}
          itemSortBy={state.itemSortBy}
          itemSortDir={state.itemSortDir}
          onItemPageChange={state.setItemPage}
          onItemSortChange={state.setItemSort}
          onDeleteItem={state.requestDeleteItem}
          unitListItems={state.unitListItems}
          unitPage={state.unitPage}
          unitTotalPages={state.unitTotalPages}
          unitSortBy={state.unitSortBy}
          unitSortDir={state.unitSortDir}
          onUnitPageChange={state.setUnitPage}
          onUnitSortChange={state.setUnitSort}
          onDeleteUnit={state.requestDeleteUnit}
        />
      </div>
      <div className="flex-1 flex flex-col gap-4 p-4 min-h-0">
        <EntityWorkspace
          workspace={state.entityWorkspace}
          onFieldChange={state.updateEntityField}
        />
        <ScenarioWorkspace
          workspace={state.scenarioWorkspace}
          onFieldChange={state.updateScenarioField}
        />
      </div>
      <UnsavedChangesDialog
        open={state.isDialogOpen}
        onCancel={state.cancelDiscard}
        onDiscard={state.confirmDiscard}
      />
      <DeleteConfirmDialog
        open={state.isDeleteDialogOpen}
        entityName={state.deleteTarget?.name ?? ""}
        entityLabel="scenario"
        errorMessage={state.deleteError}
        onCancel={state.cancelDeleteScenario}
        onConfirm={state.confirmDeleteScenario}
      />
      <DeleteConfirmDialog
        open={state.isDeleteEffectDialogOpen}
        entityName={state.deleteEffectTarget?.name ?? ""}
        entityLabel="effect"
        errorMessage={state.deleteEffectError}
        onCancel={state.cancelDeleteEffect}
        onConfirm={state.confirmDeleteEffect}
      />
      <DeleteConfirmDialog
        open={state.isDeleteSpellDialogOpen}
        entityName={state.deleteSpellTarget?.name ?? ""}
        entityLabel="spell"
        errorMessage={state.deleteSpellError}
        onCancel={state.cancelDeleteSpell}
        onConfirm={state.confirmDeleteSpell}
      />
      <DeleteConfirmDialog
        open={state.isDeleteItemDialogOpen}
        entityName={state.deleteItemTarget?.name ?? ""}
        entityLabel="item"
        errorMessage={state.deleteItemError}
        onCancel={state.cancelDeleteItem}
        onConfirm={state.confirmDeleteItem}
      />
      <DeleteConfirmDialog
        open={state.isDeleteUnitDialogOpen}
        entityName={state.deleteUnitTarget?.name ?? ""}
        entityLabel="unit"
        errorMessage={state.deleteUnitError}
        onCancel={state.cancelDeleteUnit}
        onConfirm={state.confirmDeleteUnit}
      />
    </main>
  );
}
