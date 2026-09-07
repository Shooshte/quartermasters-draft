import { runWorkerSql } from "./worker-db";

type SessionRow = {
  id: string;
  userId: string;
  token: string;
  expiresAtEpoch: number;
  createdAtEpoch: number;
  updatedAtEpoch: number;
};

type StableSessionReadbackOptions<TSession> = {
  readSession: () => Promise<TSession>;
  getStabilityKey?: (session: TSession) => string;
  maxReadbacks?: number;
  requiredStableReadbacks?: number;
  readbackDelayMs?: number;
  wait?: (ms: number) => Promise<void>;
};

const DEFAULT_SESSION_READBACK_DELAY_MS = 100;
const DEFAULT_MAX_SESSION_READBACKS = 10;
const DEFAULT_REQUIRED_STABLE_SESSION_READBACKS = 2;

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
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
  runSql = runWorkerSql,
): Promise<SessionRow> {
  const rows = await runSql(
    workerIndex,
    [
      "SELECT id, user_id, token,",
      "EXTRACT(EPOCH FROM expires_at)::bigint AS expires_at_epoch,",
      "EXTRACT(EPOCH FROM created_at)::bigint AS created_at_epoch,",
      "EXTRACT(EPOCH FROM updated_at)::bigint AS updated_at_epoch",
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
  const session = await waitForStableSession({
    readSession: () => getLatestSessionForUser(userId, workerIndex),
  });

  await runWorkerSql(
    workerIndex,
    [
      "UPDATE session",
      `SET expires_at = ${expiryExpression}`,
      `WHERE id = '${escapeSqlLiteral(session.id)}';`,
    ].join(" "),
  );

  const updatedSession = await getLatestSessionForUser(userId, workerIndex);
  if (
    updatedSession.id === session.id &&
    updatedSession.expiresAtEpoch > Math.floor(Date.now() / 1000)
  ) {
    throw new Error(
      `Session expiry update did not take effect for ${session.id}; expires_at epoch is ${updatedSession.expiresAtEpoch}`,
    );
  }
}

export async function waitForStableSession<TSession>({
  readSession,
  getStabilityKey = (session) => JSON.stringify(session),
  maxReadbacks = DEFAULT_MAX_SESSION_READBACKS,
  requiredStableReadbacks = DEFAULT_REQUIRED_STABLE_SESSION_READBACKS,
  readbackDelayMs = DEFAULT_SESSION_READBACK_DELAY_MS,
  wait = delay,
}: StableSessionReadbackOptions<TSession>): Promise<TSession> {
  let stableReadbacks = 0;
  let lastSession: TSession | undefined;
  let lastStabilityKey: string | undefined;

  for (let readback = 0; readback < maxReadbacks; readback += 1) {
    lastSession = await readSession();
    const stabilityKey = getStabilityKey(lastSession);

    if (stabilityKey === lastStabilityKey) {
      stableReadbacks += 1;
    } else {
      stableReadbacks = 1;
      lastStabilityKey = stabilityKey;
    }

    if (stableReadbacks >= requiredStableReadbacks) {
      return lastSession;
    }

    await wait(readbackDelayMs);
  }

  throw new Error(`Session did not stabilize after ${maxReadbacks} readbacks`);
}

export async function deleteSessionsForUser(userId: string, workerIndex: number): Promise<void> {
  await runWorkerSql(
    workerIndex,
    ["DELETE FROM session", `WHERE user_id = '${escapeSqlLiteral(userId)}';`].join(" "),
  );
}

export async function countSessionsByToken(token: string, workerIndex: number): Promise<number> {
  const rows = await runWorkerSql(
    workerIndex,
    ["SELECT COUNT(*)", "FROM session", `WHERE token = '${escapeSqlLiteral(token)}';`].join(" "),
  );
  return Number(rows[0][0]);
}

export async function ageLatestSessionForUser(
  userId: string,
  workerIndex: number,
  seconds: number,
  runSql = runWorkerSql,
): Promise<SessionRow> {
  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error("Session age must be a positive integer number of seconds");
  }
  const session = await waitForStableSession({
    readSession: () => getLatestSessionForUser(userId, workerIndex, runSql),
  });
  await runSql(
    workerIndex,
    [
      "UPDATE session",
      `SET updated_at = updated_at - INTERVAL '${seconds} seconds',`,
      `expires_at = expires_at - INTERVAL '${seconds} seconds'`,
      `WHERE id = '${escapeSqlLiteral(session.id)}';`,
    ].join(" "),
  );
  const aged = await getLatestSessionForUser(userId, workerIndex, runSql);
  if (
    aged.id !== session.id ||
    aged.updatedAtEpoch !== session.updatedAtEpoch - seconds ||
    aged.expiresAtEpoch !== session.expiresAtEpoch - seconds
  ) {
    throw new Error(`Session aging update did not take effect for ${session.id}`);
  }
  return aged;
}
