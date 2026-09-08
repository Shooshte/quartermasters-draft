import { execFile } from "node:child_process";
import { promisify } from "node:util";
import postgres from "postgres";

const execFileAsync = promisify(execFile);
const POSTGRES_HOST = process.env.E2E_POSTGRES_HOST ?? "127.0.0.1";
const POSTGRES_PORT = process.env.E2E_POSTGRES_PORT ?? "5433";
const POSTGRES_USER = process.env.E2E_POSTGRES_USER ?? "postgres";
const POSTGRES_PASSWORD = process.env.E2E_POSTGRES_PASSWORD ?? "password";
const workerDbs = new Map<string, ReturnType<typeof postgres>>();

function getWorkerDb(dbName: string) {
  const existing = workerDbs.get(dbName);
  if (existing) return existing;
  const client = postgres({
    host: POSTGRES_HOST,
    port: Number(POSTGRES_PORT),
    username: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: dbName,
    max: 1,
  });
  workerDbs.set(dbName, client);
  return client;
}

export function getWorkerDbName(parallelIndex: number) {
  return `qd_worker_${parallelIndex}`;
}

export async function resetWorkerDb(dbName: string) {
  const match = /^qd_worker_(\d+)$/.exec(dbName);
  if (!match) throw new Error(`Invalid E2E database name: ${dbName}`);
  // Exercise the same Rust seed/reset implementation used by the development CLI.
  await execFileAsync("docker", ["exec", `qd-e2e-app-${match[1]}`, "qd-db", "reset-game-data"]);
}

export async function resetWorkerDbByIndex(parallelIndex: number) {
  await resetWorkerDb(getWorkerDbName(parallelIndex));
}

export async function runWorkerSql(parallelIndex: number, sql: string): Promise<string[][]> {
  const client = getWorkerDb(getWorkerDbName(parallelIndex));
  const result = await client.unsafe(sql);
  return result.map((row: Record<string, unknown>) => Object.values(row).map(String));
}

export async function closeAllWorkerDbs() {
  await Promise.all([...workerDbs.values()].map((client) => client.end()));
  workerDbs.clear();
}
