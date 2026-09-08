//! PostgreSQL migration ownership and explicit development/test seed commands.
use serde::Deserialize;
use sqlx::{PgPool, Row};

pub type DbResult<T> = Result<T, Box<dyn std::error::Error + Send + Sync>>;
pub static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("./migrations");

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LegacyMigration {
    version: i64,
    created_at: i64,
    hash: String,
}

/// Adopt a verified Drizzle history, then apply migrations with SQLx as sole owner.
/// Unknown histories fail before we record any adoption. Existing data is never reset.
pub async fn migrate(pool: &PgPool) -> DbResult<()> {
    let mut tx = pool.begin().await?;
    sqlx::query("SELECT pg_advisory_xact_lock(319171637382)")
        .execute(&mut *tx)
        .await?;
    let sqlx_exists: bool =
        sqlx::query_scalar("SELECT to_regclass('public._sqlx_migrations') IS NOT NULL")
            .fetch_one(&mut *tx)
            .await?;
    let legacy_exists: bool =
        sqlx::query_scalar("SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL")
            .fetch_one(&mut *tx)
            .await?;
    if !sqlx_exists && legacy_exists {
        let history = sqlx::query(
            "SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at, id",
        )
        .fetch_all(&mut *tx)
        .await?;
        let expected: Vec<LegacyMigration> =
            serde_json::from_str(include_str!("../legacy-manifest.json"))?;
        if history.len() > expected.len() {
            return Err(
                "Database contains migrations newer than this release; refusing adoption".into(),
            );
        }
        for (row, entry) in history.iter().zip(&expected) {
            if row.try_get::<String, _>("hash")? != entry.hash
                || row.try_get::<i64, _>("created_at")? != entry.created_at
            {
                return Err(format!(
                    "Drizzle migration history differs at version {}; refusing adoption",
                    entry.version
                )
                .into());
            }
        }
        let actual: serde_json::Value = sqlx::query_scalar(include_str!("schema-signature.sql"))
            .fetch_one(&mut *tx)
            .await?;
        // Each snapshot was captured after the corresponding unchanged legacy SQL prefix.
        let schemas: Vec<serde_json::Value> =
            serde_json::from_str(include_str!("../legacy-schema-signatures.json"))?;
        if schemas.get(history.len()) != Some(&actual) {
            return Err("Existing schema differs from its verified Drizzle migration history; refusing adoption. No data was changed.".into());
        }
        sqlx::raw_sql("CREATE TABLE public._sqlx_migrations (version BIGINT PRIMARY KEY, description TEXT NOT NULL, installed_on TIMESTAMPTZ NOT NULL DEFAULT now(), success BOOLEAN NOT NULL, checksum BYTEA NOT NULL, execution_time BIGINT NOT NULL)").execute(&mut *tx).await?;
        for migration in MIGRATOR.iter().take(history.len()) {
            sqlx::query("INSERT INTO public._sqlx_migrations(version,description,success,checksum,execution_time) VALUES($1,$2,true,$3,0)")
                .bind(migration.version).bind(migration.description.as_ref()).bind(migration.checksum.as_ref()).execute(&mut *tx).await?;
        }
    } else if !sqlx_exists {
        let populated: bool = sqlx::query_scalar("SELECT to_regclass('public.user') IS NOT NULL")
            .fetch_one(&mut *tx)
            .await?;
        if populated {
            let actual: serde_json::Value =
                sqlx::query_scalar(include_str!("schema-signature.sql"))
                    .fetch_one(&mut *tx)
                    .await?;
            let known: Vec<serde_json::Value> =
                serde_json::from_str(include_str!("../schema-signatures.json"))?;
            if !known.contains(&actual) {
                return Err("Existing schema has no migration history and differs from the verified schema. No data was changed.".into());
            }
            sqlx::raw_sql("CREATE TABLE public._sqlx_migrations (version BIGINT PRIMARY KEY, description TEXT NOT NULL, installed_on TIMESTAMPTZ NOT NULL DEFAULT now(), success BOOLEAN NOT NULL, checksum BYTEA NOT NULL, execution_time BIGINT NOT NULL)").execute(&mut *tx).await?;
            for migration in MIGRATOR.iter() {
                sqlx::query("INSERT INTO public._sqlx_migrations(version,description,success,checksum,execution_time) VALUES($1,$2,true,$3,0)")
                    .bind(migration.version).bind(migration.description.as_ref()).bind(migration.checksum.as_ref()).execute(&mut *tx).await?;
            }
        }
    }
    tx.commit().await?;
    MIGRATOR.run(pool).await?;
    Ok(())
}

