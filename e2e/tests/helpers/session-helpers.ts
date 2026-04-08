import { runWorkerSql } from "./worker-db";

type SessionRow = {
  id: string;
  userId: string;
  token: string;
  expiresAtEpoch: number;
  createdAtEpoch: number;
  updatedAtEpoch: number;
};

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function parseSessionRow(values: string[]): SessionRow {
  const [id, userId, token, expiresAtEpoch, createdAtEpoch, updatedAtEpoch] = values;
  return {
    id,
    userId,
    token,
    expiresAtEpoch: Number(expiresAtEpoch),
    createdAtEpoch: Number(createdAtEpoch),
    updatedAtEpoch: Number(updatedAtEpoch),
  };
}

export async function getLatestSessionForUser(
  userId: string,
  workerIndex: number,
): Promise<SessionRow> {
  const rows = await runWorkerSql(
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

  if (rows.length === 0) {
    throw new Error(`No session found for user ${userId} on worker ${workerIndex}`);
  }

  return parseSessionRow(rows[0]);
}

export async function expireLatestSessionForUser(
  userId: string,
  workerIndex: number,
  expiryExpression = "NOW() - INTERVAL '1 second'",
): Promise<void> {
  const session = await getLatestSessionForUser(userId, workerIndex);
  await runWorkerSql(
    workerIndex,
    [
      "UPDATE session",
      `SET expires_at = ${expiryExpression}`,
      `WHERE id = '${escapeSqlLiteral(session.id)}';`,
    ].join(" "),
  );
}

export async function countSessionsByToken(
  token: string,
  workerIndex: number,
): Promise<number> {
  const rows = await runWorkerSql(
    workerIndex,
    [
      "SELECT COUNT(*)",
      "FROM session",
      `WHERE token = '${escapeSqlLiteral(token)}';`,
    ].join(" "),
  );
  return Number(rows[0][0]);
}
