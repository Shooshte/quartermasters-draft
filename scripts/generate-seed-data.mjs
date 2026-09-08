// Test-only compatibility artifact; production qd-db embeds the generated JSON.
import { writeFileSync } from "node:fs";
import * as source from "../reference/db/src/seed-data.ts";

const tables = {
  effects: source.effectSeedData,
  items: source.itemSeedData,
  items_allowed_rows: source.itemAllowedRowSeedData,
  items_effects: source.itemsEffectsSeedData,
  units: source.unitSeedData,
  units_items: source.unitsItemsSeedData,
  scenarios: source.scenarioSeedData,
  scenarios_rows: source.scenariosRowsSeedData,
  scenarios_rows_units: source.scenariosRowsUnitsSeedData,
};
const data = Object.fromEntries(
  Object.entries(tables).map(([table, rows]) => [
    table,
    rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [
          key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
          value,
        ]),
      ),
    ),
  ]),
);
writeFileSync(
  new URL("../crates/qd-db/seed-data.json", import.meta.url),
  `${JSON.stringify(data, null, 2)}\n`,
);
