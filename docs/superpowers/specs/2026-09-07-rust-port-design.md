# Rust backend and battle engine migration

Status: implementation authorized by the user following review, in a new worktree with commits and a PR targeting develop.

## Scope and decisions

Port the existing battle engine, backend business logic, authentication, database access, migrations, and seed tooling to Rust. Keep the React web UI and its current user workflows. Preserve PostgreSQL data, identifiers, accounts, and saved battle definitions by default.

Bevy is a later project. The eventual presentation layer is a native desktop application that fetches battles from the backend. This migration adds no Bevy dependencies, animation, desktop authentication, offline export, replay snapshots, or new playback protocol. Preserve a renderer-independent Rust engine and a documented HTTP API so that later work has a usable foundation.

The React UI will become a browser-only application served by Rust. Remove Node from production. Node and pnpm remain frontend build and test tools. Retain React, TanStack Router, React Query, Tailwind, and the existing components where compatible; remove TanStack Start server functions and Nitro after their responsibilities have moved.

## Existing behavior is the contract

- All existing `.feature` files remain acceptance criteria. Implementation discrepancies must be recorded and resolved against those criteria, not silently copied into Rust or removed from tests.
- Preserve scenario, unit, item, and effect editing; library sorting, pagination and linkage filters; ordering of linked entities; validation messages; conflict handling; and atomic updates.
- Preserve login, logout, safe return URLs, role defaults, GM-only operations, forbidden pages, and session expiry notices.
- Preserve the engine's public input/output behavior, deterministic unit/effect IDs, action ordering, simultaneous batch resolution, targeting, effects, shields, mana, fatigue, and outcomes.
- Saved replay URLs identify two current scenarios and a seed. Reopening a URL regenerates using current scenario data. Scenario deletion currently cascades to saved definitions. Historical recordings are outside this port.
- Keep deterministic seed IDs and the existing database relationships. Production migration must not require resetting or reseeding user data.

## Migration approach

Recommended: replace one feature area at a time behind a frontend API adapter, keeping the existing TypeScript implementation available for comparison until cutover. Only one backend owns writes for a migrated feature at a time. Replay and simulation comparisons must not create duplicate records.

Alternatives considered:

| Approach | Tradeoff |
| --- | --- |
| Incremental feature migration | More temporary integration work, but engine, authentication, and CRUD parity can be verified separately. Recommended. |
| Replace the backend in one release | Fewer transitional routes, but all login, editor, serialization, and simulation differences converge at cutover. |
| Reproduce the tRPC wire protocol in Rust | Reduces immediate frontend edits but couples Rust to tRPC batching, streaming, SuperJSON, and client error behavior. Avoid as the permanent API. |

## Proposed architecture

Use a Cargo workspace alongside the existing pnpm workspace. Keep Node v24+ and pnpm v10+ for frontend development. Pin a compatible Rust toolchain and dependency versions when implementing the first milestone.

| Proposed location | Responsibility |
| --- | --- |
| `crates/qd-engine/` | Pure battle inputs, validation, state, deterministic RNG, scheduling, targeting, resolution, and logs. No HTTP, database, rendering, or wall-clock dependencies. |
| `crates/qd-api-types/` | Public request/response types and API schema. Avoid exposing database records or private engine state. |
| `crates/qd-db/` | SQLx queries, transactions, migrations, and seed/reset commands. |
| `apps/server/` | Axum application, authentication, authorization, feature services, error translation, and battle execution. |
| `packages/api-client/` | Generated TypeScript API types plus a small transport/error/date adapter consumed by React. Export built artifacts, as existing internal packages do. |
| `fixtures/engine-parity/` | Language-neutral battle input and expected output fixtures. |
| `fixtures/api-contracts/` | Sanitized request/response cases and expected domain errors. |

