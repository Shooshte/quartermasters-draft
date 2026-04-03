import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

type SessionRow = {
  id: string;
  userId: string;
  token: string;
  expiresAtEpoch: number;
  createdAtEpoch: number;
  updatedAtEpoch: number;
};

const E2E_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const COMPOSE_FILE = path.join(E2E_DIR, "docker-compose.yml");

function runSql(workerIndex: number, sql: string): string {
  const dbName = `qd_worker_${workerIndex}`;
  return execFileSync(
    "docker",
    [
      "compose",
      "-f",
      COMPOSE_FILE,
      "exec",
      "-T",
      "postgres",
      "psql",
      "-U",
      "postgres",
      "-d",
      dbName,
      "-At",
      "-F",
      "\t",
      "-c",
      sql,
    ],
    {
      encoding: "utf8",
      timeout: 15_000,
    },
  ).trim();
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function parseSessionRow(row: string): SessionRow {
  const [id, userId, token, expiresAtEpoch, createdAtEpoch, updatedAtEpoch] = row.split("\t");
  return {
    id,
    userId,
    token,
    expiresAtEpoch: Number(expiresAtEpoch),
    createdAtEpoch: Number(createdAtEpoch),
    updatedAtEpoch: Number(updatedAtEpoch),
  };
}

export function getLatestSessionForUser(
  userId: string,
  workerIndex: number,
): SessionRow {
  const row = runSql(
    workerIndex,
    [
      "SELECT id, user_id, token,",
      "EXTRACT(EPOCH FROM expires_at)::bigint,",
      "EXTRACT(EPOCH FROM created_at)::bigint,",
      "EXTRACT(EPOCH FROM updated_at)::bigint",
      "FROM session",
      `WHERE user_id = '${escapeSqlLiteral(userId)}'`,
      "ORDER BY created_at DESC",
      "LIMIT 1;",
    ].join(" "),
  );

  if (!row) {
    throw new Error(`No session found for user ${userId} on worker ${workerIndex}`);
  }

  return parseSessionRow(row);
}

export function expireLatestSessionForUser(
  userId: string,
  workerIndex: number,
  expiryExpression = "NOW() - INTERVAL '1 second'",
): void {
  const session = getLatestSessionForUser(userId, workerIndex);
  runSql(
    workerIndex,
    [
      "UPDATE session",
      `SET expires_at = ${expiryExpression}`,
      `WHERE id = '${escapeSqlLiteral(session.id)}';`,
    ].join(" "),
  );
}

export function countSessionsByToken(
  token: string,
  workerIndex: number,
): number {
  const value = runSql(
    workerIndex,
    [
      "SELECT COUNT(*)",
      "FROM session",
      `WHERE token = '${escapeSqlLiteral(token)}';`,
    ].join(" "),
  );
  return Number(value);
}
