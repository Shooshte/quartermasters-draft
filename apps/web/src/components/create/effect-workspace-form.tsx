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
import { WorkspaceNameField } from "./workspace-name-field";
import { WorkspaceSaveFooter } from "./workspace-save-footer";
import { WorkspaceSection } from "./workspace-section";

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
          options={[
            { value: "instant" },
            { value: "interval" },
          ]}
          onChange={(value) => onFieldChange("timingType", value)}
        />
      </div>

      <WorkspaceSection title="Timing">
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
      </WorkspaceSection>

      {MODIFIER_GROUPS.map((group) => (
        <WorkspaceSection key={group.label} title={group.label}>
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
                cellClassName={field === "directHealing" ? "ws-cell-healing" : "ws-cell"}
                onChange={(value) => onFieldChange(field, toNumericValue(value))}
              />
            ))}
          </div>
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
