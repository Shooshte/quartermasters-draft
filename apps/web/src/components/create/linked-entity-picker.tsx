import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { EntityPickerPopover, type EntityPickerOption } from "./entity-picker-popover";

export interface LinkedEntityOption extends EntityPickerOption {}

interface LinkedEntityPickerProps {
  pickerTestId: string;
  searchTestId: string;
  addButtonTestId: string;
  emptyTestId: string;
  optionTestIdPrefix: string;
  rowTestIdPrefix: string;
  removeTestIdPrefix: string;
  moveUpTestIdPrefix?: string;
  moveDownTestIdPrefix?: string;
  options: LinkedEntityOption[];
  linkedIds: string[];
  allowDuplicates: boolean;
  searchPlaceholder: string;
  triggerPlaceholder: string;
  listboxLabel: string;
  emptyMessage: string;
  addButtonLabel: string;
  showSequence?: boolean;
  allowReorder?: boolean;
  onChange: (nextIds: string[]) => void;
}

export function LinkedEntityPicker({
  pickerTestId,
  searchTestId,
  addButtonTestId,
  emptyTestId,
  optionTestIdPrefix,
  rowTestIdPrefix,
  removeTestIdPrefix,
  moveUpTestIdPrefix,
  moveDownTestIdPrefix,
  options,
  linkedIds,
  allowDuplicates,
  searchPlaceholder,
  triggerPlaceholder,
  listboxLabel,
  emptyMessage,
  addButtonLabel,
  showSequence = false,
  allowReorder = false,
  onChange,
}: LinkedEntityPickerProps) {
  const [selectedId, setSelectedId] = useState("");

  const availableOptions = useMemo(() => {
    if (allowDuplicates) {
      return options;
    }

    const linkedSet = new Set(linkedIds);
    return options.filter((option) => !linkedSet.has(option.id));
  }, [allowDuplicates, linkedIds, options]);

  const optionMap = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );

  const handleAdd = () => {
    if (!selectedId) {
      return;
    }

    if (!allowDuplicates && linkedIds.includes(selectedId)) {
      return;
    }

    onChange([...linkedIds, selectedId]);
    setSelectedId("");
  };

  const handleRemove = (index: number) => {
    onChange(linkedIds.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= linkedIds.length) {
      return;
    }

    const nextIds = [...linkedIds];
    [nextIds[index], nextIds[targetIndex]] = [nextIds[targetIndex], nextIds[index]];
    onChange(nextIds);
  };

  return (
    <div>
      <div className="flex gap-2 items-center mb-2.5">
        <EntityPickerPopover
          pickerTestId={pickerTestId}
          searchTestId={searchTestId}
          emptyTestId={emptyTestId}
          optionTestIdPrefix={optionTestIdPrefix}
          options={availableOptions}
          selectedId={selectedId}
          onSelect={setSelectedId}
          searchPlaceholder={searchPlaceholder}
          triggerPlaceholder={triggerPlaceholder}
          listboxLabel={listboxLabel}
          emptyMessage={emptyMessage}
          triggerClassName="ws-linked-picker-trigger"
          popoverClassName="ws-linked-picker-popover"
        />
        <Button
          variant="outline"
          size="sm"
          data-testid={addButtonTestId}
          onClick={handleAdd}
        >
          {addButtonLabel}
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        {linkedIds.map((linkedId, index) => {
          const option = optionMap.get(linkedId);
          const isFirst = index === 0;
          const isLast = index === linkedIds.length - 1;

          return (
            <div
              key={`${linkedId}-${index}`}
              className="flex items-center gap-2"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid oklch(0.91 0.03 70 / 12%)",
                borderRadius: 6,
                padding: "6px 8px",
              }}
              data-testid={`${rowTestIdPrefix}-${index}`}
            >
              {showSequence ? (
                <span
                  style={{
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "'Cinzel', serif",
                    fontSize: 12,
                    color: "oklch(0.78 0.15 75)",
                    background: "oklch(0.78 0.15 75 / 10%)",
                    borderRadius: "50%",
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </span>
              ) : null}

              <span
                style={{
                  flex: 1,
                  fontSize: 15,
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {option?.name ?? linkedId}
              </span>

              {option?.badgeText && option.badgeClassName ? (
                <span className={option.badgeClassName}>{option.badgeText}</span>
              ) : null}

              <div className="flex gap-0.5" style={{ flexShrink: 0 }}>
                {allowReorder ? (
                  <>
                    <button
                      data-testid={`${moveUpTestIdPrefix}-${index}`}
                      className="inline-flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                      style={{ width: 24, height: 24, fontSize: 12, opacity: isFirst ? 0.2 : 1 }}
                      disabled={isFirst}
                      onClick={() => handleMove(index, "up")}
                    >
                      ↑
                    </button>
                    <button
                      data-testid={`${moveDownTestIdPrefix}-${index}`}
                      className="inline-flex items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
                      style={{ width: 24, height: 24, fontSize: 12, opacity: isLast ? 0.2 : 1 }}
                      disabled={isLast}
                      onClick={() => handleMove(index, "down")}
                    >
                      ↓
                    </button>
                  </>
                ) : null}
                <button
                  data-testid={`${removeTestIdPrefix}-${index}`}
                  className="inline-flex items-center justify-center rounded text-muted-foreground hover:text-destructive"
                  style={{ width: 24, height: 24, fontSize: 12 }}
                  onClick={() => handleRemove(index)}
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
