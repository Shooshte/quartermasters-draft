import { useRef, type CSSProperties, type MouseEvent, type RefObject } from "react";
import { cn } from "~/lib/utils";

export interface WorkspaceSelectOption {
  value: string;
  label?: string;
}

interface WorkspaceSelectChipProps {
  chipTestId: string;
  selectTestId: string;
  value: string;
  options: WorkspaceSelectOption[];
  onChange: (value: string) => void;
  className?: string;
  style?: CSSProperties;
  disabled?: boolean;
  includeEmptyOption?: boolean;
}

function createChipMouseDownHandler(
  selectRef: RefObject<HTMLSelectElement | null>,
) {
  return (event: MouseEvent<HTMLLabelElement>) => {
    if (event.target instanceof HTMLSelectElement) {
      return;
    }

    event.preventDefault();

    const select = selectRef.current;
    if (!select) {
      return;
    }

    select.focus();
    try {
      select.showPicker?.();
    } catch {
      // Keep focus on the native select so keyboard fallback still works.
    }
  };
}

export function WorkspaceSelectChip({
  chipTestId,
  selectTestId,
  value,
  options,
  onChange,
  className,
  style,
  disabled = false,
  includeEmptyOption = false,
}: WorkspaceSelectChipProps) {
  const selectRef = useRef<HTMLSelectElement>(null);

  return (
    <label
      className={cn("ws-chip", className)}
      style={style}
      data-testid={chipTestId}
      onMouseDown={createChipMouseDownHandler(selectRef)}
    >
      <select
        ref={selectRef}
        data-testid={selectTestId}
        className="ws-chip-select"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {includeEmptyOption ? <option value="" disabled hidden /> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label ?? option.value}
          </option>
        ))}
      </select>
      <span className="ws-chip-arrow">▼</span>
    </label>
  );
}
