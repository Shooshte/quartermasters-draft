import type { LinkedEntityOption } from "./linked-entity-picker";
import { LinkedEntitySection } from "./linked-entity-section";
import {
  getUnitFieldLabel,
  hasUnitFormErrors,
  computeUnitStatPreviews,
  type ItemOption,
  UNIT_COMBAT_FIELDS,
  UNIT_VITAL_FIELDS,
  type UnitNumericField,
  type UnitFormValues,
  validateUnitForm,
} from "./unit-form";
import { UnitTargetingCard } from "./unit-targeting-card";
import { WorkspaceNameField } from "./workspace-name-field";
import { WorkspaceNumericField } from "./workspace-numeric-field";
import { WorkspaceSaveFooter } from "./workspace-save-footer";
import { WorkspaceSection } from "./workspace-section";

interface UnitWorkspaceFormProps {
  mode: "create" | "edit" | "loading";
  formValues: UnitFormValues;
  itemOptions: ItemOption[];
  onFieldChange: (field: string, value: unknown) => void;
  onSave: () => void;
  onEditItem?: (itemId: string) => void;
  isSaving: boolean;
  saveError: string | null;
}

export function UnitWorkspaceForm({
  mode,
  formValues,
  itemOptions,
  onFieldChange,
  onSave,
  onEditItem = () => {},
  isSaving,
  saveError,
}: UnitWorkspaceFormProps) {
  const errors = validateUnitForm(formValues);
  const saveLabel = mode === "create" ? "Create Unit" : "Save Changes";
  const statPreviews = computeUnitStatPreviews(formValues, itemOptions);
  const linkedItemOptions: LinkedEntityOption[] = itemOptions.map((item) => ({
    id: item.id,
    name: item.name,
  }));
  const renderStatPreview = (field: UnitNumericField) => {
    const preview = statPreviews[field];
    const bonusPrefix = preview.itemBonus > 0 ? "+" : "";

    return (
      <p
        className="mt-1 min-h-4 text-xs text-muted-foreground"
        data-testid={`unit-${field}-final`}
      >
        <span className="font-medium text-foreground">
          Final {preview.finalValue === null ? "—" : preview.finalValue}
        </span>
        {preview.itemBonus !== 0 ? ` (${bonusPrefix}${preview.itemBonus} items)` : null}
      </p>
    );
  };

  return (
    <div className="flex flex-col gap-4" data-testid="unit-form-fields">
      <WorkspaceNameField
        value={formValues.name}
        error={errors.name}
        onChange={(value) => onFieldChange("name", value)}
      />

      <UnitTargetingCard formValues={formValues} errors={errors} onFieldChange={onFieldChange} />

      <LinkedEntitySection
        title="Linked Items"
        pickerTestId="unit-item-picker"
        searchTestId="unit-item-picker-search"
        addButtonTestId="unit-add-item-button"
        emptyTestId="unit-item-picker-empty"
        optionTestIdPrefix="unit-item-picker-option"
        rowTestIdPrefix="unit-item-row"
        removeTestIdPrefix="unit-item-remove"
        moveUpTestIdPrefix="unit-item-move-up"
        moveDownTestIdPrefix="unit-item-move-down"
        editTestIdPrefix="unit-item-edit"
        options={linkedItemOptions}
        linkedIds={formValues.itemIds}
        allowDuplicates
        searchPlaceholder="Search items..."
        triggerPlaceholder="Select item"
        listboxLabel="Unit item options"
        emptyMessage="No items found."
        addButtonLabel="+ Add"
        showSequence
        allowReorder
        onChange={(nextIds) => onFieldChange("itemIds", nextIds)}
        onEdit={onEditItem}
      />

      <WorkspaceSection title="Combat Stats">
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
          {UNIT_COMBAT_FIELDS.map((field) => (
            <WorkspaceNumericField
              key={field}
              id={`unit-${field}`}
              testId={`unit-${field}-input`}
              label={getUnitFieldLabel(field)}
              value={formValues[field]}
              error={errors[field]}
              supportingContent={renderStatPreview(field)}
              onChange={(value) => onFieldChange(field, value)}
            />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSection title="Vital Stats">
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
          {UNIT_VITAL_FIELDS.map((field) => (
            <WorkspaceNumericField
              key={field}
              id={`unit-${field}`}
              testId={`unit-${field}-input`}
              label={getUnitFieldLabel(field)}
              value={formValues[field]}
              error={errors[field]}
              supportingContent={renderStatPreview(field)}
              onChange={(value) => onFieldChange(field, value)}
            />
          ))}
        </div>
      </WorkspaceSection>

      <WorkspaceSaveFooter
        saveLabel={saveLabel}
        isSaving={isSaving}
        isDisabled={hasUnitFormErrors(formValues)}
        saveError={saveError}
        onSave={onSave}
      />
    </div>
  );
}
