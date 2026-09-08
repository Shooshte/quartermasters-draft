# TypeScript compatibility reference

These are the original API, database, and battle engine packages. They remain in the development workspace so their existing tests and the differential engine oracle continue to run. The production React app and Rust binaries do not depend on them, and they are excluded from the runtime image.

Do not use the legacy database commands against a production database after SQLx adoption. The Rust `qd-db` binary owns migrations and seed operations. Historical Drizzle SQL is retained to verify adoption and rehearse rollback.
