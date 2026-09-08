# Database ownership and compatibility artifacts

`qd-db migrate` verifies and adopts recognized Drizzle history, then runs SQLx migrations. The legacy SQL files are byte-for-byte copies of `reference/db/drizzle/*.sql`; `legacy-manifest.json` records the original SHA-256 hashes and Drizzle timestamps. SQLx versions are one-based.

`legacy-schema-signatures.json` contains the public schema after every migration prefix, including the empty prefix. It was captured by applying the original migration files in order to an isolated PostgreSQL 17 database and executing `src/schema-signature.sql` after each file. These signatures include columns, defaults, constraints, indexes, and enum order. Matching ledger entries alone do not authorize adoption of a drifted live schema.

`schema-signatures.json` contains the final migration-created schema and the equivalent legacy `drizzle-kit push` schema. Only those recognized complete schemas can be adopted without migration history. Unknown schemas and modified or newer history fail without claiming adoption or resetting data.

Generate deterministic game seed data from the retained TypeScript reference with `node scripts/generate-seed-data.mjs` from the repository root. Fixed update dates are part of library sorting fixtures; current timestamps are supplied by PostgreSQL only when the reference did not specify them. Accounts use fixed IDs and a stored Better Auth-compatible test password hash.

`seed` and `reset-game-data` are explicit development/test operations. The server never invokes them. `reset-game-data` preserves accounts and sessions while replacing game fixtures. Use backups and a retained previous release image for production upgrades; SQLx owns all new migrations after cutover.
