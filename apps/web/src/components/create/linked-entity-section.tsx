import type { ReactNode } from "react";
import { type LinkedEntityOption, LinkedEntityPicker } from "./linked-entity-picker";
import { WorkspaceSection } from "./workspace-section";

interface LinkedEntitySectionProps {
  title: string;
  options: LinkedEntityOption[];
  linkedIds: string[];
  allowDuplicates: boolean;
  searchPlaceholder: string;
  triggerPlaceholder: string;
  listboxLabel: string;
  emptyMessage: string;
  addButtonLabel: string;
  onChange: (nextIds: string[]) => void;
  onEdit: (linkedId: string) => void;
  error?: string;
  pickerTestId: string;
  searchTestId: string;
  addButtonTestId: string;
  emptyTestId: string;
  optionTestIdPrefix: string;
  rowTestIdPrefix: string;
  removeTestIdPrefix: string;
  moveUpTestIdPrefix?: string;
  moveDownTestIdPrefix?: string;
  editTestIdPrefix: string;
  showSequence?: boolean;
  allowReorder?: boolean;
  childrenAfterPicker?: ReactNode;
}

export function LinkedEntitySection({
  title,
  options,
  linkedIds,
  allowDuplicates,
  searchPlaceholder,
  triggerPlaceholder,
  listboxLabel,
  emptyMessage,
  addButtonLabel,
  onChange,
  onEdit,
  error,
  childrenAfterPicker,
  ...pickerProps
}: LinkedEntitySectionProps) {
  return (
    <WorkspaceSection title={title}>
      <LinkedEntityPicker
        options={options}
        linkedIds={linkedIds}
        allowDuplicates={allowDuplicates}
        searchPlaceholder={searchPlaceholder}
        triggerPlaceholder={triggerPlaceholder}
        listboxLabel={listboxLabel}
        emptyMessage={emptyMessage}
        addButtonLabel={addButtonLabel}
        onChange={onChange}
        onEdit={onEdit}
        {...pickerProps}
      />
      {error ? <p className="mt-1 text-sm text-destructive">{error}</p> : null}
      {childrenAfterPicker}
    </WorkspaceSection>
  );
}
