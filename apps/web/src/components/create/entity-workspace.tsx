import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { capitalize } from "~/lib/string-utils";
import type { WorkspaceState } from "./types";

interface EntityWorkspaceProps {
  workspace: WorkspaceState;
  onFieldChange: (field: string, value: unknown) => void;
}

export function EntityWorkspace({ workspace, onFieldChange }: EntityWorkspaceProps) {
  const { mode, entityType, formValues } = workspace;

  return (
    <Card data-testid="entity-workspace" className="flex flex-1 flex-col overflow-auto">
      <CardHeader>
        <CardTitle>
          {(mode === "idle" || mode === "loading") && "Entity"}
          {mode === "not-found" && "Entity"}
          {mode === "create" && `New ${capitalize(entityType ?? "")}`}
          {mode === "edit" && `${capitalize(entityType ?? "")}: ${formValues.name ?? ""}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {mode === "idle" && (
          <p className="text-sm text-muted-foreground" data-testid="entity-idle">
            Select an entity from the library
          </p>
        )}

        {mode === "loading" && (
          <p className="text-sm text-muted-foreground" data-testid="entity-loading">
            Loading…
          </p>
        )}

        {mode === "not-found" && (
          <p className="text-sm text-destructive" data-testid="entity-not-found">
            Entity not found
          </p>
        )}

        {(mode === "create" || mode === "edit") && (
          <div className="flex flex-col gap-4" data-testid="entity-form">
            <div className="flex flex-col gap-2">
              <Label htmlFor="entity-name">Name</Label>
              <Input
                id="entity-name"
                data-testid="entity-name-input"
                value={formValues.name ?? ""}
                onChange={(e) => onFieldChange("name", e.target.value)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
