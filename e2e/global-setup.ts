import { execFileSync, execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { FullConfig } from "@playwright/test";
import { BASE_PORT, DEFAULT_WORKERS } from "./constants";

const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));
const COMPOSE_FILE = path.join(E2E_DIR, "docker-compose.yml");
const WORKERS = parseInt(process.env.E2E_WORKERS ?? String(DEFAULT_WORKERS), 10);
const NETWORK = "qd-e2e-net";
const IMAGE = "qd-e2e-app:latest";

function psql(db: string, sql: string) {
  execSync(
    `docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U postgres -d "${db}" -c "${sql}"`,
    { stdio: "pipe", timeout: 15_000 },
  );
}

function dbUrl(dbName: string) {
  return `postgresql://postgres:password@postgres:5432/${dbName}`;
}

function appRun(envDb: string, cmd: string) {
  execSync(`docker run --rm --network ${NETWORK} -e DATABASE_URL="${envDb}" ${IMAGE} ${cmd}`, {
    stdio: "pipe",
    timeout: 60_000,
  });
}

export default async function globalSetup(_config: FullConfig) {
  console.log(`[global-setup] Preparing ${WORKERS} workers...`);
  execFileSync(
    "docker",
    ["run", "--rm", IMAGE, "sh", "-c", "! command -v node && ! command -v pnpm"],
    {
      stdio: "pipe",
      timeout: 15_000,
    },
  );

  // Phase 1: Create and fully seed worker 0
  const db0 = "qd_worker_0";
  psql("postgres", `DROP DATABASE IF EXISTS ${db0}`);
  psql("postgres", `CREATE DATABASE ${db0}`);
  appRun(dbUrl(db0), "qd-db migrate");
  appRun(dbUrl(db0), "qd-db seed");

  // Phase 2: Dump worker 0 seed data inside postgres container for fast cloning
  execSync(
    `docker compose -f "${COMPOSE_FILE}" exec -T postgres ` +
      `pg_dump -U postgres -d ${db0} --no-owner --no-acl -f /tmp/qd-seed-dump.sql`,
    { stdio: "pipe", timeout: 30_000 },
  );

  // Phase 3: Clone schema + data to workers 1..N
  for (let i = 1; i < WORKERS; i++) {
    const dbName = `qd_worker_${i}`;
    psql("postgres", `DROP DATABASE IF EXISTS ${dbName}`);
    psql("postgres", `CREATE DATABASE ${dbName}`);
    execSync(
      `docker compose -f "${COMPOSE_FILE}" exec -T postgres psql -U postgres -d ${dbName} -f /tmp/qd-seed-dump.sql`,
      { stdio: "pipe", timeout: 15_000 },
    );
  }

  // Phase 4: Start app containers
  for (let i = 0; i < WORKERS; i++) {
    const port = BASE_PORT + i;
    execSync(
      [
        `docker run -d --rm`,
        `--name qd-e2e-app-${i}`,
        `--label qd-e2e-worker`,
        `--network ${NETWORK}`,
        `-p ${port}:${port}`,
        `-e DATABASE_URL="${dbUrl(`qd_worker_${i}`)}"`,
        `-e BETTER_AUTH_SECRET=e2e-test-secret-do-not-use-in-production`,
        `-e BETTER_AUTH_URL=http://localhost:${port}`,
        `-e PORT=${port}`,
        `-e HOST=0.0.0.0`,
        `${IMAGE} qd-server`,
      ].join(" "),
      { stdio: "pipe", timeout: 15_000 },
    );
  }

  // Phase 5: Wait for all apps
  for (let i = 0; i < WORKERS; i++) {
    const port = BASE_PORT + i;
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        execSync(`curl -sf http://localhost:${port}/ > /dev/null`, {
          stdio: "pipe",
          timeout: 5_000,
        });
        console.log(`[global-setup] Worker ${i} ready on :${port}`);
        break;
      } catch {
        if (attempt === 29) throw new Error(`Worker ${i} failed to start`);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
}
