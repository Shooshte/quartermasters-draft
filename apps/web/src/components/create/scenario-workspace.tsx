import { Input } from "~/components/ui/input";
import {
  hasScenarioFormErrors,
  SCENARIO_ROW_TYPES,
  type ScenarioFormValues,
  type ScenarioRowType,
} from "./scenario-form";
import type { ScenarioUnitOption } from "./scenario-row-editor";
import { ScenarioRowEditor } from "./scenario-row-editor";
import type { WorkspaceState } from "./types";

interface ScenarioWorkspaceProps {
  workspace: WorkspaceState;
  onFieldChange: (field: string, value: unknown) => void;
  onSave: () => void;
  isSaving: boolean;
  saveError: string | null;
  unitOptions: ScenarioUnitOption[];
  onEditUnit?: (unitId: string) => void;
}

function getWorkspaceTitle(workspace: WorkspaceState) {
  const { mode, formValues } = workspace;

  if (mode === "create") {
    return "New Scenario";
  }
  if (mode === "edit") {
    return `Scenario: ${String(formValues.name ?? "")}`;
  }
  if (mode === "loading" && workspace.data) {
    return `Scenario: ${String(formValues.name ?? "")}`;
  }

  return "Scenario";
}

function getScenarioRows(formValues: WorkspaceState["formValues"]) {
  const scenarioValues = formValues as ScenarioFormValues;
  const rowMap = new Map((scenarioValues.rows ?? []).map((row) => [row.rowType, row.unitIds]));

  return SCENARIO_ROW_TYPES.map((rowType) => ({
    rowType,
    unitIds: [...(rowMap.get(rowType) ?? [])],
  }));
}

export function ScenarioWorkspace({
  workspace,
  onFieldChange,
  onSave,
  isSaving,
  saveError,
  unitOptions,
  onEditUnit = () => {},
}: ScenarioWorkspaceProps) {
  const { mode, formValues } = workspace;
  const isTransitioning = mode === "loading" && workspace.data !== null;
  const scenarioValues = formValues as ScenarioFormValues;
  const rows = getScenarioRows(formValues);
  const hasErrors = hasScenarioFormErrors({
    name: scenarioValues.name ?? "",
    rows,
  });

  const updateRow = (rowType: ScenarioRowType, unitIds: string[]) => {
    onFieldChange(
      "rows",
      rows.map((row) => (row.rowType === rowType ? { ...row, unitIds } : row)),
    );
  };

  return (
    <div data-testid="scenario-workspace" className="scenario-workspace">
      <div data-testid="scenario-workspace-header" className="sw-header">
        {getWorkspaceTitle(workspace)}
      </div>

      <div className="sw-content">
        <div className="sw-body">
          {mode === "idle" && (
            <p className="text-sm text-muted-foreground" data-testid="scenario-idle">
              Select a scenario from the library
            </p>
          )}

          {mode === "loading" && !workspace.data && (
            <p className="text-sm text-muted-foreground" data-testid="scenario-loading">
              Loading…
            </p>
          )}

          {mode === "not-found" && (
            <p className="text-sm text-destructive" data-testid="scenario-not-found">
              Scenario not found
            </p>
          )}

          {(mode === "create" || mode === "edit" || isTransitioning) && (
            <div
              className={`flex flex-col gap-4 ${isTransitioning ? "opacity-60 pointer-events-none sw-loading" : ""}`}
              data-testid="scenario-form"
            >
              <div className="sw-name-field">
                <label htmlFor="scenario-name" className="sw-name-label">
                  Name
                </label>
                <Input
                  id="scenario-name"
                  data-testid="scenario-name-input"
                  className="sw-name-input"
                  value={scenarioValues.name ?? ""}
                  aria-invalid={!scenarioValues.name?.trim() || undefined}
                  placeholder="Enter scenario name..."
                  onChange={(event) => onFieldChange("name", event.target.value)}
                />
              </div>

              <div className="sw-rows" data-testid="scenario-rows">
                {rows.map((row) => (
                  <ScenarioRowEditor
                    key={row.rowType}
                    rowType={row.rowType}
                    unitIds={row.unitIds}
                    unitOptions={unitOptions}
                    onChange={(unitIds) => updateRow(row.rowType, unitIds)}
                    onEditUnit={onEditUnit}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {(mode === "create" || mode === "edit" || isTransitioning) && (
          <div className="sw-footer">
            {saveError ? (
              <div className="sw-save-error" data-testid="scenario-save-error">
                {saveError}
              </div>
            ) : (
              <span className="sw-footer-hint">
                {!scenarioValues.name?.trim() ? "Name is required to save" : ""}
              </span>
            )}

            <div className="sw-footer-actions">
              <button
                type="button"
                data-testid="scenario-save-button"
                className="btn btn-primary"
                disabled={isSaving || hasErrors}
                onClick={onSave}
              >
                {isSaving ? "Saving..." : "Save Scenario"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