Prefer Axum/Tokio for HTTP, SQLx for PostgreSQL, and Serde for serialization. Generate OpenAPI from the authoritative Rust DTOs and generate the TypeScript client from that schema. Select and pin the minimal schema tooling in the API milestone. Avoid independently maintained Rust and TypeScript contracts.

Keep database record types, HTTP types, and simulation types distinct where their representation differs. For example, PostgreSQL `real` values must be decoded according to their actual storage type and widened deliberately for engine arithmetic; identifiers and timestamps must retain their existing semantics.

## HTTP and frontend boundary

Use same-origin `/api/v1` routes for the Rust API. Keep existing page URLs. During migration, the existing `/api/trpc` routes serve feature areas that have not moved yet.

Proposed route groups:

- `/api/v1/health` for application health, with readiness checked separately against PostgreSQL.
- `/api/v1/auth/login`, `/logout`, and `/session` for existing authentication workflows.
- `/api/v1/effects`, `/items`, `/units`, and `/scenarios`, with collection list/create and ID-based get/update/delete operations.
- `/api/v1/battle/scenario-options` and `/api/v1/replays`, with replay creation and ID-based retrieval matching current Battle Lab semantics.

Specify existing query defaults, linkage filters, sorting tie breaks, UUID validation/normalization, omitted versus null fields, and dates in the API contract. Use explicit JSON date strings at the HTTP boundary and adapt to frontend Date values where required. Preserve visible validation and conflict messages through the client adapter. Define consistent errors with a code, message, and field details; distinguish invalid input, unauthenticated, forbidden, missing resources, conflicts, and internal failures.

Replace server functions and document rendering with the browser router/bootstrap, query Rust for route-session checks, and serve assets and page-route fallbacks from Rust. Deep links, refreshes, login redirects, loading states, and API 404s need coverage; an API error must never fall through to the HTML shell. Return missing asset requests as 404s too. Serve hashed assets with long-lived caching and the HTML entry with revalidation so releases do not strand browsers on old entrypoints.

Gate protected route content on the browser's session query and revalidate after login/logout and relevant authorization failures. The server remains the authority for access; a client route guard never substitutes for API authorization. Session responses must distinguish absent credentials from expired credentials to preserve the current expiry notice. During any temporary SSR stage, forwarding a session request to Rust must also propagate session-refresh cookies; finish the port with this temporary rendering layer removed.

## Engine parity

Port in dependency order: inputs and validation; normalization and IDs; RNG and numeric helpers; rows and targeting; action scheduling; effects and action planning/commit; battle loop and logs.

Preserve JavaScript semantics deliberately:

- Canonical string and numeric seeds, trimming, and FNV-1a over UTF-16 code units, including non-ASCII seeds.
- Mulberry32 wrapping arithmetic and random-consumption order.
- `f64` arithmetic, rounding at the same stages, and the `1e-9` readiness tolerance. Audit negative rounding behavior where inputs allow it.
- Stable ordering by speed, scenario input order, row, slot, and final instance-ID tie break. Do not use unordered map iteration to drive simulation decisions.
- Shared pre-action snapshots for simultaneous actions and the current rules for shields granted or consumed within the same batch.
- Structured logs, attribution, action IDs, effect lifecycles, and observable error behavior.

Compare every batch state and log entry, not just the winner. Use canonical structural comparison with documented normalization of object-key ordering and absent optional fields; do not apply broad floating-point tolerances that conceal changes in targeting or readiness. For randomized differential cases, save the seed and minimized failing input.

Retain a compatibility stepping interface equivalent to constructor, getState, resolveNextBatch, and resolve. The Rust implementation may use idiomatic ownership and typed errors without changing observable rules. Keep graphics time and scheduling out of this crate.

## Database and authentication

Baseline the existing schema and migration history before SQLx becomes the migration owner. Do not replay Drizzle migrations blindly against populated databases or run two independent migration systems over new changes. Provide and test both a clean install and an upgrade of a database with the current Drizzle history. Preserve constraints, indexes, cascade/restrict behavior, linked-record ordering, and update timestamps; Drizzle's `$onUpdate` behavior must become explicit in Rust queries or SQL.

