# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev                    # Start all apps/packages in dev mode (turbo)
pnpm build                  # Build all packages (turbo)
pnpm lint                   # Lint all packages (turbo)

# Testing
pnpm test                   # Run all unit tests (turbo, vitest)
pnpm --filter @qd/web test  # Run web app tests only
pnpm --filter @qd/api test  # Run API package tests only
pnpm test:e2e               # Run e2e tests (Docker + Playwright, not turbo)

# Run a single test file
pnpm --filter @qd/web exec vitest run tests/unit/button.test.tsx
pnpm --filter @qd/api exec vitest run src/__tests__/health.test.ts

# Database
pnpm db:push                # Push schema to database (drizzle-kit push)
pnpm db:seed                # Seed database with test data
pnpm db:generate            # Generate drizzle migrations
pnpm db:migrate             # Run drizzle migrations
```

## Architecture

Turborepo + pnpm monorepo with `@qd/` package namespace.

### Packages

- **`apps/web`** — TanStack Start (v1.166.x) SSR app with React 19, Tailwind v4, shadcn/ui. Uses `vite.config.ts` with `tanstackStart()` plugin — no `app.config.ts` or entry files.
- **`packages/api`** — tRPC v11 routers with superjson transformer. Three procedure levels: `publicProcedure`, `protectedProcedure` (requires auth), `gmProcedure` (requires GM role).
- **`packages/db`** — Drizzle ORM with PostgreSQL. Schema includes Better Auth tables (user, session, account, verification) plus a custom `role` enum ("gm" | "player").
- **`packages/engine`** — Game battle engine logic (standalone, no external deps).
- **`packages/shared`** — Shared TypeScript types (UserRole, User).
- **`e2e/`** — Playwright tests running against Docker Compose stack (postgres, app, migrate, seed).

### Key Patterns

- **TanStack Start routes**: Use `createFileRoute` with `server: { handlers: { GET, POST } }` — `createAPIFileRoute` does not exist in v1.166.x.
- **CSS loading**: `import appCss from "~/styles/app.css?url"` in root route's `head()` links array.
- **Router**: Export `getRouter()` function (not router instance) from `apps/web/src/router.tsx`. Route tree is auto-generated in `routeTree.gen.ts`.
- **Auth**: Better Auth with `drizzleAdapter` from `better-auth/adapters/drizzle`. Requires `@better-auth/drizzle-adapter` as explicit dependency.
- **tRPC handler**: `apps/web/src/routes/api/trpc.$.ts` — extracts userId/userRole from Better Auth session headers to build tRPC context.
- **Path alias**: `~/` maps to `apps/web/src/` in the web app.
- **Vite**: Must be v7+ for compatibility with @tanstack/react-start and nitro-nightly.
- **esbuild**: Requires `pnpm.onlyBuiltDependencies: ["esbuild"]` in root package.json.

### Testing

- **Unit tests**: Vitest with jsdom (web) or node (packages). Web tests use `@testing-library/react` with setup file at `apps/web/tests/setup.ts`.
- **API tests**: Use `createCaller` from tRPC to test procedures directly without HTTP.
- **E2E tests**: Playwright against Docker Compose stack. Run via `e2e/scripts/run-e2e.sh`. Tests hit `http://localhost:3000`.

### Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Session secret
- `BETTER_AUTH_URL` — Base URL for auth
