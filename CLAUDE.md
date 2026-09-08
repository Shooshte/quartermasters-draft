# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Agent Execution Contract

- Treat .feature files as acceptance criteria. Only deviate from it when explicitly asked.
- Keep edits and modifications scoped only to the requested task.
- Avoid adding new dependencies unless necessary.
- When changing behavior, include or update unit tests and integration tests.
- Follow test-driven-development. Add unit tests before implementation, check that they fail, then write implementation that passes the test.
- Prefer explicit error handling over silent failures.
- Use deterministic IDs for seed data

## Definition of Done (for agent tasks)

- The requested behavior is implemented.
- `pnpm run test` and `pnpm run test:e2e` pass without errors
- Any assumptions or follow-ups are clearly listed in the final handoff.

## Architecture

Rust backend + React browser app in one repository. Production runs without Node: `qd-server` serves the HTTP API and compiled React assets, with PostgreSQL for persistence. Bevy presentation is a separate project.

### Rust workspace

- **`apps/server` (`qd-server`)** — Axum HTTP server, authentication and GM authorization, editor CRUD, scenario loading, and authoritative battle execution. Public API under `/api/v1` uses JSON and generated contracts.
- **`crates/qd-engine`** — Standalone deterministic battle simulation. No database, HTTP, rendering, or wall-clock dependency. Preserve TypeScript parity, including RNG, rounding, batch ordering, and structured logs.
- **`crates/qd-db`** — SQLx PostgreSQL migrations, verified legacy-schema adoption, deterministic seeds, and explicit test reset tooling. Never reset or seed application data during startup.
- **`crates/qd-api-types`** — Authoritative Serde/OpenAPI wire DTOs. Regenerate and check the TypeScript contract whenever these change.

### Frontend

- **`apps/web`** — React 19, TanStack Router and React Query, Tailwind v4, shadcn/ui. Vite builds a browser-only app; do not reintroduce server functions or Node runtime dependencies.
- **`packages/api-client`** — Generated API types and browser transport/error/date adapter. No dependency on legacy tRPC or database packages.
- **`packages/shared`** — Frontend user-role types.

Internal TypeScript packages export built `dist` artifacts, not source `.ts` files. Keep `build`, `typecheck`, and `dev` scripts aligned with this contract.

### Testing

- `pnpm run test` runs TypeScript unit/reference/tooling tests and Rust tests. Rust integration tests provision ephemeral PostgreSQL when `DATABASE_URL` is unset; an explicitly configured test server must permit SQLx temporary databases.
- `pnpm run test:e2e` runs Playwright against the production Docker image, with isolated databases and app instances per worker. The image must contain neither Node nor pnpm.
- Rust unit/integration tests use `cargo test --workspace`; HTTP tests exercise Axum and real PostgreSQL. Engine fixtures and differential runners compare the Rust implementation against the TypeScript reference.
- `pnpm lint` runs Biome, TypeScript, Rust formatting and Clippy. `pnpm --filter @qd/api-client check:generated` verifies generated contract drift.
- Browser behavior remains specified by `e2e/features`; engine behavior remains specified by the engine reference `.feature` files. Preserve assertions when replacing transport-specific helpers.

### Configuration and migrations

- `DATABASE_URL` — PostgreSQL connection string.
- `AUTH_SECRET` / legacy `BETTER_AUTH_SECRET` — Cookie-signing secret. Preserve the existing secret across migration.
- `AUTH_URL` / legacy `BETTER_AUTH_URL` — Public browser origin, used for cookie policy and origin checks.
- `HOST`, `PORT`, `WEB_DIST_DIR` — Listener and browser-asset directory overrides.

Use `pnpm db:migrate` for verified adoption and SQLx migrations; SQLx owns new migrations. Do not resume Drizzle pushes or competing migration histories. Seed IDs must remain deterministic; passwords and valid sessions must survive supported upgrades.

### Toolchains

- Rust pinned by `rust-toolchain.toml`.
- Node.js v24+ and pnpm v10+ for frontend build/test tooling only.
