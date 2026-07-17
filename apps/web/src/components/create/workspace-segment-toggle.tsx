interface WorkspaceSegmentToggleProps {
  options: { value: string; label: string; disabled?: boolean }[];
  value: string;
  onChange: (value: string) => void;
  testId?: string;
  ariaLabel?: string;
}

export function WorkspaceSegmentToggle({
  options,
  value,
  onChange,
  testId,
  ariaLabel,
}: WorkspaceSegmentToggleProps) {
  return (
    <fieldset className="ws-segment-toggle" data-testid={testId}>
      {ariaLabel ? <legend className="sr-only">{ariaLabel}</legend> : null}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="ws-segment-toggle-option"
          data-testid={testId ? `${testId}-${option.value}` : undefined}
          data-active={option.value === value ? "true" : "false"}
          aria-pressed={option.value === value}
          disabled={option.disabled}
          onClick={() => {
            if (!option.disabled && option.value !== value) {
              onChange(option.value);
            }
          }}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}
