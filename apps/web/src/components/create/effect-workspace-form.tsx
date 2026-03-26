import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import {
  EFFECT_NUMERIC_FIELDS,
  hasEffectFormErrors,
  isIntervalFieldDisabled,
  validateEffectForm,
  type EffectFormValues,
} from "./effect-form";

interface EffectWorkspaceFormProps {
  mode: "create" | "edit" | "loading";
  formValues: EffectFormValues;
  onFieldChange: (field: string, value: unknown) => void;
  onSave: () => void;
  isSaving: boolean;
  saveError: string | null;
}

const NUMERIC_LABELS: Record<(typeof EFFECT_NUMERIC_FIELDS)[number], string> = {
  intervalMs: "Interval Ms",
  triggerCount: "Trigger Count",
  durationMs: "Duration Ms",
  meleeDmg: "Melee Dmg",
  health: "Health",
  rangedDmg: "Ranged Dmg",
  manaRegen: "Mana Regen",
  spellDmg: "Spell Dmg",
  speed: "Speed",
  dodge: "Dodge",
  criticalChance: "Critical Chance",
  directHealing: "Direct Healing",
  directMeleeDmg: "Direct Melee Dmg",
  directRangedDmg: "Direct Ranged Dmg",
  directSpellDmg: "Direct Spell Dmg",
};

function NumericField({
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
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={`effect-${field}`}>{NUMERIC_LABELS[field]}</Label>
      <Input
        id={`effect-${field}`}
        data-testid={`effect-${field}-input`}
        type="number"
        step={field === "intervalMs" || field === "triggerCount" || field === "durationMs" ? 1 : "any"}
        inputMode="decimal"
        value={value ?? ""}
        disabled={disabled}
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

  return (
    <div className="flex flex-col gap-6" data-testid="effect-form-fields">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="entity-name">Name</Label>
          <Input
            id="entity-name"
            data-testid="entity-name-input"
            value={formValues.name}
            aria-invalid={errors.name ? true : undefined}
            onChange={(e) => onFieldChange("name", e.target.value)}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="effect-timing-type">Timing Type</Label>
            <Select
              id="effect-timing-type"
              data-testid="effect-timing-type-select"
              value={formValues.timingType}
              onChange={(e) => onFieldChange("timingType", e.target.value)}
            >
              <option value="instant">instant</option>
              <option value="interval">interval</option>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="effect-effect-type">Effect Type</Label>
            <Select
              id="effect-effect-type"
              data-testid="effect-effect-type-select"
              value={formValues.effectType}
              onChange={(e) => onFieldChange("effectType", e.target.value)}
            >
              <option value="buff">buff</option>
              <option value="debuff">debuff</option>
              <option value="healing">healing</option>
              <option value="damage">damage</option>
            </Select>
          </div>
        </div>

        <NumericField
          field="durationMs"
          value={formValues.durationMs}
          error={errors.durationMs}
          onChange={onFieldChange}
        />
      </div>

      <div className="flex flex-col gap-4 rounded border border-border/50 p-4" data-testid="effect-timing-section">
        <div>
          <h3 className="text-sm font-medium">Timing</h3>
          {intervalDisabled && (
            <p className="text-sm text-muted-foreground" data-testid="effect-interval-helper">
              Interval fields apply only to interval timing and are disabled for instant effects.
            </p>
          )}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <NumericField
            field="intervalMs"
            value={formValues.intervalMs}
            error={errors.intervalMs}
            disabled={intervalDisabled}
            onChange={onFieldChange}
          />
          <NumericField
            field="triggerCount"
            value={formValues.triggerCount}
            error={errors.triggerCount}
            disabled={intervalDisabled}
            onChange={onFieldChange}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded border border-border/50 p-4">
        <h3 className="text-sm font-medium">Modifiers</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {EFFECT_NUMERIC_FIELDS.filter((field) => !["intervalMs", "triggerCount", "durationMs"].includes(field)).map((field) => (
            <NumericField
              key={field}
              field={field}
              value={formValues[field]}
              error={errors[field]}
              onChange={onFieldChange}
            />
          ))}
        </div>
      </div>

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
