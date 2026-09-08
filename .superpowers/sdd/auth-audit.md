# Better Auth to Rust compatibility audit

Scope: read-only audit of the `develop` auth implementation at merge commit `7eb4c9b`, including Better Auth 1.6.11 / `@better-auth/utils` 0.4.0 / Better Call 1.3.5 installed sources and the authentication unit/E2E acceptance tests. No credentials or deployed secret values are included here.

## Required HTTP surface

The existing browser client (`createAuthClient()` with defaults) calls these same-origin endpoints under `/api/auth`:

- `POST /api/auth/sign-in/email`, JSON body `{ email, password, rememberMe }`. The application always sends a boolean from the login form. Treat omitted `rememberMe` as `false` (the application's middleware deliberately overrides Better Auth's upstream default of `true`). On success the current client accepts Better Auth's JSON shape `{ redirect: false, token, url: null, user }` and consumes the response cookies. Invalid credentials must be non-2xx; the UI intentionally collapses every error to `Invalid credentials`.
- `GET /api/auth/get-session`. Return JSON `null` for no valid session, otherwise `{ session, user }`. The browser and protected server reads use this route. Cookie cache is disabled, so every valid read must consult PostgreSQL.
- `POST /api/auth/sign-out`. Return `{ "success": true }` after deleting the database session selected by the signed cookie and clearing auth cookies. Missing/invalid cookies still result in successful cookie clearing.

Email lookup is case insensitive in practice: Better Auth lowercases the submitted email before querying `user.email`. Password accounts are rows in `account` with `provider_id = 'credential'`; the password hash is in `account.password`. User/account/session field names and relationships are in `packages/db/src/schema.ts`.

The existing sign-in route applies Better Auth's same-origin/origin check. Preserve a same-origin check for state-changing auth requests when replacing the handler. Requests from the React client use JSON and same-origin cookies.

## Password hash compatibility (exact legacy format)

The seed command imports `hashPassword` from `better-auth/crypto`. Under Node, package export conditions select `@better-auth/utils/dist/password.node.mjs`.

Stored format:

```text
<32 lowercase hex chars>:<128 lowercase hex chars>
```

Exact derivation:

1. Normalize the password string with Unicode **NFKC**.
2. Encode the normalized password as UTF-8.
3. Generate 16 random salt bytes and lowercase-hex encode them to a 32 character string when creating a new hash.
4. Run scrypt with password bytes from step 2 and the **32 ASCII/UTF-8 bytes of the hex salt string**. Do not hex-decode the salt back to 16 bytes.
5. Parameters are `N = 16384` (`log_n = 14`), `r = 16`, `p = 1`, derived-key length `64` bytes. The JS implementation supplies `maxmem = 128 * N * r * 2 = 67,108,864` bytes.
6. Lowercase-hex encode the 64 byte derived key and join `salt:key`.

For verification, require exactly one useful separator and valid lengths/hex, repeat the derivation, and compare derived bytes in constant time. Better Auth itself only splits and string-compares, but Rust should use constant-time verification.

Minimal Rust support: `scrypt` using the low-level `scrypt()` API with `Params::new(14, 16, 1, 64)`, `unicode-normalization` for `.nfkc()`, `hex`, and `subtle` (or a constant-time comparison already exposed by the crypto crate). A PHC/password-hash parser alone is not compatible with this legacy `hex:hex` representation.

## Session token and signed cookie format

Default session tokens are 32 cryptographically random characters from `abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`. The database stores the raw token in `session.token`; the browser never receives it unsigned.

The signed cookie payload is exactly:

```text
raw_token + "." + BASE64_STANDARD_PAD(HMAC_SHA256(secret_utf8, raw_token_utf8))
```

The HMAC signature is 32 bytes, standard Base64 with `+`, `/`, and trailing `=`; it is therefore exactly 44 characters and ends in `=`. Better Call then applies JavaScript `encodeURIComponent` to the complete `token.signature` string before serializing `Set-Cookie`. A typical `=` becomes `%3D`; `+` and `/` become `%2B` and `%2F`. On request, Better Call percent-decodes each cookie value first, splits at the **last** `.`, verifies signature length/padding, and verifies HMAC-SHA-256 with the raw UTF-8 bytes of `BETTER_AUTH_SECRET` as the key. Rust must percent-decode before splitting/verifying and should use constant-time MAC verification.

