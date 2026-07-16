import { capitalize } from "~/lib/string-utils";

interface WorkspaceRowTypePillProps {
  rowType: "ranged" | "support" | "melee" | "tank";
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  testId?: string;
}

export function WorkspaceRowTypePill({
  rowType,
  active,
  disabled = false,
  onClick,
  testId,
}: WorkspaceRowTypePillProps) {
  return (
    <button
      type="button"
      className={`ws-row-type-pill ${rowType}`}
      data-testid={testId}
      data-active={active ? "true" : "false"}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      {active ? (
        <span data-selected-indicator aria-hidden="true">
          ✓
        </span>
      ) : null}
      {capitalize(rowType)}
    </button>
  );
}
