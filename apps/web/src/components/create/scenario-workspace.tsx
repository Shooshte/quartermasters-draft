import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { WorkspaceState } from "./types";

const ROW_TYPES = ["Tank", "Melee", "Ranged", "Support"] as const;

interface ScenarioWorkspaceProps {
  workspace: WorkspaceState;
  onFieldChange: (field: string, value: unknown) => void;
}

export function ScenarioWorkspace({ workspace, onFieldChange }: ScenarioWorkspaceProps) {
  const { mode, formValues, data } = workspace;

  const rows =
    mode === "edit" && data && Array.isArray((data as Record<string, unknown>).rows)
      ? ((data as Record<string, unknown>).rows as { id: string; rowType: string; assignments: unknown[] }[])
      : null;

  return (
    <Card data-testid="scenario-workspace" className="flex flex-1 flex-col overflow-auto">
      <CardHeader>
        <CardTitle>
          {(mode === "idle" || mode === "loading") && "Scenario"}
          {mode === "not-found" && "Scenario"}
          {mode === "create" && "New Scenario"}
          {mode === "edit" && `Scenario: ${formValues.name as string}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {mode === "idle" && (
          <p className="text-sm text-muted-foreground" data-testid="scenario-idle">
            Select a scenario from the library
          </p>
        )}

        {mode === "loading" && (
          <p className="text-sm text-muted-foreground" data-testid="scenario-loading">
            Loading…
          </p>
        )}

        {mode === "not-found" && (
          <p className="text-sm text-destructive" data-testid="scenario-not-found">
            Scenario not found
          </p>
        )}

        {(mode === "create" || mode === "edit") && (
          <div className="flex flex-col gap-4" data-testid="scenario-form">
            <div className="flex flex-col gap-2">
              <Label htmlFor="scenario-name">Name</Label>
              <Input
                id="scenario-name"
                data-testid="scenario-name-input"
                value={(formValues.name as string) ?? ""}
                onChange={(e) => onFieldChange("name", e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2" data-testid="scenario-rows">
              {mode === "create" &&
                ROW_TYPES.map((rowType) => (
                  <div
                    key={rowType}
                    data-testid={`scenario-row-${rowType.toLowerCase()}`}
                    className="rounded border p-2 text-sm text-muted-foreground"
                  >
                    {rowType}: Empty
                  </div>
                ))}
              {mode === "edit" &&
                rows &&
                rows.map((row) => (
                  <div
                    key={row.id}
                    data-testid={`scenario-row-${row.rowType}`}
                    className="rounded border p-2 text-sm"
                  >
                    {capitalize(row.rowType)}
                    {row.assignments.length === 0 && (
                      <span className="ml-2 text-muted-foreground">Empty</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
