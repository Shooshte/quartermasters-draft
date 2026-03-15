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
    scenario_id?: string;
  };
}

export function CreatePage({ search }: CreatePageProps) {
  const navigate = useNavigate();
  const state = useCreatePageState(search, navigate);

  return (
    <main className="flex flex-col gap-4 p-4 h-[calc(100vh-60px)]">
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
        <EntityWorkspace
          workspace={state.entityWorkspace}
          onFieldChange={state.updateEntityField}
        />
        <ScenarioWorkspace
          workspace={state.scenarioWorkspace}
          onFieldChange={state.updateScenarioField}
        />
      </div>
      <LibraryPanel
        activeTab={state.activeTab}
        perTabSelection={state.perTabSelection}
        listData={state.listData}
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
      />
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
    </main>
  );
}
