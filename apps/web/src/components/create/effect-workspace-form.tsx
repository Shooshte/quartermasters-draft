import { Button } from "~/components/ui/button";
import {
  EFFECT_NUMERIC_FIELDS,
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

interface EffectWorkspaceFormProps {
  mode: "create" | "edit" | "loading";
  formValues: EffectFormValues;
  onFieldChange: (field: string, value: unknown) => void;
  onSave: () => void;
  isSaving: boolean;
  saveError: string | null;
}

function ModifierCell({
  field,
  value,
  error,
  disabled = false,
  onChange,
}: {
  field: (typeof EFFECT_NUMERIC_FIELDS)[number];
  value: number | null;
  error?: string;
  disabled?: boolean;
  onChange: (field: string, value: unknown) => void;
}) {
  const hasValue = value !== null && value !== undefined;
  const label = COMPACT_LABELS[field] ?? field;

  return (
    <div className={`eff-cell ${hasValue ? "has-value" : ""}`}>
      <label htmlFor={`effect-${field}`} className="eff-cell-label">
        {label}
      </label>
      <input
        id={`effect-${field}`}
        data-testid={`effect-${field}-input`}
        className="eff-cell-input"
        type="number"
        step={field === "intervalMs" || field === "triggerCount" || field === "durationMs" ? 1 : "any"}
        inputMode="decimal"
        value={value ?? ""}
        disabled={disabled}
        placeholder="—"
        aria-invalid={error ? true : undefined}
        onChange={(e) => {
          const nextValue = e.target.value;
          onChange(field, nextValue === "" ? null : Number(nextValue));
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function TimingCell({
  field,
  value,
  error,
  disabled = false,
  onChange,
}: {
  field: (typeof TIMING_FIELDS)[number];
  value: number | null;
  error?: string;
  disabled?: boolean;
  onChange: (field: string, value: unknown) => void;
}) {
  const hasValue = value !== null && value !== undefined;
  const label = COMPACT_LABELS[field] ?? field;

  return (
    <div className={`eff-cell-neutral ${hasValue ? "has-value" : ""} ${disabled ? "disabled" : ""}`}>
      <label htmlFor={`effect-${field}`} className="eff-cell-label">
        {label}
      </label>
      <input
        id={`effect-${field}`}
        data-testid={`effect-${field}-input`}
        className="eff-cell-input"
        type="number"
        step={1}
        inputMode="decimal"
        value={value ?? ""}
        disabled={disabled}
        placeholder="—"
        aria-invalid={error ? true : undefined}
        onChange={(e) => {
          const nextValue = e.target.value;
          onChange(field, nextValue === "" ? null : Number(nextValue));
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function EffectWorkspaceForm({
  mode,
  formValues,
  onFieldChange,
  onSave,
  isSaving,
  saveError,
}: EffectWorkspaceFormProps) {
  const errors = validateEffectForm(formValues);
  const intervalDisabled = isIntervalFieldDisabled(formValues);
  const saveLabel = mode === "create" ? "Create Effect" : "Save Changes";
  const colorClass = getEffectColorClass(formValues.effectType);

  return (
    <div className={`flex flex-col gap-4 ${colorClass}`} data-testid="effect-form-fields">
      {/* Name cell */}
      <div className="eff-cell-neutral">
        <label htmlFor="entity-name" className="eff-cell-label">
          Name
        </label>
        <input
          id="entity-name"
          data-testid="entity-name-input"
          className="eff-cell-input eff-name-input"
          value={formValues.name}
          placeholder="—"
          aria-invalid={errors.name ? true : undefined}
          onChange={(e) => onFieldChange("name", e.target.value)}
        />
        {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
      </div>

      {/* Effect type & timing type chip selectors */}
      <div className="flex gap-2 items-center flex-wrap">
        <label className="eff-chip eff-chip-type">
          <select
            data-testid="effect-effect-type-select"
            className="eff-chip-select"
            value={formValues.effectType}
            onChange={(e) => onFieldChange("effectType", e.target.value)}
          >
            <option value="buff">buff</option>
            <option value="debuff">debuff</option>
            <option value="healing">healing</option>
            <option value="damage">damage</option>
          </select>
          <span className="eff-chip-arrow">▼</span>
        </label>
        <label className="eff-chip eff-chip-timing">
          <select
            data-testid="effect-timing-type-select"
            className="eff-chip-select"
            value={formValues.timingType}
            onChange={(e) => onFieldChange("timingType", e.target.value)}
          >
            <option value="instant">instant</option>
            <option value="interval">interval</option>
          </select>
          <span className="eff-chip-arrow">▼</span>
        </label>
      </div>

      {/* Timing section */}
      <div data-testid="effect-timing-section">
        <div className="eff-section-header">Timing</div>
        <div className="grid grid-cols-3 gap-1.5">
          <TimingCell
            field="durationMs"
            value={formValues.durationMs}
            error={errors.durationMs}
            onChange={onFieldChange}
          />
          <TimingCell
            field="intervalMs"
            value={formValues.intervalMs}
            error={errors.intervalMs}
            disabled={intervalDisabled}
            onChange={onFieldChange}
          />
          <TimingCell
            field="triggerCount"
            value={formValues.triggerCount}
            error={errors.triggerCount}
            disabled={intervalDisabled}
            onChange={onFieldChange}
          />
        </div>
      </div>

      {/* Modifier groups */}
      {MODIFIER_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="eff-section-header">{group.label}</div>
          <div className={`grid gap-1.5 ${group.cols === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
            {group.fields.map((field) => (
              <ModifierCell
                key={field}
                field={field}
                value={formValues[field]}
                error={errors[field]}
                onChange={onFieldChange}
              />
            ))}
          </div>
        </div>
      ))}

      {saveError && (
        <p className="text-sm text-destructive" data-testid="entity-save-error">
          {saveError}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          data-testid="entity-save-button"
          onClick={onSave}
          disabled={isSaving || hasEffectFormErrors(formValues)}
        >
          {isSaving ? "Saving..." : saveLabel}
        </Button>
      </div>
    </div>
  );
}
