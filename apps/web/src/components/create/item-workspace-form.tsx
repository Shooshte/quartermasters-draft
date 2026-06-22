import {
  getItemFieldLabel,
  hasItemFormErrors,
  ITEM_ACTIVATION_FIELDS,
  ITEM_COMBAT_FIELDS,
  ITEM_UTILITY_FIELDS,
  type ItemFormValues,
  type SpellOption,
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
      <WorkspaceNameField
        value={formValues.name}
        error={errors.name}
        onChange={(value) => onFieldChange("name", value)}
      />

      <LinkedEntitySection
        title="Linked Spells"
        options={linkedSpellOptions}
        linkedIds={formValues.spellIds}
        allowDuplicates={false}
        searchPlaceholder="Search spells..."
        triggerPlaceholder="Select spell"
        listboxLabel="Item spell options"
        emptyMessage="No spells found."
        addButtonLabel="+ Add"
        error={errors.spellIds}
        onChange={handleSpellIdsChange}
        pickerTestId="item-spell-picker"
        searchTestId="item-spell-picker-search"
        addButtonTestId="item-add-spell-button"
        emptyTestId="item-spell-picker-empty"
        optionTestIdPrefix="item-spell-picker-option"
        rowTestIdPrefix="item-spell-row"
        removeTestIdPrefix="item-spell-remove"
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