const SEED_TABLES: &[&str] = &[
    "effects",
    "items",
    "items_allowed_rows",
    "items_effects",
    "units",
    "units_items",
    "scenarios",
    "scenarios_rows",
    "scenarios_rows_units",
];

async fn seed_game_rows(tx: &mut sqlx::Transaction<'_, sqlx::Postgres>) -> DbResult<()> {
    let data: serde_json::Value = serde_json::from_str(include_str!("../seed-data.json"))?;
    for table in SEED_TABLES {
        for row in data[*table]
            .as_array()
            .ok_or("Invalid embedded seed array")?
        {
            let fields: Vec<&str> = row
                .as_object()
                .ok_or("Invalid embedded seed row")?
                .keys()
                .map(String::as_str)
                .collect();
            if fields
                .iter()
                .any(|field| !field.bytes().all(|c| c.is_ascii_lowercase() || c == b'_'))
            {
                return Err("Invalid embedded seed column identifier".into());
            }
            let columns = fields
                .iter()
                .map(|name| format!("\"{name}\""))
                .collect::<Vec<_>>()
                .join(",");
            // Identifiers come exclusively from the embedded seed artifact and table allowlist;
            // all row values are bound as JSON, never interpolated into SQL.
            let query = format!(
                "INSERT INTO {table} ({columns}) SELECT {columns} FROM json_populate_record(NULL::{table}, $1::json) ON CONFLICT DO NOTHING"
            );
            sqlx::query(sqlx::AssertSqlSafe(query))
                .bind(row)
                .execute(&mut **tx)
                .await?;
        }
    }
    Ok(())
}

/// Explicit development/test seed operation. Never called by application startup.
pub async fn seed(pool: &PgPool) -> DbResult<()> {
    let mut tx = pool.begin().await?;
    for (id, name, email, role) in [
        ("seed-gm-001", "Test GM", "gm@example.com", "gm"),
        (
            "seed-player-001",
            "Test Player",
            "player@example.com",
            "player",
        ),
    ] {
        sqlx::query("INSERT INTO \"user\" (id,name,email,email_verified,role) VALUES($1,$2,$3,false,$4::role) ON CONFLICT DO NOTHING")
            .bind(id).bind(name).bind(email).bind(role).execute(&mut *tx).await?;
        sqlx::query("INSERT INTO account (id,user_id,account_id,provider_id,password) VALUES($1,$2,$2,'credential',$3) ON CONFLICT DO NOTHING")
            .bind(format!("account-{id}")).bind(id).bind(include_str!("../seed-password.txt").trim()).execute(&mut *tx).await?;
    }
    seed_game_rows(&mut tx).await?;
    tx.commit().await?;
    Ok(())
}

/// Explicit E2E fixture reset, preserving accounts/sessions; never run on startup.
pub async fn reset_game_data(pool: &PgPool) -> DbResult<()> {
    let mut tx = pool.begin().await?;
    sqlx::raw_sql("TRUNCATE scenarios_rows_units, scenarios_rows, scenarios, units_items, units, items_allowed_rows, items_effects, items, effects RESTART IDENTITY CASCADE").execute(&mut *tx).await?;
    seed_game_rows(&mut tx).await?;
    tx.commit().await?;
    Ok(())
}
