import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";

export interface EntityPickerOption {
  id: string;
  name: string;
  badgeText?: string;
  badgeClassName?: string;
}

interface EntityPickerPopoverProps {
  pickerTestId: string;
  searchTestId: string;
  emptyTestId: string;
  optionTestIdPrefix: string;
  options: EntityPickerOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  searchPlaceholder: string;
  triggerPlaceholder: string;
  listboxLabel: string;
  emptyMessage: string;
  triggerClassName?: string;
  popoverClassName?: string;
}

function filterEntityPickerOptions(options: EntityPickerOption[], search: string) {
  const searchTerm = search.trim().toLowerCase();

  if (!searchTerm) {
    return options.slice(0, 5);
  }

  return options
    .filter((option) => option.name.toLowerCase().includes(searchTerm))
    .slice(0, 5);
}

export function EntityPickerPopover({
  pickerTestId,
  searchTestId,
  emptyTestId,
  optionTestIdPrefix,
  options,
  selectedId,
  onSelect,
  searchPlaceholder,
  triggerPlaceholder,
  listboxLabel,
  emptyMessage,
  triggerClassName,
  popoverClassName,
}: EntityPickerPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!isOpen) {
      setSearch("");
      return;
    }

    searchInputRef.current?.focus();
  }, [isOpen]);

  const filteredOptions = useMemo(() => filterEntityPickerOptions(options, search), [options, search]);

  const selectedOption = options.find((option) => option.id === selectedId);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={pickerTestId}
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={listboxId}
          className={triggerClassName}
        >
          <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-left">
            {selectedOption?.name ?? triggerPlaceholder}
          </span>
          <ChevronsUpDown className="size-4 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={popoverClassName}
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <div className="flex flex-col gap-2">
          <input
            ref={searchInputRef}
            data-testid={searchTestId}
            value={search}
            placeholder={searchPlaceholder}
            className="sw-picker-search"
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
                className="rounded-md px-3 py-2 text-sm text-muted-foreground italic"
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
                    className={`sw-picker-option ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      onSelect(option.id);
                      setIsOpen(false);
                    }}
                  >
                    <span>{option.name}</span>
                    <span className={`check ${isSelected ? "opacity-100" : "opacity-0"}`}>
                      <Check className="size-4" />
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
