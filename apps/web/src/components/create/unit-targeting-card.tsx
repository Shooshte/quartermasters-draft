import type { UnitFieldErrors, UnitFormValues } from "./unit-form";
import { UnitTargetingSummary } from "./unit-targeting-summary";
import { WorkspaceSegmentToggle } from "./workspace-segment-toggle";
import { WorkspaceSelectChip } from "./workspace-select-chip";

interface UnitTargetingCardProps {
  formValues: UnitFormValues;
  errors: UnitFieldErrors;
  onFieldChange: (field: string, value: unknown) => void;
}

export function UnitTargetingCard({ formValues, errors, onFieldChange }: UnitTargetingCardProps) {
  return (
    <div data-testid="unit-targeting-card">
      <div className="ws-section-header">Targeting</div>
      <div className="targeting-card">
        <div className="targeting-card-policy-row">
          <span className="targeting-card-policy-label">Scope</span>
          <WorkspaceSelectChip
            chipTestId="unit-target-scope-chip"
            selectTestId="unit-target-scope-select"
            className="ws-chip"
            value={formValues.targetScope}
            includeEmptyOption
            options={[
              { value: "self", label: "Self" },
              { value: "self_allies", label: "Self + allies" },
              { value: "self_enemies", label: "Self + enemies" },
              { value: "allies", label: "Allies" },
              { value: "enemies", label: "Enemies" },
              { value: "both", label: "Allies + enemies" },
            ]}
            onChange={(value) => onFieldChange("targetScope", value)}
          />
        </div>
        {errors.targetScope ? (
          <p className="text-sm text-destructive" style={{ padding: "4px 12px" }}>
            {errors.targetScope}
          </p>
        ) : null}

        <div className="targeting-card-policy-row">
          <span className="targeting-card-policy-label">Priority</span>
          <WorkspaceSelectChip
            chipTestId="unit-target-priority-chip"
            selectTestId="unit-target-priority-select"
            className="ws-chip"
            style={{
              background: "oklch(0.78 0.15 75 / 12%)",
              color: "oklch(0.78 0.15 75)",
              border: "1px solid oklch(0.78 0.15 75 / 18%)",
            }}
            value={formValues.targetPriority}
            includeEmptyOption
            options={[
              { value: "highest_health", label: "Highest health" },
              { value: "lowest_health", label: "Lowest health" },
              { value: "highest_damage", label: "Highest damage" },
              { value: "support", label: "Support" },
              { value: "random", label: "Random" },
            ]}
            onChange={(value) => onFieldChange("targetPriority", value)}
          />
        </div>
        {errors.targetPriority ? (
          <p className="text-sm text-destructive" style={{ padding: "4px 12px" }}>
            {errors.targetPriority}
          </p>
        ) : null}

        <UnitTargetingSummary
          targetScope={formValues.targetScope}
          targetPriority={formValues.targetPriority}
          targetCount={formValues.targetCount}
          selectionShape={formValues.selectionShape}
        />

        <div className="targeting-card-body">
          <div className="targeting-controls">
            <div className="targeting-ctrl-block">
              <label className="targeting-ctrl-section-label" htmlFor="unit-target-count">
                Targets per activation
              </label>
              <input
                id="unit-target-count"
                aria-label="Targets per activation"
                data-testid="unit-target-count-input"
                type="number"
                min={1}
                step={1}
                className="targeting-ctrl-input"
                value={formValues.targetCount}
                onChange={(event) => {
                  const value = Number.parseInt(event.target.value, 10);
                  if (!Number.isNaN(value)) {
                    onFieldChange("targetCount", value);
                  }
                }}
              />
              {errors.targetCount ? (
                <p className="text-sm text-destructive">{errors.targetCount}</p>
              ) : null}
            </div>

            <div className="targeting-ctrl-block">
              <span className="targeting-ctrl-section-label">Selection shape</span>
              <WorkspaceSegmentToggle
                options={[
                  { value: "individual", label: "Individual" },
                  { value: "adjacent", label: "Adjacent" },
                ]}
                value={formValues.selectionShape}
                onChange={(value) => onFieldChange("selectionShape", value)}
                testId="unit-target-shape-toggle"
                ariaLabel="Selection shape"
              />
              {errors.selectionShape ? (
                <p className="text-sm text-destructive">{errors.selectionShape}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
