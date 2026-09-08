# Frontend and public HTTP contract port

Scope: `apps/web`, `packages/api-client`, `crates/qd-api-types`. Parent owns backend, database, E2E transport/fixtures, deployment, root manifests/lock, and overall acceptance.

## Implementation

- Converted React to a browser app: Vite React + TanStack Router plugin, `index.html`/`main.tsx`, QueryClientProvider, regenerated browser-only routes, CSS client declaration. Production output is `apps/web/dist` for Rust static serving; development `/api` proxy targets port 3001. Router plugin 1.167.0 declares a peer range compatible with the retained React Router 1.169.2.
- Removed TanStack Start, Nitro, SSR query integration, server functions, auth/tRPC server routes, Better Auth implementation and server dependencies from web. Production UI imports no `@qd/api`, `@qd/db`, `@qd/engine`, tRPC, Better Auth or Start. Shared role enum remains `@qd/shared`.
- Added authoritative Serde + utoipa public DTOs and OpenAPI for editor CRUD/list filters, auth, replays, full battle state and typed log variants. Public battle DTOs are independent of private Rust engine types. Input defaults reflect prior HTTP behavior; nullable effect fields permit omission, output fields remain required/null as applicable. Unit targeting defaults have a direct Rust test.
- Added generated OpenAPI and TypeScript artifacts, pinned openapi-typescript 7.10.1 with package-local TypeScript 5.9.3 generation and drift check; package exports built dist files. Adapter uses `/api/v1` plain JSON, resource PUT/DELETE routes, URL-encoded JSON `input` list query, same-origin credentials, no-store requests, explicit errors with status/code/details and Date restoration only for timestamps.
- Preserved editor/battle component behavior and query wrappers, replacing production backend type inference with generated contract types. Existing component test assertions retained while switching mocks to the REST adapter.
- Browser route guards query Rust session directly, retain expired-session notices and full return URLs. Login/logout and authorization failures trigger session/query revalidation. Login now visibly reports session-read unavailability instead of silently displaying an anonymous form.

## Test-first evidence

1. Added five API transport tests against an empty adapter stub; all five failed on missing required adapter behavior. Implemented transport; all five passed.
2. Added Rust OpenAPI contract test against an empty document; failed because the required effects request schema ref was missing. Implemented DTOs/schema; passed.
3. Added unit-target default/nullable effect test; failed deserializing missing `targetScope`. Added exact legacy defaults; passed.
4. Added login session-service error test; failed because no alert rendered. Added explicit alert; passed.
5. Added browser integration tests for expired protected deep links, public shell/login, player direct editor denial; added real adapter/hook login/logout tests. Existing UI coverage retained.
6. Added an explicit null/omission roundtrip test for battle effect templates; it failed because `health: null` was omitted. Preserved the distinction with a nullable deserializer and regenerated nullable TypeScript fields; passed.
7. Added contract compatibility test deserializing every fixture's initial state and every resolved batch into public BattleState DTOs; all passed.

## Removed legacy test mapping

These source tests depended on removed server code; feature behavior must be reviewed in Rust/E2E, not assumed removed:

| Removed test file | Behavioral coverage ownership after cutover | Implementation-only assertions retired |
| --- | --- | --- |
| auth-config.test.ts | Rust password login, maximum30-day session policy | Better Auth `disableSessionRefresh`/cookieCache config flags |
| auth-session.test.ts | REST session no-store test; browser service-error test; Rust expiry response semantics | Better Auth APIError class and `disableCookieCache` query argument |
| ssr-session-cookies.test.ts | Rust responses directly issue refresh/clearing cookies; Rust preserves non-auth errors | SSR forwarding wrapper no longer exists |
| trpc-session-cookies.test.ts | Rust responses directly issue refresh/clearing cookies; structured API errors | tRPC response forwarding and policy-normalization wrappers no longer exist |
| session-policy.test.ts | Rust injected clock + real HTTP cookie tests (detailed checklist below) | Better Auth `disableRefresh` internal query; signup rememberMe default (no signup endpoint/UI in new scope) |

Detailed moved policy checklist communicated to parent and backend author: nonremember sliding renewal at 59/118 minutes; true/false/omitted rememberMe storage and cookies; exact1h/30d expiry and cookie clearing; remembered renewal after61 minutes; HTTP sign-in/renewal Max-Age30days vs session-only cookies; deleting remember-state marker cannot extend stored TTL; stale nonremember marker clearing for stored remembered sessions; logout/renewal race cannot resurrect sessions; logged-out token replay rejected; expiry/race clearing headers survive normalization.

Retained web acceptance behavior tests: login form, invalid credentials, safe return URL, role defaults and forbidden redirect, expired notice, logout redirect and query preservation, GM navigation, all editor forms/controllers/library/filter/pagination/workspace tests, and all Battle Lab setup/result/log tests.

## Fresh verification

- `pnpm --filter @qd/web test`: 47 files, 415 tests passed.
- `pnpm --filter @qd/web typecheck`: passed.
- `pnpm --filter @qd/web build`: passed, static browser output only.
- `pnpm --filter @qd/api-client generate` / `build`: passed.
- `pnpm --filter @qd/api-client check:generated`: passed.
- `cargo test -p qd-api-types`: 4 integration tests passed, doc/unit targets passed.
- `cargo clippy -p qd-api-types --all-targets -- -D warnings`: passed.
- `cargo fmt -p qd-api-types`: applied; `git diff --check` scoped files clean.
- Biome scoped check: 139 files checked, no errors/fixes remaining.
- Production dependency search found no forbidden backend/SSR imports.

## Parent integration follow-ups

- Full root tests, Rust HTTP acceptance, full E2E, production static/API routing, upgrade/rollback and browser deployment checks remain parent-owned; this report does not claim those complete.
- Backend consumes authoritative request DTOs and must validate semantic numeric/linkage constraints, normalize UUIDs and return the documented logical payloads. API list results still use `items/page/limit/totalCount`.
- Parent should review the moved policy checklist against Rust test coverage before retiring reference packages.
- Parent owns pnpm lock update and Biome exclusion of generated OpenAPI/TypeScript files; standard generation drift check validates those files instead.

## Review follow-up: preserve expiry after a protected REST 401

Confirmed P2: a protected API 401 clears session cookies before router revalidation. The following `/auth/session` correctly returns `hadSession:false`, so the previous guard lost the original expiry notice.

The browser adapter now records protected 401 expiry context before emitting its authorization event, includes the HTTP status in that event, and the route guard combines the recorded context with the session response. A 403 does not create an expiry marker. A confirmed authenticated guard or successful explicit login/logout clears the marker, preventing stale notices after an authentication change.

Test-first evidence: the integrated real adapter callback + router guard regression failed with `reason` undefined after a simulated401/cookie-clear/session-false sequence. The403 control passed. Separate successful-login/logout reset tests failed with stale `reason=expired` before adding their reset; all now pass. Existing deep-link `next` URL and visible expired notice assertions remain intact.

Follow-up verification: `pnpm --filter @qd/web test` passed419 tests/47 files; targeted browser/session tests passed9; web typecheck and production build passed; scoped Biome and diff checks passed. Rust numeric contract changes and overall root/E2E checks remain parent-owned.
