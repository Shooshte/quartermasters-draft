# Quartermasters Draft

The production application is a Rust HTTP server serving a React browser application, backed by PostgreSQL. Node is used only to build and test the frontend. Battle simulation is a standalone Rust crate; Bevy presentation is a separate future project.

## Requirements

- Rust 1.97.1 (the pinned toolchain is installed by rustup)
- Node.js v24+ and pnpm v10+ for frontend development/builds
- Docker for the local PostgreSQL and integration/browser tests

## Local development

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Start a development database, then export configuration in the terminal used for the following commands:

```bash
docker run -d --name quartermasters-pg -p 5432:5432 \
  -e POSTGRES_PASSWORD=password -e POSTGRES_DB=quartermasters-draft postgres:17-alpine
export DATABASE_URL=postgres://postgres:password@localhost:5432/quartermasters-draft
export AUTH_SECRET="$(openssl rand -hex 32)"
export AUTH_URL=http://localhost:3000
pnpm db:migrate
pnpm db:seed
pnpm dev
```

The browser app runs at [localhost:3000](http://localhost:3000). Vite proxies `/api` to the Rust development server on port 3001. `AUTH_URL` is the browser origin, not the internal API port. Existing `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` names are also accepted; keep the existing secret when migrating signed sessions.

Seed accounts are `gm@example.com` and `player@example.com`, both with password `password123`. Seeding is an explicit development/test command and is never performed by server startup.

## Commands

```bash
pnpm dev             # Vite + Rust API
pnpm build           # Browser assets + release Rust workspace
pnpm test            # Frontend/reference/tooling tests + Rust tests
pnpm test:rust       # Rust unit and real-PostgreSQL integration tests
pnpm test:e2e        # Browser tests against the Docker production image
pnpm lint            # Biome, TypeScript, Rust formatting, Clippy
pnpm typecheck       # TypeScript checks
pnpm check           # Contract drift, lint, dependency check, tests, production build
pnpm db:migrate      # Verified adoption and SQLx migrations
pnpm db:seed         # Explicit development/test seed data
pnpm api:generate    # Regenerate OpenAPI and TypeScript client from Rust DTOs
pnpm --filter @qd/api-client check:generated
```

When `DATABASE_URL` is unset, Rust tests provision and remove an isolated PostgreSQL container. When set, tests use SQLx-managed temporary databases on that server; the database user needs permission to create test databases. Never point tests at a production server. Browser tests create a separate database and application instance for each worker.

## Production

```bash
docker build -f e2e/Dockerfile -t quartermasters-draft .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL -e AUTH_SECRET -e AUTH_URL quartermasters-draft
```

The image contains `qd-server`, `qd-db`, browser assets, and required runtime libraries. It contains neither Node nor pnpm. Configure `AUTH_URL` to the public HTTPS origin, terminate TLS at the deployment edge, and retain `AUTH_SECRET` across releases. `HOST`, `PORT`, and `WEB_DIST_DIR` can override listener and asset locations. Run `qd-db migrate` as a deployment step; startup also verifies/applies migrations and never seeds data.

The API lives at `/api/v1`; page URLs remain `/login`, `/create`, `/play`, `/battle`, and `/replay/:id`. Saved replays continue to use the latest scenario data and their stored seed.

## Upgrading an existing database

Back up the database before a production upgrade and retain the previous release image. `qd-db migrate` verifies the live schema against its exact recognized Drizzle migration history and adopts that history into SQLx without reapplying completed migrations. A database created with `drizzle-kit push` is adopted only when its columns, constraints, indexes, and enums match a recorded source schema. A differing or newer schema fails explicitly; no reset is attempted.

Keep the existing auth secret and origin. The Rust backend verifies Better Auth scrypt hashes and signed session cookies, including the explicit `remember_me` policy from the current schema. Fresh installs apply the original migration sequence, including that policy migration. Restoring the prior release against an adopted current schema does not require deleting SQLx metadata or changing credentials.

SQLx owns new migrations after cutover. Do not resume Drizzle schema pushes or create competing migration histories. Seed and `reset-game-data` commands are development/test tools, not upgrade steps.

## Code organization

- `apps/web`: React, TanStack Router, React Query, Tailwind; browser-only.
- `apps/server`: Axum API, authentication/authorization, editor services, and battle execution.
- `crates/qd-engine`: deterministic simulation with no database, server, or rendering dependency.
- `crates/qd-db`: PostgreSQL migration, seed and test-reset tooling.
- `crates/qd-api-types`: authoritative Serde/OpenAPI wire contract.
- `packages/api-client`: generated TypeScript contract and browser transport.
- `packages/shared`: frontend role types.
- `fixtures/engine-parity`, `scripts/engine-parity`: reproducible TypeScript-to-Rust comparisons.
- `reference/{api,db,engine}`: unchanged TypeScript behavior and migration reference; test-only.
- `e2e`: browser acceptance tests against the Rust production image.

Existing `.feature` files remain the behavioral acceptance criteria. Refer to the committed migration design for scope and verification gates.
