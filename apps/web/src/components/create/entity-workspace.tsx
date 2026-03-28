import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { capitalize } from "~/lib/string-utils";
import type { EffectFormValues } from "./effect-form";
import type { SpellFormValues, EffectOption } from "./spell-form";
import type { WorkspaceState } from "./types";
import { EffectWorkspaceForm } from "./effect-workspace-form";
import { SpellWorkspaceForm } from "./spell-workspace-form";

interface EntityWorkspaceProps {
  workspace: WorkspaceState;
  onFieldChange: (field: string, value: unknown) => void;
  onSave: () => void;
  isSaving: boolean;
  saveError: string | null;
  effectOptions?: EffectOption[];
}

export function EntityWorkspace({ workspace, onFieldChange, onSave, isSaving, saveError, effectOptions = [] }: EntityWorkspaceProps) {
  const { mode, entityType, formValues } = workspace;
  const isTransitioning = mode === "loading" && workspace.data !== null;

  return (
    <div data-testid="entity-workspace" className="flex flex-1 flex-col overflow-auto min-h-0">
      <div data-testid="entity-workspace-header" className="bg-accent text-primary font-display tracking-wide py-2 px-4 border-b border-border">
        {mode === "idle" && "Entity"}
        {mode === "loading" && !workspace.data && "Entity"}
        {mode === "loading" && workspace.data && `${capitalize(entityType ?? "")}: ${formValues.name ?? ""}`}
        {mode === "not-found" && "Entity"}
        {mode === "create" && `New ${capitalize(entityType ?? "")}`}
        {mode === "edit" && `${capitalize(entityType ?? "")}: ${formValues.name ?? ""}`}
      </div>
      <div className="flex-1 p-4 overflow-auto">
        {mode === "idle" && (
          <p className="text-sm text-muted-foreground" data-testid="entity-idle">
            Select an entity from the library
          </p>
        )}

        {mode === "loading" && !workspace.data && (
          <p className="text-sm text-muted-foreground" data-testid="entity-loading">
            Loading…
          </p>
        )}

        {mode === "not-found" && (
          <p className="text-sm text-destructive" data-testid="entity-not-found">
            Entity not found
          </p>
        )}

        {(mode === "create" || mode === "edit" || isTransitioning) && (
          <div className={`flex flex-col gap-4 ${isTransitioning ? "opacity-60 pointer-events-none" : ""}`} data-testid="entity-form">
            {entityType === "effect" ? (
              <EffectWorkspaceForm
                mode={mode}
                formValues={formValues as EffectFormValues}
                onFieldChange={onFieldChange}
                onSave={onSave}
                isSaving={isSaving}
                saveError={saveError}
              />
            ) : entityType === "spell" ? (
              <SpellWorkspaceForm
                mode={mode}
                formValues={formValues as SpellFormValues}
                effectOptions={effectOptions}
                onFieldChange={onFieldChange}
                onSave={onSave}
                isSaving={isSaving}
                saveError={saveError}
              />
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor="entity-name">Name</Label>
                <Input
                  id="entity-name"
                  data-testid="entity-name-input"
                  value={formValues.name ?? ""}
                  onChange={(e) => onFieldChange("name", e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
