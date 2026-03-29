import { Button } from "~/components/ui/button";
import { LinkedEntityPicker, type LinkedEntityOption } from "./linked-entity-picker";
import {
  getUnitFieldLabel,
  hasUnitFormErrors,
  UNIT_COMBAT_FIELDS,
  UNIT_VITAL_FIELDS,
  validateUnitForm,
  type ItemOption,
  type UnitFormValues,
} from "./unit-form";
import { WorkspaceNumericField } from "./workspace-numeric-field";

interface UnitWorkspaceFormProps {
  mode: "create" | "edit" | "loading";
  formValues: UnitFormValues;
  itemOptions: ItemOption[];
  onFieldChange: (field: string, value: unknown) => void;
  onSave: () => void;
  isSaving: boolean;
  saveError: string | null;
}

export function UnitWorkspaceForm({
  mode,
  formValues,
  itemOptions,
  onFieldChange,
  onSave,
  isSaving,
  saveError,
}: UnitWorkspaceFormProps) {
  const errors = validateUnitForm(formValues);
  const saveLabel = mode === "create" ? "Create Unit" : "Save Changes";
  const linkedItemOptions: LinkedEntityOption[] = itemOptions.map((item) => ({
    id: item.id,
    name: item.name,
  }));

  return (
    <div className="flex flex-col gap-4" data-testid="unit-form-fields">
      <div className="ws-cell-neutral">
        <label htmlFor="entity-name" className="ws-cell-label">
          Name
        </label>
        <input
          id="entity-name"
          data-testid="entity-name-input"
          className="ws-cell-input ws-name-input"
          value={formValues.name}
          placeholder="—"
          aria-invalid={errors.name ? true : undefined}
          onChange={(event) => onFieldChange("name", event.target.value)}
        />
        {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
      </div>

      <div>
        <div className="ws-section-header">Linked Items</div>
        <LinkedEntityPicker
          pickerTestId="unit-item-picker"
          searchTestId="unit-item-picker-search"
          addButtonTestId="unit-add-item-button"
          emptyTestId="unit-item-picker-empty"
          optionTestIdPrefix="unit-item-picker-option"
          rowTestIdPrefix="unit-item-row"
          removeTestIdPrefix="unit-item-remove"
          moveUpTestIdPrefix="unit-item-move-up"
          moveDownTestIdPrefix="unit-item-move-down"
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
        />
      </div>

      <div>
        <div className="ws-section-header">Combat Stats</div>
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
          {UNIT_COMBAT_FIELDS.map((field) => (
            <WorkspaceNumericField
              key={field}
              id={`unit-${field}`}
              testId={`unit-${field}-input`}
              label={getUnitFieldLabel(field)}
              value={formValues[field]}
              error={errors[field]}
              onChange={(value) => onFieldChange(field, value)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="ws-section-header">Vital Stats</div>
        <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4">
          {UNIT_VITAL_FIELDS.map((field) => (
            <WorkspaceNumericField
              key={field}
              id={`unit-${field}`}
              testId={`unit-${field}-input`}
              label={getUnitFieldLabel(field)}
              value={formValues[field]}
              error={errors[field]}
              onChange={(value) => onFieldChange(field, value)}
            />
          ))}
        </div>
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
          disabled={isSaving || hasUnitFormErrors(formValues)}
        >
          {isSaving ? "Saving..." : saveLabel}
        </Button>
      </div>
    </div>
  );
}
