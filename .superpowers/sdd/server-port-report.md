# Rust server port report

## Scope delivered

Implemented the Axum server runtime in the assigned server-owned files:

- Better Auth-compatible password verification, HMAC cookie signing, login,
  session lookup/renewal, GM authorization, and logout.
- Atomic, update-only sliding session renewal using the database `remember_me`
  value, with inclusive expiry and logout/revocation race handling.
- REST error envelopes, same-origin mutation enforcement, liveness and database
  readiness endpoints.
- Same-origin SPA/static-file hosting with JSON API 404s and no HTML fallback for
  missing assets.
- BattleLab scenario option, replay creation, replay loading, PostgreSQL graph
  mapping, bounded blocking engine execution, and replay persistence.
- `AUTH_SECRET`/`AUTH_URL` configuration with `BETTER_AUTH_SECRET`/
  `BETTER_AUTH_URL` deployment aliases, plus `HOST`, `PORT`, and `WEB_DIST_DIR`.

CRUD and validation were implemented independently in `crud.rs`,
`validation.rs`, and their tests and are outside this report's ownership.

## Compatibility details

Password verification uses NFKC plus scrypt `N=16384`, `r=16`, `p=1`, and a
64-byte output. It intentionally passes the 32-byte ASCII hex salt string to
scrypt, matching Better Auth's Node implementation. Legacy password hashes and
cookie signatures have fixed cross-runtime fixtures.

Session cookies retain Better Call's standard padded Base64 HMAC-SHA-256 and
whole-value `encodeURIComponent` encoding. HTTP uses `better-auth.*`; HTTPS uses
`__Secure-better-auth.*` with `Secure`. Short sessions omit `Max-Age` and retain
the signed `dont_remember=true` marker. Remembered sessions use
`Max-Age=2592000` and expire stale markers.

Session renewal is one guarded PostgreSQL `UPDATE ... WHERE expires_at > now`
joined to the user row. Logout and revocation cannot be undone by a late
renewal. Missing, expired, and revoked rows produce anonymous session responses
and clearing cookies. All successful protected REST activity forwards renewal
cookies.

Battle mapping reads every PostgreSQL `REAL` through PostgreSQL's `::text`
representation before parsing it as JSON `f64`. This preserves the legacy Node
driver's decimal semantics. It avoids both ordinary widening artifacts such as
stored `0.1` becoming `0.10000000149011612` and PostgreSQL tie behavior such as
stored `2097152.25::real::text` becoming `2.0971522e+06`. The regression also
checks that `3.3` versus `1.1` speeds retain the legacy simultaneous third
action batch.

CPU-heavy password verification and engine simulation share a bounded
semaphore and run through `spawn_blocking` with a 30-second bound.

## Red/green evidence

- Auth deadline regression initially failed to compile because
  `read_session_at` did not exist. It passes for one microsecond before and the
  exact deadline under both one-hour and 30-day policies.
- Database readiness contract initially returned 404 before `/api/v1/ready`
  was implemented. It now returns `200 {"status":"ready"}` with PostgreSQL and
  JSON `503 SERVICE_UNAVAILABLE` when PostgreSQL cannot be reached.
- PostgreSQL `REAL` regression initially observed `0.10000000149011612` instead
  of `0.1`. Database-text mapping now passes `0.1`, the `2097152.2` tie case,
  and the exact action grouping `[(1,Fast),(2,Fast),(3,Fast),(3,Slow)]`.
- `DATABASE_URL=postgres://postgres:password@localhost:5440/qd_rust_test cargo test -p qd-server --tests`:
  31 tests passed across server unit, auth compatibility/policy, BattleLab,
  CRUD/validation, static hosting, origin, health, and readiness suites.
- `cargo clippy -p qd-server --tests -- -D warnings`: passed.
- `cargo fmt --check`: passed.

All PostgreSQL integration tests use `#[sqlx::test(migrations=false)]` injected
isolated pools. The local URL above only supplied SQLx's administrative test
database for this verification run; no test hard-codes it.

The parent task owns the full Playwright/Docker run and deployment integration,
so those checks were not duplicated here.
