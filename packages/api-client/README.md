# Rust HTTP client

`crates/qd-api-types` is the authoritative Serde/OpenAPI wire contract. Run `pnpm --filter @qd/api-client generate` after changing its DTOs, and commit both `openapi.json` and `src/generated.ts`. `pnpm --filter @qd/api-client check:generated` regenerates in memory and fails on drift. Build with `pnpm --filter @qd/api-client build` before consumers; the package exports only `dist` artifacts.

The small transport uses same-origin credentials and plain JSON at `/api/v1`. Collection filters are an `input` query parameter containing URL-encoded JSON. Update IDs live in the resource path, not the body. API errors retain `code`, `message`, `details`, and HTTP status. Authentication failures signal the browser to clear queries and revalidate protected routes. Auth session responses are never cached.

Timestamps are ISO date strings on the wire; the browser adapter restores only `createdAt` and `updatedAt` to `Date` objects. Form values and ordered linked IDs otherwise pass through unchanged. The `scenarioBuilder`/`battleLab` wrappers preserve component call structure without depending on tRPC or backend packages.
