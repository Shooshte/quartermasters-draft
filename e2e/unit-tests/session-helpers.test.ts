import assert from "node:assert/strict";
import { test } from "node:test";
import { waitForStableSession } from "../tests/helpers/session-helpers";

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
