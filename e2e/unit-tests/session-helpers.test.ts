import assert from "node:assert/strict";
import { test } from "node:test";
import { ageLatestSessionForUser, waitForStableSession } from "../tests/helpers/session-helpers";

test("waitForStableSession waits until session expiry and update timestamps stop changing", async () => {
  const readSessions = [
    { id: "session-1", expiresAtEpoch: 4_600, updatedAtEpoch: 1_000 },
    { id: "session-1", expiresAtEpoch: 4_700, updatedAtEpoch: 1_001 },
    { id: "session-1", expiresAtEpoch: 4_700, updatedAtEpoch: 1_001 },
  ];

  const session = await waitForStableSession({
    readSession: async () => {
      const session = readSessions.shift();
      assert.notEqual(session, undefined);
      return session;
    },
    wait: async () => {},
  });

  assert.deepEqual(session, { id: "session-1", expiresAtEpoch: 4_700, updatedAtEpoch: 1_001 });
});

test("waitForStableSession throws if the session never stabilizes", async () => {
  let updatedAtEpoch = 1_000;

  await assert.rejects(
    waitForStableSession({
      readSession: async () => ({
        id: "session-1",
        expiresAtEpoch: 4_600 + updatedAtEpoch,
        updatedAtEpoch: updatedAtEpoch++,
      }),
      maxReadbacks: 3,
      wait: async () => {},
    }),
    /Session did not stabilize after 3 readbacks/,
  );
});

test("aging subtracts the same duration from both timestamps without replacing the issued TTL", async () => {
  const queries: string[] = [];
  const original = ["session-1", "user-1", "token", "10000", "100", "2800"];
  const aged = ["session-1", "user-1", "token", "6460", "100", "-740"];
  let updated = false;
  const session = await ageLatestSessionForUser("user-1", 2, 3540, async (worker, sql) => {
    assert.equal(worker, 2);
    queries.push(sql);
    if (sql.startsWith("UPDATE")) {
      updated = true;
      assert.match(sql, /updated_at = updated_at - INTERVAL '3540 seconds'/);
      assert.match(sql, /expires_at = expires_at - INTERVAL '3540 seconds'/);
      assert.match(sql, /WHERE id = 'session-1'/);
      return [];
    }
    return [updated ? aged : original];
  });
  assert.equal(queries.filter((query) => query.startsWith("SELECT")).length, 3);
  assert.equal(session.expiresAtEpoch - session.updatedAtEpoch, 7200);
  assert.equal(session.expiresAtEpoch, 6460);
});

test("aging rejects invalid durations before issuing SQL", async () => {
  for (const duration of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    await assert.rejects(
      ageLatestSessionForUser("user-1", 0, duration, async () => {
        assert.fail("must not query for an invalid duration");
      }),
      /positive integer/,
    );
  }
});

test("aging fails explicitly when a concurrent renewal overwrites the update", async () => {
  await assert.rejects(
    ageLatestSessionForUser("user-1", 0, 3540, async () => [
      ["session-1", "user-1", "token", "10000", "100", "2800"],
    ]),
    /Session aging update did not take effect/,
  );
});