Keep the same `BETTER_AUTH_SECRET` during a cutover if existing browser cookies must remain valid. If session continuity is unnecessary, rotating it invalidates all old cookies, but stale database session rows should then also be removed.

Minimal Rust support: `hmac` + `sha2`, `base64` with `STANDARD` padded encoding, `percent-encoding`, a CSPRNG (`rand`/`rand_core`), and a cookie serializer/parser. `axum-extra`'s cookie feature or `cookie` is sufficient, but sign/verify explicitly to match Better Call rather than assuming a crate's private-cookie format matches.

## Cookie names, attributes, and prefixes

Defaults are driven by the configured public Better Auth base URL:

| Purpose | HTTP/local name | HTTPS/secure name | Default attributes |
|---|---|---|---|
| session token | `better-auth.session_token` | `__Secure-better-auth.session_token` | `Path=/; HttpOnly; SameSite=Lax`; add `Secure` for prefixed form |
| nonremember marker | `better-auth.dont_remember` | `__Secure-better-auth.dont_remember` | same base attributes |
| disabled cache cleanup | `better-auth.session_data` | `__Secure-better-auth.session_data` | same base attributes |

The implementation uses `__Secure-`, never `__Host-`. With `BETTER_AUTH_URL=http://localhost:<port>` E2E uses unprefixed, non-Secure cookies even when the process is otherwise production-like. An HTTPS base URL uses the secure prefix and `Secure`. Derive this from the public URL/config, and accept the corresponding exact name. Accepting both names during a rollout is harmless if both are verified with the same secret, but when clearing, clear both variants if deployment protocol/config may have changed.

Cookie lifetime rules:

- Remembered session: session-token cookie has `Max-Age=2592000` (30 days). Each successful activity response reissues the **same signed token value** with a fresh 30 day Max-Age. The browser-observed expiry must advance.
- Short session: session-token and `dont_remember` marker are browser-session cookies: omit both `Max-Age` and `Expires`. Each successful activity may reissue them, but they must remain browser scoped.
- A short sign-in creates a signed `dont_remember=true` marker. A remembered sign-in does not need it. A remembered renewal explicitly expires a stale marker.
- Clearing uses an empty value and `Max-Age=0`, preserving `Path=/`, `HttpOnly`, `SameSite=Lax`, and `Secure` when applicable. Clear at least `session_token`, `dont_remember`, and `session_data` (including any cache chunks if ever present).

The marker is compatibility metadata only. The database `session.remember_me` column is authoritative. Deleting the marker must never turn a short session into a remembered one.

## Server-owned sliding session policy

`session.remember_me BOOLEAN NOT NULL DEFAULT false` was added by migration `0020_fearless_frightful_four.sql`. That migration also caps every pre-existing session to `updated_at + interval '1 hour'`, preventing legacy sessions from accidentally becoming remembered sessions.

Creation and every accepted activity use these invariants:

| `remember_me` | Database idle TTL | Browser cookie |
|---|---:|---|
| `false` or omitted | 3,600 seconds | session cookie, no persistent expiry |
| `true` | 2,592,000 seconds | `Max-Age=2592000` |

On creation set `updated_at = now` and `expires_at = now + policy TTL`. On each valid session read that is activity, keep the token unchanged and update both fields so `updated_at = now` and `expires_at = now + policy TTL`, then reissue the appropriate cookie. The tests allow about one second of PostgreSQL/HTTP timestamp rounding.

The database row decides the TTL. Do not infer remembered state from cookie persistence or the marker. An absent marker still produces a one-hour DB renewal and a browser-session token cookie for a short row.

Expiry is inclusive: reject when `expires_at <= now`. At the exact boundary the current direct HTTP handler returns `401` with `{ code: "SESSION_POLICY_REJECTED", message: "Session expired or revoked" }` and clearing cookies. Once Better Auth has already classified/deleted an older expired row, `/get-session` returns `200` with `null` and clearing cookies. The React route treats either as unauthenticated; preserving the exact 401 boundary keeps the unit contract.

