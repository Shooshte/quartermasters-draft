import { Button } from "~/components/ui/button";
import {
  effectRecordToFormValues,
  hasEffectFormErrors,
  isIntervalFieldDisabled,
  validateEffectForm,
  type EffectFormValues,
} from "./effect-form";
import {
  getEffectColorClass,
  COMPACT_LABELS,
  MODIFIER_GROUPS,
  TIMING_FIELDS,
} from "./effect-colors";
import { WorkspaceNumericField } from "./workspace-numeric-field";
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

  return (
    <div className={`flex flex-col gap-4 ${colorClass}`} data-testid="effect-form-fields">
      <div className="ws-cell-neutral">
        <label htmlFor="entity-name" className="ws-cell-label">
          Name
        </label>
        <input
          id="entity-name"
          data-testid="entity-name-input"
          className="ws-cell-input ws-name-input"
          value={normalizedFormValues.name}
          placeholder="—"
          aria-invalid={errors.name ? true : undefined}
          onChange={(event) => onFieldChange("name", event.target.value)}
        />
        {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
      </div>

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
          options={[
            { value: "instant" },
            { value: "interval" },
          ]}
          onChange={(value) => onFieldChange("timingType", value)}
        />
      </div>

      <div data-testid="effect-timing-section">
        <div className="ws-section-header">Timing</div>
        <div className="grid grid-cols-3 gap-1.5">
          {TIMING_FIELDS.map((field) => (
            <WorkspaceNumericField
              key={field}
              id={`effect-${field}`}
              testId={`effect-${field}-input`}
              label={COMPACT_LABELS[field] ?? field}
              value={normalizedFormValues[field]}
              error={errors[field]}
              disabled={field !== "durationMs" && intervalDisabled}
              step={1}
              onChange={(value) => onFieldChange(field, toNumericValue(value))}
            />
          ))}
        </div>
      </div>

      {MODIFIER_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="ws-section-header">{group.label}</div>
          <div
            className={`grid gap-1.5 ${group.cols === 2 ? "grid-cols-2" : group.cols === 4 ? "grid-cols-4" : "grid-cols-3"}`}
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
                cellClassName="ws-cell"
                onChange={(value) => onFieldChange(field, toNumericValue(value))}
              />
            ))}
          </div>
        </div>
      ))}

      {saveError ? (
        <p className="text-sm text-destructive" data-testid="entity-save-error">
          {saveError}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          data-testid="entity-save-button"
          onClick={onSave}
          disabled={isSaving || hasEffectFormErrors(normalizedFormValues)}
        >
          {isSaving ? "Saving..." : saveLabel}
        </Button>
      </div>
    </div>
  );
}
