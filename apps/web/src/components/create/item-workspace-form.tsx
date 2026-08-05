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
import { WorkspaceNameField } from "./workspace-name-field";
import { WorkspaceNumericField } from "./workspace-numeric-field";
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
