interface WorkspaceSegmentToggleProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  testId?: string;
}

export function WorkspaceSegmentToggle({
  options,
  value,
  onChange,
  testId,
}: WorkspaceSegmentToggleProps) {
  return (
    <div className="ws-segment-toggle" data-testid={testId}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className="ws-segment-toggle-option"
          data-testid={testId ? `${testId}-${option.value}` : undefined}
          data-active={option.value === value ? "true" : "false"}
          aria-pressed={option.value === value}
          onClick={() => {
            if (option.value !== value) {
              onChange(option.value);
            }
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
