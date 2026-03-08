# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

Turborepo + pnpm monorepo with `@qd/` package namespace.

### Packages

- **`apps/web`** — TanStack Start (v1.166.x) SSR app with React 19, Tailwind v4, shadcn/ui. Uses `vite.config.ts` with `tanstackStart()` plugin — no `app.config.ts` or entry files.
- **`packages/api`** — tRPC v11 routers with superjson transformer. Three procedure levels: `publicProcedure`, `protectedProcedure` (requires auth), `gmProcedure` (requires GM role).
- **`packages/db`** — Drizzle ORM with PostgreSQL. Schema includes Better Auth tables (user, session, account, verification) plus a custom `role` enum ("gm" | "player").
- **`packages/engine`** — Game battle engine logic (standalone, no external deps).
- **`packages/shared`** — Shared TypeScript types (UserRole, User).
- **`e2e/`** — Playwright tests running against Docker Compose stack (postgres, app, migrate, seed).

### Testing

- **Unit tests**: Vitest with jsdom (web) or node (packages). Web tests use `@testing-library/react` with setup file at `apps/web/tests/setup.ts`.
- **API tests**: Use `createCaller` from tRPC to test procedures directly without HTTP.
- **E2E tests**: Playwright against Docker Compose stack. Run via `e2e/scripts/run-e2e.sh`. Tests hit `http://localhost:3000`.

### Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — Session secret
- `BETTER_AUTH_URL` — Base URL for auth