Renewal must be update-only, never insert/upsert. Flow: verify cookie, load session plus user, test inclusive expiry, then `UPDATE session ... WHERE token = ? RETURNING ...`. If a concurrent logout deleted it and the update returns no row, reject as `SESSION_POLICY_REJECTED` and clear cookies. This is the key logout/renewal race guarantee. A stronger single conditional update (`WHERE token = ? AND expires_at > now`) is compatible and closes the tiny read/update expiry race.

Every request that resolves auth for protected SSR/navigation or backend API activity must perform and propagate this renewal. The recent `30890c8` change fixes loss of `Set-Cookie` headers when a policy rejection is represented as an auth error: expired/raced-out reads must still forward **all** clearing headers to the final SSR or API response. The preceding `c8668e3` change establishes that both SSR navigation and API requests advance remembered cookie expiry, and that marker deletion cannot extend a short session. The Rust server should attach renewal/clearing `Set-Cookie` headers directly to every protected REST response and HTML/navigation response where it authenticates the request.

The old helper supports `disableRefresh`; when set, it validates and returns the session without changing timestamps/cookies. Protected route checks deliberately disable cookie cache, not refresh. The new server only needs this bypass if an equivalent non-activity internal read exists.

## Role compatibility and routing

Database role enum values are `gm` and `player`. Shared/browser role values are `game_master` and `player`:

```text
DB gm      -> API/browser game_master
DB player  -> API/browser player
```

The authenticated browser/session response must include user `id` and mapped role. The current UI falls back to player if a role is absent/unknown during navigation; backend authorization should instead reject or deny an unknown role rather than grant GM access. GM-only route families are `/create`, `/battle`, and `/replay` (including descendants). `/play` is available to either authenticated role. `/403` is itself authenticated. Unauthenticated protected navigation redirects to `/login?next=<relative path>` except `/403`, which omits `next`; if any auth cookie was present, rejected/expired navigation also sets `reason=expired`.

The login response/next-path behavior remains browser owned: default GM route `/create`, default player route `/play`; player requests for GM paths land on `/403`; external/protocol-relative `next` values are rejected.

## Logout compatibility

Verify the signed session cookie. If valid, delete `session` by its raw token. Always expire the auth cookies and return `{ success: true }`, including when the cookie is missing, malformed, has a bad signature, or the row is already absent. The existing Better Auth implementation logs and still clears cookies if database deletion throws; the Rust implementation may return an explicit server error on database failure, but must not report a successful durable logout while leaving a replayable row unless this compatibility choice is intentional.

The acceptance test captures the old cookies, logs out, confirms the database row count for that token is zero, restores the captured cookies, and requires the protected route to reject them. Therefore deleting the row is mandatory; clearing only the browser is insufficient.

Redirect after logout is React behavior, not the auth endpoint: `/login?next=<current relative URL>` except from `/login` and `/403`, which omit `next`.

## Suggested implementation checks

Add narrow interoperability fixtures before removing Better Auth:

1. Generate a fixed legacy hash in JS from a fixed salt/password (including a Unicode NFKC case) and verify it in Rust; generate the same derivation in Rust and verify via Better Auth.
2. Sign a fixed token with a non-secret test key in JS and Rust and compare the exact percent-encoded cookie values, including `+`, `/`, and `=` handling.
3. Exercise both HTTP and HTTPS cookie names/attributes.
4. Port the policy cases from `apps/web/tests/unit/session-policy.test.ts`: omitted/false/true metadata, inclusive expiry, repeated 59 minute short renewals, 30 day remembered renewal, deleted marker, stale marker cleanup, logout race, replay after logout, and propagation of every clearing cookie.
5. Keep the existing authentication E2E features as the final behavior contract.

Primary inspected sources: `apps/web/src/lib/session-policy.ts`, `auth-config.ts`, `auth-session.ts`, `auth-session.server.ts`, `route-utils.ts`; `apps/web/src/routes/login.tsx`, `_authenticated.tsx`, auth/tRPC routes; `apps/web/tests/unit/session-policy.test.ts`; `e2e/features/authentication/*`; `e2e/tests/auth/*`; `packages/db/src/schema.ts`, `seed.ts`, migration 0020; and the installed Better Auth/Better Call distribution files named above.
