import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import {
  COMPACT_LABELS,
  getEffectColorClass,
  MODIFIER_GROUPS,
  TIMING_FIELDS,
} from "./effect-colors";
import {
  type EffectFormValues,
  effectNeedsTimingConfiguration,
  effectRecordToFormValues,
  hasEffectFormErrors,
  isActionDurationApplicable,
  isIntervalFieldDisabled,
  validateEffectForm,
} from "./effect-form";
import { WorkspaceNameField } from "./workspace-name-field";
import { WorkspaceNumericField } from "./workspace-numeric-field";
import { WorkspaceSaveFooter } from "./workspace-save-footer";
import { WorkspaceSection } from "./workspace-section";
import { WorkspaceSelectChip } from "./workspace-select-chip";

interface EffectWorkspaceFormProps {
  mode: "create" | "edit" | "loading";
  formValues: EffectFormValues;
  onFieldChange: (field: string, value: unknown) => void;
  onSave: () => void;
  isSaving: boolean;
  saveError: string | null;
}

function toNumericValue(nextValue: string) {
  return nextValue === "" ? null : Number(nextValue);
}

export function EffectWorkspaceForm({
  mode,
  formValues,
  onFieldChange,
  onSave,
  isSaving,
  saveError,
}: EffectWorkspaceFormProps) {
  const normalizedFormValues = effectRecordToFormValues(formValues);
  const errors = validateEffectForm(normalizedFormValues);
  const intervalDisabled = isIntervalFieldDisabled(normalizedFormValues);
  const saveLabel = mode === "create" ? "Create Effect" : "Save Changes";
  const colorClass = getEffectColorClass(normalizedFormValues.effectType);
  const needsTimingConfiguration = effectNeedsTimingConfiguration(normalizedFormValues);
  const showActionDuration = isActionDurationApplicable(normalizedFormValues);

  return (
    <div className={`flex flex-col gap-4 ${colorClass}`} data-testid="effect-form-fields">
      <WorkspaceNameField
        value={normalizedFormValues.name}
        error={errors.name}
        onChange={(value) => onFieldChange("name", value)}
      />

      <div className="flex gap-2 items-center flex-wrap">
        <WorkspaceSelectChip
          chipTestId="effect-effect-type-chip"
          selectTestId="effect-effect-type-select"
          className="ws-chip ws-chip-type"
          value={normalizedFormValues.effectType}
          options={[
            { value: "buff" },
            { value: "debuff" },
            { value: "healing" },
            { value: "damage" },
          ]}
          onChange={(value) => onFieldChange("effectType", value)}
        />
        <WorkspaceSelectChip
          chipTestId="effect-timing-type-chip"
          selectTestId="effect-timing-type-select"
          className="ws-chip ws-chip-timing"
          value={normalizedFormValues.timingType}
          options={[{ value: "instant" }, { value: "interval" }]}
          onChange={(value) => onFieldChange("timingType", value)}
        />
      </div>

      <WorkspaceSection title="Timing">
        <div className="mb-3 flex items-center gap-2">
          <Checkbox
            id="effect-is-taunt"
            checked={normalizedFormValues.isTaunt}
            onCheckedChange={(checked) => onFieldChange("isTaunt", checked === true)}
          />
          <Label htmlFor="effect-is-taunt">Taunt</Label>
        </div>
        {needsTimingConfiguration ? (
          <p
            className="mb-2 rounded-md border border-amber-400/70 bg-amber-950/40 px-3 py-2 text-sm font-medium text-amber-200"
            role="alert"
          >
            Timing needs configuration
          </p>
        ) : null}
        <div className="grid grid-cols-3 gap-1.5">
          {TIMING_FIELDS.filter((field) => field !== "lastsForActions" || showActionDuration).map(
            (field) => (
              <WorkspaceNumericField
                key={field}
                id={`effect-${field}`}
                testId={`effect-${field}-input`}
                label={COMPACT_LABELS[field] ?? field}
                value={normalizedFormValues[field]}
                error={errors[field]}
                disabled={field !== "lastsForActions" && intervalDisabled}
                step={1}
                onChange={(value) => onFieldChange(field, toNumericValue(value))}
              />
            ),
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Timing advances only when the affected unit gets an action opportunity.
        </p>
      </WorkspaceSection>

      {MODIFIER_GROUPS.map((group) => (
        <WorkspaceSection key={group.label} title={group.label}>
          <div
            className={`grid gap-1.5 ${group.cols === 4 ? "grid-cols-4" : "grid-cols-3"}`}
            data-testid={`effect-group-${group.label.toLowerCase().replaceAll(" ", "-")}`}
          >
            {group.fields.map((field) => (
              <WorkspaceNumericField
                key={field}
                id={`effect-${field}`}
                testId={`effect-${field}-input`}
                label={COMPACT_LABELS[field] ?? field}
                value={normalizedFormValues[field]}
                error={errors[field]}
                cellClassName={field === "directHealing" ? "ws-cell-healing" : "ws-cell"}
                onChange={(value) => onFieldChange(field, toNumericValue(value))}
              />
            ))}
          </div>
          {group.label === "Defense Buff" ? (
            <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <input
                id="effect-bypassesShield"
                data-testid="effect-bypassesShield-input"
                type="checkbox"
                checked={normalizedFormValues.bypassesShield}
                onChange={(event) => onFieldChange("bypassesShield", event.target.checked)}
              />
              Bypasses shield
            </label>
          ) : null}
        </WorkspaceSection>
      ))}

      <WorkspaceSaveFooter
        saveLabel={saveLabel}
        isSaving={isSaving}
        isDisabled={hasEffectFormErrors(normalizedFormValues)}
        saveError={saveError}
        onSave={onSave}
      />
    </div>
  );
}
