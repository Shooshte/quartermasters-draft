import { useState } from "react";
import { Button } from "~/components/ui/button";
import { type EntityPickerOption, EntityPickerPopover } from "./entity-picker-popover";
import type { ScenarioRowType } from "./scenario-form";

const ROW_CONFIG: Record<ScenarioRowType, { label: string; icon: string }> = {
  tank: { label: "Tank", icon: "T" },
  melee: { label: "Melee", icon: "M" },
  ranged: { label: "Ranged", icon: "R" },
  support: { label: "Support", icon: "S" },
};

interface ScenarioRowEditorProps {
  rowType: ScenarioRowType;
  unitIds: string[];
  unitOptions: EntityPickerOption[];
  onChange: (unitIds: string[]) => void;
}

export function ScenarioRowEditor({
  rowType,
  unitIds,
  unitOptions,
  onChange,
}: ScenarioRowEditorProps) {
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const { label, icon } = ROW_CONFIG[rowType];
  const unitNameById = new Map(unitOptions.map((option) => [option.id, option.name]));

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= unitIds.length) {
      return;
    }

    const nextUnitIds = [...unitIds];
    [nextUnitIds[index], nextUnitIds[targetIndex]] = [nextUnitIds[targetIndex], nextUnitIds[index]];
    onChange(nextUnitIds);
  };

  const handleAdd = () => {
    if (!selectedUnitId) {
      return;
    }

    onChange([...unitIds, selectedUnitId]);
    setSelectedUnitId("");
  };

  return (
    <div className={`sw-row ${rowType}`} data-testid={`scenario-row-${rowType}`}>
      <div className="sw-row-header">
        <div className="sw-row-icon" aria-hidden="true">
          {icon}
        </div>
        <span className="sw-row-label">{label}</span>
        <span className="sw-row-count">{`${unitIds.length} unit${unitIds.length === 1 ? "" : "s"}`}</span>
      </div>

      <div className="sw-row-body">
        {unitIds.length === 0 ? <div className="sw-row-empty">No units assigned</div> : null}

        {unitIds.map((unitId, index) => {
          const slot = index + 1;
          const isFirst = index === 0;
          const isLast = index === unitIds.length - 1;

          return (
            <div
              key={`${rowType}-${slot}-${unitId}`}
              className="sw-slot"
              data-testid={`scenario-row-${rowType}-slot-${slot}`}
            >
              <span className="sw-slot-number">{slot}</span>
              <span className="sw-slot-name">{unitNameById.get(unitId) ?? unitId}</span>
              <div className="sw-slot-actions">
                <button
                  type="button"
                  data-testid={`scenario-row-${rowType}-move-up-${slot}`}
                  className={`sw-slot-btn ${isFirst ? "disabled" : ""}`}
                  disabled={isFirst}
                  onClick={() => handleMove(index, "up")}
                >
                  ↑
                </button>
                <button
                  type="button"
                  data-testid={`scenario-row-${rowType}-move-down-${slot}`}
                  className={`sw-slot-btn ${isLast ? "disabled" : ""}`}
                  disabled={isLast}
                  onClick={() => handleMove(index, "down")}
                >
                  ↓
                </button>
                <button
                  type="button"
                  data-testid={`scenario-row-${rowType}-remove-${slot}`}
                  className="sw-slot-btn remove"
                  onClick={() =>
                    onChange(unitIds.filter((_, currentIndex) => currentIndex !== index))
                  }
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}

        <div className="sw-picker">
          <EntityPickerPopover
            pickerTestId={`scenario-row-${rowType}-picker`}
            searchTestId={`scenario-row-${rowType}-picker-search`}
            emptyTestId={`scenario-row-${rowType}-picker-empty`}
            optionTestIdPrefix={`scenario-row-${rowType}-picker-option`}
            options={unitOptions}
            selectedId={selectedUnitId}
            onSelect={setSelectedUnitId}
            searchPlaceholder="Search units..."
            triggerPlaceholder="Select unit..."
            listboxLabel={`${label} row unit options`}
            emptyMessage="No units found"
            triggerClassName="sw-picker-trigger"
            popoverClassName="sw-picker-popover"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid={`scenario-row-${rowType}-picker-add`}
            className="sw-picker-add"
            disabled={!selectedUnitId}
            onClick={handleAdd}
          >
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}
