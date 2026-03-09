import { useCreatePageState } from "./use-create-page-state";
import { EntityWorkspace } from "./entity-workspace";
import { ScenarioWorkspace } from "./scenario-workspace";
import { LibraryPanel } from "./library-panel";
import { UnsavedChangesDialog } from "./unsaved-changes-dialog";

interface CreatePageProps {
  search: {
    tab?: string;
    entity_id?: string;
    scenario_id?: string;
  };
}

export function CreatePage({ search }: CreatePageProps) {
  const state = useCreatePageState(search);

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
      />
      <UnsavedChangesDialog
        open={state.isDialogOpen}
        onCancel={state.cancelDiscard}
        onDiscard={state.confirmDiscard}
      />
    </main>
  );
}
