import { capitalize } from "~/lib/string-utils";
import { SCENARIO_ROW_TYPES } from "./scenario-form";
import type { RowType } from "./spell-form";

const SLOTS_PER_ROW = 5;

const ROW_COLORS: Record<string, string> = {
  ranged: "var(--row-ranged)",
  support: "var(--row-support)",
  melee: "var(--row-melee)",
  tank: "var(--row-tank)",
};

interface TargetedSlotInfo {
  enabled: boolean;
  targetedCount: number;
}

export function computeTargetedSlots(config: {
  targetRowCount: number;
  maxTargetsPerRow: number | null;
  targetOnlyAdjacent: boolean;
  allowedRowTypes: RowType[];
}): Map<string, TargetedSlotInfo> {
  const allowedRows =
    config.allowedRowTypes.length === 0
      ? [...SCENARIO_ROW_TYPES]
      : SCENARIO_ROW_TYPES.filter((r) => config.allowedRowTypes.includes(r as RowType));

  const targetsPerRow = Math.min(config.maxTargetsPerRow ?? SLOTS_PER_ROW, SLOTS_PER_ROW);
  const rowsToTarget = Math.min(config.targetRowCount, allowedRows.length);

  const result = new Map<string, TargetedSlotInfo>();
  let rowsTargeted = 0;

  for (const rowType of SCENARIO_ROW_TYPES) {
    if (!allowedRows.includes(rowType)) {
      result.set(rowType, { enabled: false, targetedCount: 0 });
    } else if (rowsTargeted < rowsToTarget) {
      result.set(rowType, { enabled: true, targetedCount: targetsPerRow });
      rowsTargeted++;
    } else {
      result.set(rowType, { enabled: true, targetedCount: 0 });
    }
  }

  return result;
}

interface TargetingGridPreviewProps {
  targetRowCount: number;
  maxTargetsPerRow: number | null;
  targetOnlyAdjacent: boolean;
  allowedRowTypes: RowType[];
}

export function TargetingGridPreview({
  targetRowCount,
  maxTargetsPerRow,
  targetOnlyAdjacent,
  allowedRowTypes,
}: TargetingGridPreviewProps) {
  const slots = computeTargetedSlots({
    targetRowCount,
    maxTargetsPerRow,
    targetOnlyAdjacent,
    allowedRowTypes,
  });

  return (
    <div className="targeting-grid" data-testid="targeting-grid">
      {SCENARIO_ROW_TYPES.map((rowType) => {
        const info = slots.get(rowType)!;
        const color = ROW_COLORS[rowType];

        return (
          <div
            key={rowType}
            className="targeting-grid-row"
            data-testid={`targeting-grid-row-${rowType}`}
            data-enabled={info.enabled ? "true" : "false"}
          >
            <div className="targeting-grid-row-label" style={{ color }}>
              <span className="targeting-grid-dot" style={{ background: color }} />
              {capitalize(rowType)}
            </div>
            <div className="targeting-grid-slots">
              {Array.from({ length: SLOTS_PER_ROW }, (_, i) => (
                <div
                  key={i}
                  className="targeting-grid-slot"
                  data-testid={`targeting-grid-slot-${rowType}-${i}`}
                  data-targeted={i < info.targetedCount ? "true" : "false"}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
