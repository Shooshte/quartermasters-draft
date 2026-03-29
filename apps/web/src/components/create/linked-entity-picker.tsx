import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

export interface LinkedEntityOption {
  id: string;
  name: string;
  badgeText?: string;
  badgeClassName?: string;
}

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
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      return;
    }

    searchInputRef.current?.focus();
  }, [isOpen]);

  const availableOptions = useMemo(() => {
    if (allowDuplicates) {
      return options;
    }

    const linkedSet = new Set(linkedIds);
    return options.filter((option) => !linkedSet.has(option.id));
  }, [allowDuplicates, linkedIds, options]);

  const filteredOptions = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const matchingOptions = searchTerm
      ? availableOptions.filter((option) => option.name.toLowerCase().includes(searchTerm))
      : availableOptions;

    return matchingOptions.slice(0, 5);
  }, [availableOptions, search]);

  const optionMap = useMemo(
    () => new Map(options.map((option) => [option.id, option])),
    [options],
  );

  const selectedOption = optionMap.get(selectedId);

  const handleAdd = () => {
    if (!selectedId) {
      return;
    }

    if (!allowDuplicates && linkedIds.includes(selectedId)) {
      return;
    }

    onChange([...linkedIds, selectedId]);
    setSelectedId("");
    setSearch("");
    setIsOpen(false);
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
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              data-testid={pickerTestId}
              role="combobox"
              aria-expanded={isOpen}
              aria-controls={listboxId}
              className="ws-cell-input"
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid oklch(0.91 0.03 70 / 12%)",
                borderRadius: 6,
                padding: "7px 10px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  textAlign: "left",
                }}
              >
                {selectedOption?.name ?? triggerPlaceholder}
              </span>
              <ChevronsUpDown className="size-4 opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="p-2"
            style={{
              width: "var(--radix-popover-trigger-width)",
              background: "oklch(0.21 0.012 55)",
              borderColor: "oklch(0.91 0.03 70 / 12%)",
            }}
          >
            <div className="flex flex-col gap-2">
              <input
                ref={searchInputRef}
                data-testid={searchTestId}
                value={search}
                placeholder={searchPlaceholder}
                className="ws-cell-input"
                onChange={(event) => setSearch(event.target.value)}
              />
              <div
                id={listboxId}
                role="listbox"
                className="flex flex-col gap-1"
                aria-label={listboxLabel}
              >
                {filteredOptions.length === 0 ? (
                  <div
                    data-testid={emptyTestId}
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground"
                  >
                    {emptyMessage}
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const isSelected = option.id === selectedId;

                    return (
                      <button
                        key={option.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        data-testid={`${optionTestIdPrefix}-${option.id}`}
                        className="flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                        style={{
                          background: isSelected ? "oklch(0.78 0.15 75 / 12%)" : undefined,
                          color: isSelected ? "oklch(0.78 0.15 75)" : undefined,
                        }}
                        onClick={() => {
                          setSelectedId(option.id);
                          setIsOpen(false);
                        }}
                      >
                        <span>{option.name}</span>
                        <Check className={`size-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
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
