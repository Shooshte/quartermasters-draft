import { Button } from "~/components/ui/button";
import { LinkedEntityPicker, type LinkedEntityOption } from "./linked-entity-picker";
import {
  hasSpellFormErrors,
  spellRecordToFormValues,
  validateSpellForm,
  type SpellFormValues,
  type EffectOption,
} from "./spell-form";
import { TargetingCard } from "./targeting-card";

interface SpellWorkspaceFormProps {
  mode: "create" | "edit" | "loading";
  formValues: SpellFormValues;
  effectOptions: EffectOption[];
  onFieldChange: (field: string, value: unknown) => void;
  onSave: () => void;
  isSaving: boolean;
  saveError: string | null;
}

function getEffectBadgeClass(effectType: string): string {
  switch (effectType) {
    case "damage":
      return "spell-effect-badge spell-effect-badge-damage";
    case "healing":
      return "spell-effect-badge spell-effect-badge-healing";
    case "buff":
      return "spell-effect-badge spell-effect-badge-buff";
    case "debuff":
      return "spell-effect-badge spell-effect-badge-debuff";
    default:
      return "spell-effect-badge";
  }
}

export function SpellWorkspaceForm({
  mode,
  formValues,
  effectOptions,
  onFieldChange,
  onSave,
  isSaving,
  saveError,
}: SpellWorkspaceFormProps) {
  const normalizedFormValues = spellRecordToFormValues(formValues);
  const errors = validateSpellForm(normalizedFormValues);
  const saveLabel = mode === "create" ? "Create Spell" : "Save Changes";
  const linkedEffectOptions: LinkedEntityOption[] = effectOptions.map((effect) => ({
    id: effect.id,
    name: effect.name,
    badgeText: effect.effectType,
    badgeClassName: getEffectBadgeClass(effect.effectType),
  }));

  return (
    <div className="flex flex-col gap-4" data-testid="spell-form-fields">
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

      <div className="ws-cell-neutral">
        <label htmlFor="spell-description" className="ws-cell-label">
          Description{" "}
          <span style={{ opacity: 0.5, textTransform: "none", letterSpacing: 0 }}>
            (optional)
          </span>
        </label>
        <textarea
          id="spell-description"
          data-testid="spell-description-input"
          className="ws-cell-input"
          style={{ minHeight: 48, resize: "vertical", lineHeight: 1.5 }}
          value={normalizedFormValues.description}
          placeholder="—"
          onChange={(event) => onFieldChange("description", event.target.value)}
        />
      </div>

      <TargetingCard
        formValues={normalizedFormValues}
        errors={errors}
        onFieldChange={onFieldChange}
      />

      <div>
        <div className="ws-section-header">Spell Effects</div>
        <LinkedEntityPicker
          pickerTestId="spell-effect-picker"
          searchTestId="spell-effect-picker-search"
          addButtonTestId="spell-add-effect-button"
          emptyTestId="spell-effect-picker-empty"
          optionTestIdPrefix="spell-effect-picker-option"
          rowTestIdPrefix="spell-effect-row"
          removeTestIdPrefix="spell-effect-remove"
          moveUpTestIdPrefix="spell-effect-move-up"
          moveDownTestIdPrefix="spell-effect-move-down"
          options={linkedEffectOptions}
          linkedIds={normalizedFormValues.effectIds}
          allowDuplicates
          searchPlaceholder="Search effects..."
          triggerPlaceholder="Select effect"
          listboxLabel="Spell effect options"
          emptyMessage="No effects found."
          addButtonLabel="+ Add"
          showSequence
          allowReorder
          onChange={(nextIds) => onFieldChange("effectIds", nextIds)}
        />
        {errors.effectIds ? (
          <p className="text-sm text-destructive mt-1">{errors.effectIds}</p>
        ) : null}
      </div>

      {saveError ? (
        <p className="text-sm text-destructive" data-testid="entity-save-error">
          {saveError}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          data-testid="entity-save-button"
          onClick={onSave}
          disabled={isSaving || hasSpellFormErrors(normalizedFormValues)}
        >
          {isSaving ? "Saving..." : saveLabel}
        </Button>
      </div>
    </div>
  );
}
