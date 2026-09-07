# Session Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the three session policy defects and make the acceptance tests detect them.

**Architecture:** Persist the Remember me choice server-side. Use supported Better Auth hooks to issue and renew one-hour or 30-day sessions after validity checks, while preserving session-only versus persistent cookies. Add runtime contract tests and PostgreSQL/browser integration tests.

**Tech Stack:** TypeScript, Better Auth 1.6.11, TanStack Start, Drizzle/PostgreSQL, Vitest, Playwright, pnpm/Turbo.

## Global Constraints

- Treat e2e/features/authentication/session-management.feature as acceptance criteria; do not weaken or rewrite its required policy.
- Without Remember me: one-hour inactivity expiry and session-only cookies, for both gm and player.
- With Remember me: 30-day inactivity expiry and persistent cookies.
- Activity renews the appropriate server-side timeout; expired or revoked sessions cannot be revived.
- Removing or changing client remember-state cookies must not increase a session's permitted lifetime.
- Existing sessions migrate as non-remembered with expiry capped at updated_at plus one hour; migration never extends expiry.
- Keep edits scoped to session policy and its tests. No new dependencies. Node.js v24+ and pnpm v10+.
- Follow TDD: record a meaningful failing test before implementation and a passing run after.
- Work only in /Users/shooshte/projects/quartermasters-draft/.worktrees/session-policy on codex/fix-session-policy.
- Full pnpm run test and pnpm run test:e2e, plus pnpm run lint, must pass before final commit/push.

---

### Task 1: Implement server-owned session policy with runtime regression tests

**Files:**
- Modify: apps/web/src/lib/auth-config.ts, apps/web/src/lib/auth.ts
- Create: apps/web/src/lib/session-policy.ts
- Test: apps/web/tests/unit/session-policy.test.ts; update apps/web/tests/unit/auth-config.test.ts
- Modify: packages/db/src/schema.ts; generate packages/db/drizzle/0020_*.sql and matching metadata
- Test: packages/db/src/session-policy-schema.test.ts
- Modify if needed for response propagation: apps/web/src/routes/api/trpc.$.ts and corresponding focused unit test

**Interfaces:**
- Exports from session-policy.ts: SHORT_SESSION_SECONDS = 60 * 60; REMEMBERED_SESSION_SECONDS = 30 * 24 * 60 * 60; a named sessionPolicy plugin or configuration factory using supported Better Auth public types.
- session schema gains rememberMe: boolean, database column remember_me, default false and not null; Better Auth field has input:false.
- authConfig remains consumable by real-runtime tests with memoryAdapter and by production with drizzleAdapter.
- Session reads continue through auth.api.getSession; HTTP auth routes remain delegated to auth.handler.

- [x] Add real-runtime regression tests before production changes. Use Vitest node environment, betterAuth, memoryAdapter, and the production authConfig. Control only Date so async hashing and request timers continue to work. Example boundary assertions:

```ts
expect(+session.expiresAt - +session.updatedAt).toBe(60 * 60 * 1000);
vi.setSystemTime(new Date(start.getTime() + 59 * 60 * 1000));
expect(await auth.api.getSession({ headers })).not.toBeNull();
vi.setSystemTime(new Date(start.getTime() + 118 * 60 * 1000));
expect(await auth.api.getSession({ headers })).not.toBeNull();
```

Cover both roles without Remember me; remembered persistence after 61 minutes and rejection at/after 30 days of inactivity; nonremembered rejection at/after one hour; expiry extension on valid activity; persistent/session-only cookies on sign-in and renewal; cookie deletion cannot increase TTL; logout token replay remains invalid. Use independent sessions for expiration and renewal cases.
- [x] Run `pnpm --filter @qd/web test tests/unit/session-policy.test.ts` and record expected policy failures. Add schema assertion and see it fail before schema edit.
- [x] Implement policy through supported hooks. Set global session.expiresIn to REMEMBERED_SESSION_SECONDS, disableSessionRefresh:true and cookieCache.enabled:false. Session creation stores an explicit boolean derived from body.rememberMe === true and uses the same Date to set updatedAt and expiry. Normalize omitted rememberMe to false in a before hook for sign-in/sign-up so Better Auth issues session-only initial cookies consistently with the stored default; cover omitted input in runtime tests. Do not infer policy from client cookies on later reads.
- [x] Add an after /get-session hook using createAuthMiddleware. Validate the returned result, not just ctx.context.session (which can contain expired sessions). Respect disableRefresh. Renew through internalAdapter.updateSession only for valid sessions and handle a null update as unauthenticated. Better Auth 1.6.11 ignores falsy after-hook replacements, so exact expiry and null-update races must throw a specific SESSION_POLICY_REJECTED unauthorized APIError. Normalize only that error to null at protected SSR and tRPC read boundaries; preserve other errors. Use setSessionCookie with the stored policy; clear stale dontRememberToken for remembered sessions. Return the renewed session data. Avoid overwriting request-global/shared configuration.
- [x] Use a static Start getResponseHeaders import to forward every returned Set-Cookie at the protected server-function boundary. The production Nitro/Vite build loses setCookie in Better Auth plugin dynamic imports, so do not register the broken/redundant tanstackStartCookies plugin. Inspect tRPC cookie propagation explicitly: when getSession returns headers, append every Set-Cookie to the actual response if framework integration does not cover the API handler. Test the chosen boundary.
- [x] Add Drizzle boolean schema field and generate migration metadata using `DATABASE_URL=postgres://postgres:password@localhost:5432/quartermasters_draft pnpm --filter @qd/db db:generate`. Add migration SQL that caps existing session expiry:

