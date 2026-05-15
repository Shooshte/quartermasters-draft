import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../../packages/db/src/schema";
import {
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
} from "../../../packages/db/src/seed-data";

const POSTGRES_HOST = process.env.E2E_POSTGRES_HOST ?? "127.0.0.1";
const POSTGRES_PORT = process.env.E2E_POSTGRES_PORT ?? "5433";
const POSTGRES_USER = process.env.E2E_POSTGRES_USER ?? "postgres";
const POSTGRES_PASSWORD = process.env.E2E_POSTGRES_PASSWORD ?? "password";

const TRUNCATE_APP_TABLES_SQL = `
  TRUNCATE TABLE
    scenarios_rows_units,
    scenarios_rows,
    scenarios,
    units_items,
    units,
    items_spells,
    items,
    spells_allowed_rows,
    spells_effects,
    spells,
    effects
  RESTART IDENTITY CASCADE
`;

function createWorkerDb(dbName: string) {
  const client = postgres(
    `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${dbName}`,
    { max: 1 },
  );

  return {
    client,
    db: drizzle({ client, schema }),
  };
}

const workerDbs = new Map<string, ReturnType<typeof createWorkerDb>>();

function getWorkerDb(dbName: string) {
  const existing = workerDbs.get(dbName);
  if (existing) return existing;

  const created = createWorkerDb(dbName);
  workerDbs.set(dbName, created);
  return created;
}

export function getWorkerDbName(parallelIndex: number) {
  return `qd_worker_${parallelIndex}`;
}

export async function resetWorkerDb(dbName: string) {
  const { db } = getWorkerDb(dbName);

  await db.transaction(async (tx) => {
    await tx.execute(sql.raw(TRUNCATE_APP_TABLES_SQL));
    await tx.insert(schema.effects).values(effectSeedData);
    await tx.insert(schema.spells).values(spellSeedData);
    await tx.insert(schema.spellsEffects).values(spellsEffectsSeedData);
    await tx.insert(schema.spellsAllowedRows).values(spellsAllowedRowsSeedData);
    await tx.insert(schema.items).values(itemSeedData);
    await tx.insert(schema.itemsSpells).values(itemsSpellsSeedData);
    await tx.insert(schema.units).values(unitSeedData);
    await tx.insert(schema.unitsItems).values(unitsItemsSeedData);
    await tx.insert(schema.scenarios).values(scenarioSeedData);
    await tx.insert(schema.scenariosRows).values(scenariosRowsSeedData);
    await tx.insert(schema.scenariosRowsUnits).values(scenariosRowsUnitsSeedData);
  });
}

export async function resetWorkerDbByIndex(parallelIndex: number) {
  await resetWorkerDb(getWorkerDbName(parallelIndex));
}

export async function runWorkerSql(parallelIndex: number, sql: string): Promise<string[][]> {
  const dbName = getWorkerDbName(parallelIndex);
  const { client } = getWorkerDb(dbName);
  const result = await client.unsafe(sql);
  return result.map((row: Record<string, unknown>) => Object.values(row).map(String));
}

export async function closeAllWorkerDbs() {
  await Promise.all([...workerDbs.values()].map(({ client }) => client.end()));
  workerDbs.clear();
}
