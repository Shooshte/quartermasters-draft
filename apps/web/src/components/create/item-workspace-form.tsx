import {
  type EffectOption,
  getItemFieldLabel,
  hasItemFormErrors,
  ITEM_ACTIVATION_FIELDS,
  ITEM_COMBAT_FIELDS,
  ITEM_UTILITY_FIELDS,
  type ItemFormValues,
  validateItemForm,
} from "./item-form";
import type { LinkedEntityOption } from "./linked-entity-picker";
import { LinkedEntitySection } from "./linked-entity-section";
import type { ScenarioRowType } from "./scenario-form";
import { WorkspaceNameField } from "./workspace-name-field";
import { WorkspaceNumericField } from "./workspace-numeric-field";
import { WorkspaceRowTypePill } from "./workspace-row-type-pill";
import { WorkspaceSaveFooter } from "./workspace-save-footer";
import { WorkspaceSection } from "./workspace-section";

interface ItemWorkspaceFormProps {
  mode: "create" | "edit" | "loading";
  formValues: ItemFormValues;
  effectOptions: EffectOption[];
  onFieldChange: (field: string, value: unknown) => void;
  onSave: () => void;
  onEditEffect?: (effectId: string) => void;
  isSaving: boolean;
  saveError: string | null;
}

const ITEM_PLACEMENT_ROW_TYPES: readonly ScenarioRowType[] = ["tank", "melee", "ranged", "support"];

function getEffectBadgeClass(effectType: string): string {
  switch (effectType) {
    case "damage":
      return "item-effect-badge item-effect-badge-damage";
    case "healing":
      return "item-effect-badge item-effect-badge-healing";
    case "buff":
      return "item-effect-badge item-effect-badge-buff";
    case "debuff":
      return "item-effect-badge item-effect-badge-debuff";
    default:
      return "item-effect-badge";
  }
}

export function ItemWorkspaceForm({
  mode,
  formValues,
  effectOptions,
  onFieldChange,
  onSave,
  onEditEffect = () => {},
  isSaving,
  saveError,
}: ItemWorkspaceFormProps) {
  const errors = validateItemForm(formValues);
  const saveLabel = mode === "create" ? "Create Item" : "Save Changes";
  const linkedEffectOptions: LinkedEntityOption[] = effectOptions.map((effect) => ({
    id: effect.id,
    name: effect.name,
    badgeText: effect.effectType,
    badgeClassName: getEffectBadgeClass(effect.effectType),
  }));

  const toggleAllowedRow = (rowType: ScenarioRowType) => {
    const currentRows = new Set(formValues.allowedRowTypes);
    if (currentRows.has(rowType)) {
      currentRows.delete(rowType);
    } else {
      currentRows.add(rowType);
    }

    onFieldChange(
      "allowedRowTypes",
      ITEM_PLACEMENT_ROW_TYPES.filter((candidate) => currentRows.has(candidate)),
    );
  };

  return (
    <div className="flex flex-col gap-4" data-testid="item-form-fields">
      <WorkspaceNameField
        value={formValues.name}
        error={errors.name}
        onChange={(value) => onFieldChange("name", value)}
      />

      <LinkedEntitySection
        title="Linked Effects"
        options={linkedEffectOptions}
        linkedIds={formValues.effectIds}
        allowDuplicates
        searchPlaceholder="Search effects..."
        triggerPlaceholder="Select effect"
        listboxLabel="Item effect options"
        emptyMessage="No effects found."
        addButtonLabel="+ Add"
        error={errors.effectIds}
        onChange={(nextIds) => onFieldChange("effectIds", nextIds)}
        pickerTestId="item-effect-picker"
        searchTestId="item-effect-picker-search"
        addButtonTestId="item-add-effect-button"
        emptyTestId="item-effect-picker-empty"
        optionTestIdPrefix="item-effect-picker-option"
        rowTestIdPrefix="item-effect-row"
        removeTestIdPrefix="item-effect-remove"
        moveUpTestIdPrefix="item-effect-move-up"
        moveDownTestIdPrefix="item-effect-move-down"
        editTestIdPrefix="item-effect-edit"
        showSequence
        allowReorder
        onEdit={onEditEffect}
      />

      <WorkspaceSection title="Allowed deployment rows">
        <div className="targeting-row-options">
          {ITEM_PLACEMENT_ROW_TYPES.map((rowType) => (
            <WorkspaceRowTypePill
              key={rowType}
              rowType={rowType}
              active={formValues.allowedRowTypes.includes(rowType)}
              testId={`item-allowed-row-${rowType}`}
              onClick={() => toggleAllowedRow(rowType)}
            />
          ))}
        </div>
        <p className="targeting-ctrl-help">
          Leave every row unselected to allow deployment in any row.
        </p>
        {errors.allowedRowTypes ? (
          <p className="text-sm text-destructive">{errors.allowedRowTypes}</p>
        ) : null}
      </WorkspaceSection>

      <WorkspaceSection title="Combat Stats">
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
          {ITEM_COMBAT_FIELDS.map((field) => (
            <WorkspaceNumericField
              key={field}
              id={`item-${field}`}
              testId={`item-${field}-input`}
              label={getItemFieldLabel(field)}
              value={formValues[field]}
              error={errors[field]}
              onChange={(value) => onFieldChange(field, value)}
            />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="Utility Stats">
        <div className="grid grid-cols-2 gap-1.5">
          {ITEM_UTILITY_FIELDS.map((field) => (
            <WorkspaceNumericField
              key={field}
              id={`item-${field}`}
              testId={`item-${field}-input`}
              label={getItemFieldLabel(field)}
              value={formValues[field]}
              error={errors[field]}
              onChange={(value) => onFieldChange(field, value)}
            />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="Activation Costs">
        <div className="grid grid-cols-2 gap-1.5">
          {ITEM_ACTIVATION_FIELDS.map((field) => (
            <WorkspaceNumericField
              key={field}
              id={`item-${field}`}
              testId={`item-${field}-input`}
              label={getItemFieldLabel(field)}
              value={formValues[field]}
              error={errors[field]}
              onChange={(value) => onFieldChange(field, value)}
            />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSaveFooter
        saveLabel={saveLabel}
        isSaving={isSaving}
        isDisabled={hasItemFormErrors(formValues)}
        saveError={saveError}
        onSave={onSave}
      />
    </div>
  );
}
