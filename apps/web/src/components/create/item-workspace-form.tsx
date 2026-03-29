import { Button } from "~/components/ui/button";
import { LinkedEntityPicker, type LinkedEntityOption } from "./linked-entity-picker";
import {
  ITEM_ACTIVATION_FIELDS,
  ITEM_COMBAT_FIELDS,
  ITEM_UTILITY_FIELDS,
  getItemFieldLabel,
  hasItemFormErrors,
  validateItemForm,
  type ItemFormValues,
  type SpellOption,
} from "./item-form";
import { WorkspaceNumericField } from "./workspace-numeric-field";

interface ItemWorkspaceFormProps {
  mode: "create" | "edit" | "loading";
  formValues: ItemFormValues;
  spellOptions: SpellOption[];
  onFieldChange: (field: string, value: unknown) => void;
  onSave: () => void;
  isSaving: boolean;
  saveError: string | null;
}

function sortSpellIdsByName(spellIds: string[], spellOptions: SpellOption[]) {
  const nameMap = new Map(spellOptions.map((spell) => [spell.id, spell.name.toLowerCase()]));

  return [...spellIds].sort((left, right) => {
    const leftName = nameMap.get(left) ?? left;
    const rightName = nameMap.get(right) ?? right;
    return leftName.localeCompare(rightName);
  });
}

export function ItemWorkspaceForm({
  mode,
  formValues,
  spellOptions,
  onFieldChange,
  onSave,
  isSaving,
  saveError,
}: ItemWorkspaceFormProps) {
  const errors = validateItemForm(formValues);
  const saveLabel = mode === "create" ? "Create Item" : "Save Changes";
  const linkedSpellOptions: LinkedEntityOption[] = spellOptions.map((spell) => ({
    id: spell.id,
    name: spell.name,
  }));

  const handleSpellIdsChange = (nextSpellIds: string[]) => {
    onFieldChange("spellIds", sortSpellIdsByName(nextSpellIds, spellOptions));
  };

  return (
    <div className="flex flex-col gap-4" data-testid="item-form-fields">
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
        <div className="ws-section-header">Linked Spells</div>
        <LinkedEntityPicker
          pickerTestId="item-spell-picker"
          searchTestId="item-spell-picker-search"
          addButtonTestId="item-add-spell-button"
          emptyTestId="item-spell-picker-empty"
          optionTestIdPrefix="item-spell-picker-option"
          rowTestIdPrefix="item-spell-row"
          removeTestIdPrefix="item-spell-remove"
          options={linkedSpellOptions}
          linkedIds={formValues.spellIds}
          allowDuplicates={false}
          searchPlaceholder="Search spells..."
          triggerPlaceholder="Select spell"
          listboxLabel="Item spell options"
          emptyMessage="No spells found."
          addButtonLabel="+ Add"
          onChange={handleSpellIdsChange}
        />
        {errors.spellIds ? <p className="text-sm text-destructive mt-1">{errors.spellIds}</p> : null}
      </div>

      <div>
        <div className="ws-section-header">Combat Stats</div>
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
      </div>

      <div>
        <div className="ws-section-header">Utility Stats</div>
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
      </div>

      <div>
        <div className="ws-section-header">Activation Costs</div>
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
          disabled={isSaving || hasItemFormErrors(formValues)}
        >
          {isSaving ? "Saving..." : saveLabel}
        </Button>
      </div>
    </div>
  );
}
