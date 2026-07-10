import type { scenariosRowsUnits } from "../schema";

export const scenariosRowsUnitsSeedData: (typeof scenariosRowsUnits.$inferInsert)[] = [
  {
    id: "a4000000-0000-0000-0000-000000000001",
    rowId: "a3000000-0000-0000-0000-000000000002", // melee row
    unitId: "f0000000-0000-0000-0000-000000000001", // Barbarian
    slot: 1,
  },
  {
    id: "a4000000-0000-0000-0000-000000000002",
    rowId: "a3000000-0000-0000-0000-000000000003", // ranged row
    unitId: "f0000000-0000-0000-0000-000000000002", // Mage
    slot: 1,
  },
  {
    id: "a4000000-0000-0000-0000-000000000003",
    rowId: "a3000000-0000-0000-0000-000000000004", // support row
    unitId: "f0000000-0000-0000-0000-000000000003", // Ranger
    slot: 1,
  },
];