```sql
UPDATE "session"
SET "expires_at" = LEAST("expires_at", "updated_at" + INTERVAL '1 hour');
```

- [x] Run relevant DB tests, rebuild package dist artifacts as needed, run focused auth runtime tests, and `pnpm --filter @qd/web typecheck`. Resolve errors without changing acceptance values. Record RED/GREEN evidence and migration implications in a report. Leave source changes ready for controller review; controller will commit after final validation per user instruction.

### Task 2: Strengthen PostgreSQL/browser acceptance coverage

**Files:**
- Modify: e2e/tests/auth/session-management.test.ts
- Modify: e2e/tests/helpers/session-helpers.ts
- Test: e2e/unit-tests/session-helpers.test.ts if helper logic is added
- Add focused auth integration coverage in existing E2E files as needed; avoid changes to the E2E runner or production test endpoints.

**Interfaces:**
- getLatestSessionForUser returns the existing session timestamps; add rememberMe readback if it materially supports assertions.
- Add a narrowly scoped helper to age the latest session by an explicit duration. Update updated_at and expires_at together after waiting for stable readback, and verify the update. It must not manufacture the desired session lifetime.

- [x] Replace the weak temporal cases with assertions on actual issued TTL (within small wall-clock tolerance). Both nonremembered roles must have a one-hour lifetime; remembered users must have 30 days. Assert session-only/persistent cookie attributes.
- [x] Age a nonremembered session by more than one hour and verify the expired redirect and notice; age a remembered session by 61 minutes and verify persistence and renewed expiry; age another remembered session by more than 30 days and verify rejection.
- [x] Exercise sliding expiry twice by aging a nonremembered session by 59 minutes, navigating to /create, and asserting expiry has advanced to approximately now plus one hour, then repeating. Assertions must fail if expiry remains unchanged:

```ts
expect(after.expiresAtEpoch).toBeGreaterThan(before.expiresAtEpoch);
expect(after.expiresAtEpoch - Math.floor(Date.now() / 1000)).toBeGreaterThan(3590);
```

- [x] Verify renewal Set-Cookie reaches browser on SSR navigation and API/tRPC activity for remembered sessions, so persistent cookies do not retain the original expiry. Cover deleted dont_remember marker on a short session without converting it to persistent or 30-day policy.
- [x] Preserve existing browser-close, logout, and token-replay scenarios. Run focused E2E via `pnpm run test:e2e tests/auth/session-management.test.ts`. For TDD evidence, demonstrate the strengthened lifetime/renewal assertions reject original behavior before claiming GREEN (temporarily running against the baseline implementation is acceptable, then restore the fix).
- [x] Run focused helper tests and document exact commands/results, including RED/GREEN. Leave source changes ready for controller review; controller commits after final validation.

### Task 3: Review, validate, commit and push

**Files:** Only amend session-policy files if review reveals a defect; update this plan's completion checkboxes.

- [x] After each implementation task, generate a diff package and dispatch an independent reviewer for spec compliance and code quality. Resolve important findings and re-review before proceeding.
- [x] Dispatch final whole-branch review against base 247bf8b. Inspect session expiry/security, cookie propagation, migration behavior and strength of regression assertions.
- [x] Run `pnpm run test --force`, `pnpm run lint`, and `pnpm run test:e2e` from the worktree. Confirm exit 0 and record totals. E2E also builds production artifacts and pushes the current schema plus seed to PostgreSQL. Separately execute the actual migration chain against PostgreSQL with legacy session fixtures and assert expiry is capped, never extended.
- [ ] Commit the finished implementation and plan using an explicit file list and a message describing the corrected session policy. Verify clean status.
- [ ] Push with `git push -u origin codex/fix-session-policy`, then verify the remote branch SHA matches local HEAD. Keep the separate worktree for follow-up. Do not merge develop.

## Final validation

- Subagent implementation and independent per-task/final reviews completed; no blocking findings.
- `pnpm run test --force`: 907 tests passed (900 Vitest plus 7 infrastructure tests), no cached test tasks.
- `pnpm run lint`: Biome and TypeScript passed. Generated migration JSON was formatted with parsed values verified unchanged.
- `pnpm run test:e2e`: 298 Chromium tests passed with four workers.
- Full PostgreSQL migration chain and existing long/short/expired session fixtures passed; expiry never extended.
- Existing sessions become non-remembered and are capped at their last activity plus one hour. A fresh sign-in is needed to opt into remembered sessions.
