import type { RowType, SpellFieldErrors, SpellFormValues } from "./spell-form";
import {
  getEffectiveAllowedRows,
  TARGET_ROW_TYPES_IN_COMBAT_ORDER,
  TargetingRuleSummary,
} from "./targeting-rule-summary";
import { WorkspaceRowTypePill } from "./workspace-row-type-pill";
import { WorkspaceSegmentToggle } from "./workspace-segment-toggle";
import { WorkspaceSelectChip } from "./workspace-select-chip";

interface TargetingCardProps {
  formValues: SpellFormValues;
  errors: SpellFieldErrors;
  onFieldChange: (field: string, value: unknown) => void;
}

export function TargetingCard({ formValues, errors, onFieldChange }: TargetingCardProps) {
  const perRowMode = formValues.maxTargetsPerRow === null ? "all" : "limit";
  const adjacentDisabled = formValues.maxTargetsPerRow === null || formValues.maxTargetsPerRow < 2;
  const effectiveAllowedRows = getEffectiveAllowedRows(formValues.allowedRowTypes);
  const adjacentDisabledReason =
    formValues.maxTargetsPerRow === null
      ? "Adjacent placement does not apply when all units are targeted."
      : formValues.maxTargetsPerRow < 2
        ? "Choose at least 2 targets in each row to use adjacent placement."
        : null;

  const toggleAllowedRow = (rowType: RowType) => {
    if (effectiveAllowedRows.includes(rowType)) {
      if (effectiveAllowedRows.length === 1) return;
      onFieldChange(
        "allowedRowTypes",
        effectiveAllowedRows.filter((candidate) => candidate !== rowType),
      );
      return;
    }

    const nextRows = TARGET_ROW_TYPES_IN_COMBAT_ORDER.filter(
      (candidate) => effectiveAllowedRows.includes(candidate) || candidate === rowType,
    );
    onFieldChange(
      "allowedRowTypes",
      nextRows.length === TARGET_ROW_TYPES_IN_COMBAT_ORDER.length ? [] : nextRows,
    );
  };

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
              { value: "self" },
            ]}
            onChange={(value) => onFieldChange("targetPolicy", value)}
          />
        </div>
        {errors.targetPolicy ? (
          <p className="text-sm text-destructive" style={{ padding: "4px 12px" }}>
            {errors.targetPolicy}
          </p>
        ) : null}

        <div className="targeting-card-policy-row">
          <span className="targeting-card-policy-label">Scope</span>
          <WorkspaceSelectChip
            chipTestId="spell-target-scope-chip"
            selectTestId="spell-target-scope-select"
            className="ws-chip"
            value={formValues.targetScope}
            options={[{ value: "self" }, { value: "self_and_others" }, { value: "others" }]}
            onChange={(value) => onFieldChange("targetScope", value)}
          />
        </div>
        {errors.targetScope ? (
          <p className="text-sm text-destructive" style={{ padding: "4px 12px" }}>
            {errors.targetScope}
          </p>
        ) : null}

        <TargetingRuleSummary
          targetPolicy={formValues.targetPolicy}
          targetRowCount={formValues.targetRowCount}
          maxTargetsPerRow={formValues.maxTargetsPerRow}
          targetOnlyAdjacent={formValues.targetOnlyAdjacent}
          allowedRowTypes={formValues.allowedRowTypes}
        />

        <div className="targeting-card-body">
          <div className="targeting-controls">
            <div className="targeting-ctrl-block">
              <span className="targeting-ctrl-section-label">Rows hit per cast</span>
              <WorkspaceSegmentToggle
                options={[1, 2, 3, 4].map((count) => ({
                  value: String(count),
                  label: String(count),
                }))}
                value={String(formValues.targetRowCount)}
                onChange={(value) => onFieldChange("targetRowCount", Number(value))}
                testId="spell-target-row-count-toggle"
                ariaLabel="Rows hit per cast"
              />
              {errors.targetRowCount ? (
                <p className="text-sm text-destructive">{errors.targetRowCount}</p>
              ) : null}
            </div>

            <div className="targeting-ctrl-block">
              <span className="targeting-ctrl-section-label">Targets in each row</span>
              <div className="targeting-ctrl-row">
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
                  ariaLabel="Targets in each row"
                />
                {perRowMode === "limit" ? (
                  <input
                    aria-label="Maximum targets in each row"
                    data-testid="spell-max-targets-per-row-input"
                    type="number"
                    min={1}
                    className="targeting-ctrl-input"
                    value={formValues.maxTargetsPerRow ?? 1}
                    onChange={(event) => {
                      const val = parseInt(event.target.value, 10);
                      if (Number.isNaN(val)) return;
                      if (val < 2 && formValues.targetOnlyAdjacent) {
                        onFieldChange("targetOnlyAdjacent", false);
                      }
                      onFieldChange("maxTargetsPerRow", val);
                    }}
                  />
                ) : null}
              </div>
              {errors.maxTargetsPerRow ? (
                <p className="text-sm text-destructive">{errors.maxTargetsPerRow}</p>
              ) : null}
            </div>

            <div className="targeting-ctrl-block">
              <span className="targeting-ctrl-section-label">Position rule</span>
              <WorkspaceSegmentToggle
                options={[
                  { value: "any", label: "Any" },
                  { value: "adjacent", label: "Adjacent", disabled: adjacentDisabled },
                ]}
                value={formValues.targetOnlyAdjacent ? "adjacent" : "any"}
                onChange={(value) => onFieldChange("targetOnlyAdjacent", value === "adjacent")}
                testId="spell-target-position-toggle"
                ariaLabel="Position rule"
              />
              {adjacentDisabledReason ? (
                <p className="targeting-ctrl-help">{adjacentDisabledReason}</p>
              ) : null}
              {errors.targetOnlyAdjacent ? (
                <p className="text-sm text-destructive">{errors.targetOnlyAdjacent}</p>
              ) : null}
            </div>

            <fieldset className="targeting-ctrl-block targeting-ctrl-block-wide">
              <legend className="targeting-ctrl-section-label">Eligible rows</legend>
              <div className="targeting-row-options">
                {TARGET_ROW_TYPES_IN_COMBAT_ORDER.map((rowType) => {
                  const active = effectiveAllowedRows.includes(rowType);
                  return (
                    <WorkspaceRowTypePill
                      key={rowType}
                      rowType={rowType}
                      active={active}
                      disabled={active && effectiveAllowedRows.length === 1}
                      testId={`spell-allowed-row-${rowType}`}
                      onClick={() => toggleAllowedRow(rowType)}
                    />
                  );
                })}
              </div>
              <p className="targeting-ctrl-help">At least one row must remain eligible.</p>
            </fieldset>
          </div>
        </div>
      </div>
    </div>
  );
}
