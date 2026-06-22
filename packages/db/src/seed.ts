import "dotenv/config";
import { hashPassword } from "better-auth/crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getRequiredEnv } from "./env";
import * as schema from "./schema";
import {
  buildSeedData,
  effectSeedData,
  itemSeedData,
  itemsSpellsSeedData,
  scenarioSeedData,
  scenariosRowsSeedData,
  scenariosRowsUnitsSeedData,
  spellSeedData,
  spellsAllowedRowsSeedData,
  spellsEffectsSeedData,
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
  await db.insert(schema.spells).values(spellSeedData).onConflictDoNothing();
  await db.insert(schema.spellsEffects).values(spellsEffectsSeedData).onConflictDoNothing();
  await db.insert(schema.spellsAllowedRows).values(spellsAllowedRowsSeedData).onConflictDoNothing();
  await db.insert(schema.items).values(itemSeedData).onConflictDoNothing();
  await db.insert(schema.itemsSpells).values(itemsSpellsSeedData).onConflictDoNothing();
  await db.insert(schema.units).values(unitSeedData).onConflictDoNothing();
  await db.insert(schema.unitsItems).values(unitsItemsSeedData).onConflictDoNothing();
  await db.insert(schema.scenarios).values(scenarioSeedData).onConflictDoNothing();
  await db.insert(schema.scenariosRows).values(scenariosRowsSeedData).onConflictDoNothing();
  await db
    .insert(schema.scenariosRowsUnits)
    .values(scenariosRowsUnitsSeedData)
    .onConflictDoNothing();

  console.log(
    "Seeded users, accounts, effects, spells, spells_effects, spells_allowed_rows, items, items_spells, units, units_items, scenarios, scenarios_rows, and scenarios_rows_units",
  );
  await client.end();
  process.exit(0);
} catch (error) {
  console.error("Seed failed:", error);
  await client.end();
  process.exit(1);
}
