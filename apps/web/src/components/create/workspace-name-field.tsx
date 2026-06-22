interface WorkspaceNameFieldProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function WorkspaceNameField({ value, error, onChange }: WorkspaceNameFieldProps) {
  return (
    <div className="ws-cell-neutral">
      <label htmlFor="entity-name" className="ws-cell-label">
        Name
      </label>
      <input
        id="entity-name"
        data-testid="entity-name-input"
        className="ws-cell-input ws-name-input"
        value={value}
        placeholder="—"
        aria-invalid={error ? true : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
