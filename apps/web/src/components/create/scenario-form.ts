export const SCENARIO_ROW_TYPES = ["ranged", "support", "melee", "tank"] as const;

export type ScenarioRowType = (typeof SCENARIO_ROW_TYPES)[number];

export interface ScenarioFormRow {
  rowType: ScenarioRowType;
  unitIds: string[];
}

export interface ScenarioFormValues {
  name: string;
  rows: ScenarioFormRow[];
}

interface ScenarioAssignmentRecord {
  unitId: string;
  position: number;
}

interface ScenarioRowRecord {
  rowType: string;
  assignments?: ScenarioAssignmentRecord[] | null;
}

interface ScenarioRecord {
  name?: string | null;
  rows?: ScenarioRowRecord[] | null;
}

export interface NormalizedScenarioInput {
  name: string;
  rows: ScenarioFormRow[];
}

export interface ScenarioFieldErrors {
  name?: string;
  rows?: string;
}

function isScenarioRowType(value: string): value is ScenarioRowType {
  return (SCENARIO_ROW_TYPES as readonly string[]).includes(value);
}

function normalizeRows(rows: ScenarioFormRow[]): ScenarioFormRow[] {
  const rowMap = new Map(
    rows.map((row) => [row.rowType, { rowType: row.rowType, unitIds: [...row.unitIds] }]),
  );

  return SCENARIO_ROW_TYPES.map((rowType) => rowMap.get(rowType) ?? { rowType, unitIds: [] });
}

export function createDefaultScenarioFormValues(): ScenarioFormValues {
  return {
    name: "",
    rows: SCENARIO_ROW_TYPES.map((rowType) => ({ rowType, unitIds: [] })),
  };
}

export function scenarioRecordToFormValues(record: ScenarioRecord): ScenarioFormValues {
  const rows = (record.rows ?? [])
    .filter((row): row is ScenarioRowRecord & { rowType: ScenarioRowType } => isScenarioRowType(row.rowType))
    .map((row) => ({
      rowType: row.rowType,
      unitIds: [...(row.assignments ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((assignment) => assignment.unitId),
    }));

  return {
    name: record.name ?? "",
    rows: normalizeRows(rows),
  };
}

export function normalizeScenarioFormValues(values: ScenarioFormValues): NormalizedScenarioInput {
  return {
    name: values.name.trim(),
    rows: normalizeRows(
      values.rows
        .filter((row) => isScenarioRowType(row.rowType))
        .map((row) => ({ rowType: row.rowType, unitIds: [...row.unitIds] })),
    ),
  };
}

export function validateScenarioForm(values: ScenarioFormValues): ScenarioFieldErrors {
  const normalized = normalizeScenarioFormValues(values);
  const errors: ScenarioFieldErrors = {};

  if (!normalized.name) {
    errors.name = "Name is required";
  }

  const rowTypes = values.rows
    .filter((row): row is ScenarioFormRow => isScenarioRowType(row.rowType))
    .map((row) => row.rowType);
  const isExactlyFixedRows =
    rowTypes.length === SCENARIO_ROW_TYPES.length &&
    SCENARIO_ROW_TYPES.every((rowType) => rowTypes.filter((candidate) => candidate === rowType).length === 1);

  if (!isExactlyFixedRows) {
    errors.rows = "Rows must include ranged, support, melee, and tank exactly once";
  }

  return errors;
}

export function hasScenarioFormErrors(values: ScenarioFormValues): boolean {
  return Object.keys(validateScenarioForm(values)).length > 0;
}

export function isScenarioFormDirty(
  formValues: ScenarioFormValues,
  originalData: ScenarioRecord | null,
): boolean {
  const current = normalizeScenarioFormValues(formValues);
  const original = originalData
    ? normalizeScenarioFormValues(scenarioRecordToFormValues(originalData))
    : normalizeScenarioFormValues(createDefaultScenarioFormValues());

  if (current.name !== original.name) {
    return true;
  }

  return current.rows.some((row, index) => {
    const originalRow = original.rows[index];

    if (!originalRow || row.rowType !== originalRow.rowType) {
      return true;
    }

    return (
      row.unitIds.length !== originalRow.unitIds.length ||
      row.unitIds.some((unitId, unitIndex) => unitId !== originalRow.unitIds[unitIndex])
    );
  });
}
