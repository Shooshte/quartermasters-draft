import { Button } from "~/components/ui/button";
import { LinkedEntityPicker, type LinkedEntityOption } from "./linked-entity-picker";
import {
  hasSpellFormErrors,
  spellRecordToFormValues,
  validateSpellForm,
  type SpellFormValues,
  type EffectOption,
  type RowType,
} from "./spell-form";
import { WorkspaceSelectChip } from "./workspace-select-chip";

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

      <div>
        <div className="ws-section-header">Target Selection</div>
        <div className="flex gap-2 items-center flex-wrap">
          <WorkspaceSelectChip
            chipTestId="spell-target-policy-chip"
            selectTestId="spell-target-policy-select"
            className="ws-chip"
            style={{
              background: "oklch(0.78 0.15 75 / 12%)",
              color: "oklch(0.78 0.15 75)",
              border: "1px solid oklch(0.78 0.15 75 / 18%)",
            }}
            value={normalizedFormValues.targetPolicy}
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
          <p className="text-sm text-destructive mt-1">{errors.targetPolicy}</p>
        ) : null}
      </div>

      <div>
        <div className="ws-section-header">Target Scope</div>
        <div className="flex flex-col gap-3">
          <div className="ws-cell-neutral">
            <label htmlFor="spell-target-row-count" className="ws-cell-label">
              Target Row Count
            </label>
            <input
              id="spell-target-row-count"
              data-testid="spell-target-row-count-input"
              type="number"
              min={1}
              className="ws-cell-input"
              value={normalizedFormValues.targetRowCount}
              onChange={(event) => {
                const val = parseInt(event.target.value, 10);
                if (!isNaN(val)) onFieldChange("targetRowCount", val);
              }}
            />
            {errors.targetRowCount ? (
              <p className="text-sm text-destructive">{errors.targetRowCount}</p>
            ) : null}
          </div>

          <div className="ws-cell-neutral">
            <label className="ws-cell-label flex items-center gap-2">
              <input
                type="checkbox"
                data-testid="spell-whole-row-checkbox"
                checked={normalizedFormValues.maxTargetsPerRow === null}
                onChange={() => {
                  if (normalizedFormValues.maxTargetsPerRow === null) {
                    onFieldChange("maxTargetsPerRow", 1);
                  } else {
                    onFieldChange("maxTargetsPerRow", null);
                  }
                }}
              />
              Target whole row
            </label>
          </div>

          {normalizedFormValues.maxTargetsPerRow !== null ? (
            <div className="ws-cell-neutral">
              <label htmlFor="spell-max-targets-per-row" className="ws-cell-label">
                Max Targets Per Row
              </label>
              <input
                id="spell-max-targets-per-row"
                data-testid="spell-max-targets-per-row-input"
                type="number"
                min={1}
                className="ws-cell-input"
                value={normalizedFormValues.maxTargetsPerRow}
                onChange={(event) => {
                  const val = parseInt(event.target.value, 10);
                  if (!isNaN(val)) onFieldChange("maxTargetsPerRow", val);
                }}
              />
              {errors.maxTargetsPerRow ? (
                <p className="text-sm text-destructive">{errors.maxTargetsPerRow}</p>
              ) : null}
            </div>
          ) : null}

          <div className="ws-cell-neutral">
            <label className="ws-cell-label flex items-center gap-2">
              <input
                type="checkbox"
                data-testid="spell-requires-adjacent-checkbox"
                checked={normalizedFormValues.requiresAdjacent}
                disabled={
                  normalizedFormValues.maxTargetsPerRow === null ||
                  normalizedFormValues.maxTargetsPerRow < 2
                }
                onChange={() =>
                  onFieldChange("requiresAdjacent", !normalizedFormValues.requiresAdjacent)
                }
              />
              Requires adjacent targets
            </label>
            {errors.requiresAdjacent ? (
              <p className="text-sm text-destructive">{errors.requiresAdjacent}</p>
            ) : null}
          </div>

          <div className="ws-cell-neutral">
            <span className="ws-cell-label">
              Allowed Row Types{" "}
              <span style={{ opacity: 0.5, textTransform: "none", letterSpacing: 0 }}>
                {normalizedFormValues.allowedRowTypes.length === 0
                  ? "(all rows)"
                  : ""}
              </span>
            </span>
            <div className="flex gap-3 flex-wrap mt-1">
              {(["support", "ranged", "melee", "tank"] as const).map((rowType) => (
                <label key={rowType} className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    data-testid={`spell-allowed-row-${rowType}`}
                    checked={normalizedFormValues.allowedRowTypes.includes(rowType)}
                    onChange={() => {
                      const current = normalizedFormValues.allowedRowTypes;
                      const next = current.includes(rowType)
                        ? current.filter((r: RowType) => r !== rowType)
                        : [...current, rowType];
                      onFieldChange("allowedRowTypes", next);
                    }}
                  />
                  {rowType}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

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