Verify transaction rollback with invalid linked IDs and partial-update failures. Port deterministic seed/reset tooling so E2E fixtures do not depend permanently on the removed Drizzle schema. Do not run seed/reset tooling during production startup.

Rust becomes the sole authentication owner after the auth cutover. Preserve password verification for stored Better Auth hashes using a maintained cryptographic implementation. Inspect the installed version's exact parameters, password normalization, encoded hash format, cookie signature, and session behavior; the algorithm name alone is insufficient. Never introduce a production password reset solely to simplify the port.

Preserve existing valid sessions where compatible, with tests for both imported and newly created sessions. If compatibility cannot be achieved without a user-visible login reset, present that concrete cutover tradeoff before implementation of the reset. Add explicit session lifetime metadata if needed rather than inferring remember-me indefinitely from expiry timestamps.

The feature criteria require one-hour inactivity expiry without remember-me, 30 days with remember-me, sliding expiration, appropriate cookie persistence, and logout revocation. Since planning, develop merged PR #68 implementing explicit session rememberMe metadata and the required lifetimes. Port this newer behavior and its expanded tests. Add Rust injected-clock tests at the one-hour and 30-day boundaries and validate cookie/session compatibility against the features.

Retain server-side GM enforcement on every protected endpoint, including direct API requests. Preserve the database role mapping from `gm` to the application's `game_master`. Use secure session cookies, origin/CSRF checks for authenticated mutations, vetted password verification, and explicit session revocation as part of replacing the existing auth responsibilities.

## Phased delivery and exit gates

Each phase receives its own executable implementation plan and failing tests before implementation. This roadmap defines dependencies and acceptance gates rather than attempting to specify every ported function in one plan.

### 1. Establish the compatibility baseline

Source areas: `packages/engine/src`, `packages/engine/features`, `packages/api/src/__tests__`, `e2e/features`, `apps/web/src/lib`, and the existing database migrations.

Deliver an acceptance-to-test map, representative sanitized engine/API fixtures, and an inventory of imports tied to tRPC/Drizzle/Better Auth. Run current test and build gates and record any pre-existing failures. Add meaningful assertions where existing feature coverage is weaker than the requirement, particularly session duration.

Exit: discrepancies are explicit, fixtures are reproducible, and each existing feature has an identified port-validation strategy. Do not treat observed implementation bugs as approved requirements.

### 2. Port the standalone engine

Create the Cargo workspace, `crates/qd-engine`, and the fixture comparison harness together. Keep the TypeScript implementation as the reference runner during this phase. Port unit tests and use a JSON fixture runner to compare both implementations.

Exit: unit tests pass; every reference battle matches per batch, log, and final state; validation failures are covered; deterministic IDs and RNG vectors match; the engine runs without a database, web server, or GPU. Profile before introducing parallelism or optimization.

### 3. Establish Rust storage and API infrastructure

Create `qd-db`, `qd-api-types`, `apps/server`, and the generated client package. Add verified migration adoption, deterministic seeds, structured errors, configuration, health/readiness, and an HTTP contract generation check. Keep public editor mutations on the existing backend until Rust authentication is ready.

Exit: empty and populated database migration tests pass; the generated client compiles; Rust HTTP integration tests run against real PostgreSQL; drift in generated contracts fails validation.

### 4. Move authentication and session checks

Port login/session/logout endpoints and role enforcement. Update `apps/web/src/lib/auth*`, route guards in `_authenticated.tsx` and `login.tsx`, and any remaining server-side auth consumers. While legacy tRPC features remain, their context resolves identity through the Rust session service; avoid two independent session issuers.

Exit: password compatibility, legacy-session handling, expiry boundaries, cookie persistence, logout revocation, role checks, and login return-URL behavior pass unit, HTTP integration, and browser tests. Any temporary frontend server rendering correctly forwards refreshed cookies until the browser-only conversion replaces it.

