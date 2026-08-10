import type { ReactNode } from "react";

interface WorkspaceNumericFieldProps {
  id: string;
  testId: string;
  label: string;
  value: string | number | null | undefined;
  error?: string;
  disabled?: boolean;
  step?: number | "any";
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  cellClassName?: string;
  supportingContent?: ReactNode;
  onChange: (value: string) => void;
}

export function WorkspaceNumericField({
  id,
  testId,
  label,
  value,
  error,
  disabled = false,
  step = "any",
  inputMode = "decimal",
  cellClassName = "ws-cell-neutral",
  supportingContent,
  onChange,
}: WorkspaceNumericFieldProps) {
  const stringValue = value ?? "";
  const hasValue = stringValue !== "";

  return (
    <div
      className={`${cellClassName} ${hasValue ? "has-value" : ""} ${disabled ? "disabled" : ""}`}
    >
      <label htmlFor={id} className="ws-cell-label">
        {label}
      </label>
      <input
        id={id}
        data-testid={testId}
        className="ws-cell-input"
        type="number"
        step={step}
        inputMode={inputMode}
        value={stringValue}
        disabled={disabled}
        placeholder="0"
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {supportingContent}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
