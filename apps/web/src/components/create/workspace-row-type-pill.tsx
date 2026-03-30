import { capitalize } from "~/lib/string-utils";

interface WorkspaceRowTypePillProps {
  rowType: "ranged" | "support" | "melee" | "tank";
  active: boolean;
  onClick: () => void;
  testId?: string;
}

export function WorkspaceRowTypePill({
  rowType,
  active,
  onClick,
  testId,
}: WorkspaceRowTypePillProps) {
  return (
    <button
      type="button"
      className={`ws-row-type-pill ${rowType}`}
      data-testid={testId}
      data-active={active ? "true" : "false"}
      onClick={onClick}
    >
      {capitalize(rowType)}
    </button>
  );
}
