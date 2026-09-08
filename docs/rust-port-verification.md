# Rust port acceptance and verification

The baseline is develop `7eb4c9b`, including the explicit one-hour/30-day session policy. All existing TypeScript reference tests and browser acceptance assertions remain executable. There is no Bevy implementation in this port.

| Acceptance area | Rust verification | Browser/reference verification |
| --- | --- | --- |
| Setup, IDs, validation, action bars, ordering, targeting, rows | `qd-engine` rules and per-batch parity tests | All `reference/engine/features` and 222 original engine tests; 92 full traces, 158 captured regression inputs, RNG vectors, randomized differential runner |
| Effects, mana, simultaneous actions, shields, logs, win conditions | Exact snapshot/log comparisons and directed rule tests | Existing Battle Lab scenarios plus reference tests |
| Editor CRUD, nullable fields, uniqueness, numeric rules | `crud_validation` and real-PostgreSQL `crud_http` tests | Every `e2e/features/create` feature and retained API tests |
| Link ordering, linkage filters, pagination, rollback and deletion | Real-PostgreSQL CRUD tests | Existing library/workspace browser assertions |
| Stored credentials, signed cookies, policy, roles and logout | `auth_compat`, `auth_postgres`, HTTP contract tests | Every `e2e/features/authentication` feature; frontend route/session tests |
| Replay persistence and current scenario regeneration | Battle mapping and PostgreSQL replay tests | `e2e/features/battle/battle-lab.feature` |
| API wire format and browser transport | Generated OpenAPI drift check; DTO tests consume actual Rust engine output | API client and route tests; REST acceptance helpers |
| Fresh databases, existing-history upgrades, history-free adoption, drift rejection | `qd-db` storage tests with isolated PostgreSQL databases | Actual legacy push-schema adoption and old Node image rollback rehearsal |
| SPA refreshes, static/API 404s, production runtime | HTTP hosting tests and readiness checks | Runtime browser feature; image asserts absence of Node and pnpm |

## Migration and rollback evidence

A schema created by the original Drizzle push command was adopted successfully. The retained pre-port image `qd-e2e-legacy:rust-port-baseline` was then started against that adopted database. Login with an existing GM account and retrieval of all 20 original effects through the old API both succeeded. SQLx metadata is additive and the legacy application can still use the original accounts and tables.

The Rust storage tests also verify idempotent fresh installation/seeding, adoption preserving account/game records, remaining migrations after a recognized older prefix, refusal of modified history, refusal of missing constraints, and exact seed update dates.

## Deliberate boundaries

The TypeScript implementation is retained under `reference/` only as a development oracle. Production is the Rust server, PostgreSQL, and compiled React assets. Replay records retain seeds and scenario references and regenerate using current data. The native Bevy desktop viewer will be a subsequent project that fetches replays from the backend.

## Final gates

Final verification on 2026-09-08:

- `pnpm run check`: passed generated OpenAPI/client drift, Biome, TypeScript, Rust formatting, Clippy with warnings denied, dependency checks, all tests, and production builds.
- `pnpm run test`: passed again with the manually provisioned development database removed. The harness created and cleaned its own PostgreSQL container. This includes 420 frontend tests, 470 retained reference/shared tests, 7 tooling tests, and 76 Rust tests.
- `pnpm run test:e2e`: all 301 browser tests passed in 1.9 minutes against the final Rust Docker image; the image contains neither Node nor pnpm.
- The final randomized differential run matched 1,000 complete battles, every batch and log, with exact numeric comparison. Directed regressions cover JavaScript numeric-seed formatting and PostgreSQL REAL decimal ties.
- A canceled-transaction regression reproduced an SQLx transaction startup leak before the fix. The patched Docker image completed 22,173 deliberately canceled reads and 320 resets with no errors, lingering transactions, or blocked session updates. Three previously stalled browser cases also passed five repetitions each.
- Independent engine/database, browser/contract, server/auth, and runtime reviews approved the fixes with no unresolved findings.
- Generated seed data reproduced without a diff. `git diff --check` passed.

Intermediate red/green implementation evidence and review follow-ups are recorded in `.superpowers/sdd` and `.superpowers/reviews` reports.
