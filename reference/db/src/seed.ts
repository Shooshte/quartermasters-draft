import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getRequiredEnv } from "./env";
import * as schema from "./schema";
import {
  buildSeedData,
  effectSeedData,
  itemAllowedRowSeedData,
  itemSeedData,
  itemsEffectsSeedData,
  scenarioSeedData,
  scenariosRowsSeedData,
  scenariosRowsUnitsSeedData,
  unitSeedData,
  unitsItemsSeedData,
} from "./seed-data";

const client = postgres(getRequiredEnv("DATABASE_URL"));
const db = drizzle({ client, schema });

try {
  const hashedPassword = await hashPassword("password123");
  const { users, accounts } = buildSeedData(hashedPassword);

  for (const user of users) {
    await db.insert(schema.user).values(user).onConflictDoNothing();
  }
  for (const account of accounts) {
    await db.insert(schema.account).values(account).onConflictDoNothing();
  }
  await db.insert(schema.effects).values(effectSeedData).onConflictDoNothing();
  await db.insert(schema.items).values(itemSeedData).onConflictDoNothing();
  await db.insert(schema.itemsAllowedRows).values(itemAllowedRowSeedData).onConflictDoNothing();
  await db.insert(schema.itemsEffects).values(itemsEffectsSeedData).onConflictDoNothing();
  await db.insert(schema.units).values(unitSeedData).onConflictDoNothing();
  await db.insert(schema.unitsItems).values(unitsItemsSeedData).onConflictDoNothing();
  await db.insert(schema.scenarios).values(scenarioSeedData).onConflictDoNothing();
  await db.insert(schema.scenariosRows).values(scenariosRowsSeedData).onConflictDoNothing();
  await db
    .insert(schema.scenariosRowsUnits)
    .values(scenariosRowsUnitsSeedData)
    .onConflictDoNothing();

  console.log(
    "Seeded users, accounts, effects, items, items_allowed_rows, items_effects, units, units_items, scenarios, scenarios_rows, and scenarios_rows_units",
  );
  await client.end();
  process.exit(0);
} catch (error) {
  console.error("Seed failed:", error);
  await client.end();
  process.exit(1);
}
