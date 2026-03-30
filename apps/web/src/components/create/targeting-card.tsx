import { WorkspaceSelectChip } from "./workspace-select-chip";
import { WorkspaceSegmentToggle } from "./workspace-segment-toggle";
import { WorkspaceRowTypePill } from "./workspace-row-type-pill";
import { TargetingGridPreview } from "./targeting-grid-preview";
import { SCENARIO_ROW_TYPES } from "./scenario-form";
import type { SpellFormValues, SpellFieldErrors, RowType } from "./spell-form";

interface TargetingCardProps {
  formValues: SpellFormValues;
  errors: SpellFieldErrors;
  onFieldChange: (field: string, value: unknown) => void;
}

export function TargetingCard({
  formValues,
  errors,
  onFieldChange,
}: TargetingCardProps) {
  const perRowMode = formValues.maxTargetsPerRow === null ? "all" : "limit";
  const adjacentDisabled =
    formValues.maxTargetsPerRow === null || formValues.maxTargetsPerRow < 2;

  return (
    <div>
      <div className="ws-section-header">Targeting</div>
      <div className="targeting-card">
        {/* Policy row */}
        <div className="targeting-card-policy-row">
          <span className="targeting-card-policy-label">Priority</span>
          <WorkspaceSelectChip
            chipTestId="spell-target-policy-chip"
            selectTestId="spell-target-policy-select"
            className="ws-chip"
            style={{
              background: "oklch(0.78 0.15 75 / 12%)",
              color: "oklch(0.78 0.15 75)",
              border: "1px solid oklch(0.78 0.15 75 / 18%)",
            }}
            value={formValues.targetPolicy}
            includeEmptyOption
            options={[
              { value: "highest_health" },
              { value: "lowest_health" },
              { value: "highest_damage" },
              { value: "random" },
            ]}
            onChange={(value) => onFieldChange("targetPolicy", value)}
          />
        </div>
        {errors.targetPolicy ? (
          <p className="text-sm text-destructive" style={{ padding: "4px 12px" }}>{errors.targetPolicy}</p>
        ) : null}

        {/* Body: grid + controls */}
        <div className="targeting-card-body">
          {/* Grid preview (left) */}
          <TargetingGridPreview
            targetRowCount={formValues.targetRowCount}
            maxTargetsPerRow={formValues.maxTargetsPerRow}
            targetOnlyAdjacent={formValues.targetOnlyAdjacent}
            allowedRowTypes={formValues.allowedRowTypes}
          />

          {/* Controls (right) */}
          <div className="targeting-controls">
            {/* Rows */}
            <div className="targeting-ctrl-row">
              <label htmlFor="spell-target-row-count" className="targeting-ctrl-label">
                Rows
              </label>
              <input
                id="spell-target-row-count"
                data-testid="spell-target-row-count-input"
                type="number"
                min={1}
                max={4}
                className="targeting-ctrl-input"
                value={formValues.targetRowCount}
                onChange={(event) => {
                  const val = parseInt(event.target.value, 10);
                  if (!isNaN(val)) onFieldChange("targetRowCount", val);
                }}
              />
            </div>
            {errors.targetRowCount ? (
              <p className="text-sm text-destructive">{errors.targetRowCount}</p>
            ) : null}

            {/* Per Row: segment toggle + optional number input */}
            <div className="targeting-ctrl-row">
              <span className="targeting-ctrl-label">Per Row</span>
              <WorkspaceSegmentToggle
                options={[
                  { value: "all", label: "All" },
                  { value: "limit", label: "Limit" },
                ]}
                value={perRowMode}
                onChange={(mode) => {
                  if (mode === "all") {
                    if (formValues.targetOnlyAdjacent) {
                      onFieldChange("targetOnlyAdjacent", false);
                    }
                    onFieldChange("maxTargetsPerRow", null);
                  } else {
                    onFieldChange("maxTargetsPerRow", 1);
                  }
                }}
                testId="per-row-toggle"
              />
              {perRowMode === "limit" ? (
                <input
                  data-testid="spell-max-targets-per-row-input"
                  type="number"
                  min={1}
                  className="targeting-ctrl-input"
                  style={{ width: 44 }}
                  value={formValues.maxTargetsPerRow ?? 1}
                  onChange={(event) => {
                    const val = parseInt(event.target.value, 10);
                    if (!isNaN(val)) onFieldChange("maxTargetsPerRow", val);
                  }}
                />
              ) : null}
            </div>
            {errors.maxTargetsPerRow ? (
              <p className="text-sm text-destructive">{errors.maxTargetsPerRow}</p>
            ) : null}

            {/* Adjacent only */}
            <div className="targeting-ctrl-row">
              <span className="targeting-ctrl-label" />
              <label className={`targeting-ctrl-chk${adjacentDisabled ? " disabled" : ""}`}>
                <input
                  type="checkbox"
                  data-testid="spell-target-only-adjacent-checkbox"
                  checked={formValues.targetOnlyAdjacent}
                  disabled={adjacentDisabled}
                  onChange={() =>
                    onFieldChange("targetOnlyAdjacent", !formValues.targetOnlyAdjacent)
                  }
                />
                Adjacent only
              </label>
            </div>
            {errors.targetOnlyAdjacent ? (
              <p className="text-sm text-destructive">{errors.targetOnlyAdjacent}</p>
            ) : null}

            {/* Divider */}
            <div className="targeting-ctrl-divider" />

            {/* Allowed Rows */}
            <div className="targeting-ctrl-section-label">Allowed Rows</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
              {SCENARIO_ROW_TYPES.map((rowType) => (
                <WorkspaceRowTypePill
                  key={rowType}
                  rowType={rowType}
                  active={formValues.allowedRowTypes.includes(rowType as RowType)}
                  testId={`spell-allowed-row-${rowType}`}
                  onClick={() => {
                    const current = formValues.allowedRowTypes;
                    const next = current.includes(rowType as RowType)
                      ? current.filter((r) => r !== rowType)
                      : [...current, rowType as RowType];
                    onFieldChange("allowedRowTypes", next);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