### 5. Move editor APIs and Battle Lab

Migrate effects, items, units, then scenarios, respecting their linked-data dependencies. Update React consumers through the generated-client adapter and replace the API transport in E2E helpers without weakening assertions. Preserve transactional ordering and all filtering/conflict behavior.

Then port `packages/api/src/routers/battleLab/load-scenario.ts` and its mapper, and use the Rust engine for create/get. Run CPU-bound simulation outside async HTTP executor threads with bounded concurrency and an explicit failure path. Failed resolution must not create a replay record.

Exit: all editor and Battle Lab features pass on Rust; current-data replay regeneration and cascade deletion are preserved; Rust results match reference fixtures; GM authorization is enforced directly by the API.

### 6. Complete frontend deployment and remove replaced packages

Convert `apps/web/vite.config.ts` to the React/browser-router build, replace the document shell in `apps/web/src/routes/__root.tsx`, and add `apps/web/index.html` and `apps/web/src/main.tsx` as the browser entrypoints. Replace remaining `createServerFn` calls and remove `apps/web/src/routes/api/auth.$.ts` and `apps/web/src/routes/api/trpc.$.ts` after their Rust replacements are active. Keep the existing React routes and components, and regenerate the browser route tree.

Serve the compiled web assets and `/api/v1` from the Rust server on one origin. During development, proxy API calls from Vite to Rust. Verify protected deep links on a fresh browser session, expired sessions, refreshes of editor/replay URLs, and public login navigation.

Update `e2e/Dockerfile`, worker fixtures, `e2e/scripts/run-e2e.sh`, and build/dev/check commands for Rust plus React. Use Node and Rust build stages, then ship a runtime containing the Rust server, static assets, and required runtime libraries without Node or pnpm. Include Cargo manifests, lockfile, toolchain, Rust sources, migrations, and fixtures in image-cache invalidation. Preserve database/server isolation per Playwright worker.

Retire production imports of `@qd/api`, `@qd/db`, `@qd/engine`, tRPC, Drizzle, and Better Auth only after all consumers and test tooling have moved. Keep the TypeScript parity reference in a clearly test-only location until its replacement coverage is accepted. Update README and AGENTS.md to describe the final runtime and checks.

Exit: the packaged deployment passes the full acceptance suite; the previous release can be restored against an upgrade-tested schema; rollback rehearsal preserves accounts and game data. Schema changes that break rollback require a specific migration procedure before release.

## Definition of done

- Existing feature behavior is implemented in the Rust-backed app; approved discrepancies are documented.
- `pnpm run test` and `pnpm run test:e2e` pass without errors. Keep these entry points, with `pnpm run test` invoking Rust tests as well as the remaining frontend/tooling tests.
- Rust formatting, Clippy, workspace tests, real-PostgreSQL integration tests, API generation checks, TypeScript type checks, and production builds pass.
- Engine parity, clean database creation, populated database upgrade, credentials/session compatibility, and deployment rollback have recorded results.
- Production business logic, simulation, authentication, and database access execute in Rust. Rust serves the React browser application and API on one origin. Production starts and operates without Node or pnpm installed.
- No Bevy or presentation-layer work is required to complete the port.

## References

- Existing repository behavior: `packages/engine/features/*.feature`, `e2e/features/**/*.feature`, `packages/api/src/routers`, `packages/db/src/schema.ts`, and `apps/web/src/lib/auth-config.ts`.
- [Axum documentation](https://docs.rs/axum/latest/axum/): HTTP routing, state, and middleware.
- [SQLx documentation](https://docs.rs/sqlx/latest/sqlx/): PostgreSQL access and migrations.
- [Better Auth session documentation](https://better-auth.com/docs/concepts/session-management) and [password documentation](https://better-auth.com/docs/authentication/email-password): context for compatibility investigation; installed code and fixtures determine exact legacy behavior.
