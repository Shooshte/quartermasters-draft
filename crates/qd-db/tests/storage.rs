use qd_db::{migrate, seed};
use sqlx::PgPool;

#[sqlx::test(migrations = false)]
async fn clean_install_is_idempotent_and_seeds_keep_identifiers(pool: PgPool) {
    migrate(&pool).await.unwrap();
    migrate(&pool).await.unwrap();
    seed(&pool).await.unwrap();
    seed(&pool).await.unwrap();
    let role: String = sqlx::query_scalar("SELECT role::text FROM \"user\" WHERE id='seed-gm-001'")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(role, "gm");
    let users: i64 = sqlx::query_scalar("SELECT count(*) FROM \"user\"")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(users, 2);
    let remembered: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='session' AND column_name='remember_me')").fetch_one(&pool).await.unwrap();
    assert!(remembered);
}

#[sqlx::test(migrations = false)]
async fn adoption_preserves_existing_accounts_and_game_data(pool: PgPool) {
    install_legacy_for_test(&pool).await.unwrap();
    seed(&pool).await.unwrap();
    sqlx::query("UPDATE \"user\" SET name='Existing Account' WHERE id='seed-gm-001'")
        .execute(&pool)
        .await
        .unwrap();
    let before: i64 = sqlx::query_scalar("SELECT count(*) FROM effects")
        .fetch_one(&pool)
        .await
        .unwrap();
    migrate(&pool).await.unwrap();
    let name: String = sqlx::query_scalar("SELECT name FROM \"user\" WHERE id='seed-gm-001'")
        .fetch_one(&pool)
        .await
        .unwrap();
    let after: i64 = sqlx::query_scalar("SELECT count(*) FROM effects")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(name, "Existing Account");
    assert_eq!(before, after);
    assert!(after > 0);
}

#[sqlx::test(migrations = false)]
async fn unknown_legacy_history_is_rejected_without_claiming_adoption(pool: PgPool) {
    install_legacy_for_test(&pool).await.unwrap();
    sqlx::query("UPDATE drizzle.__drizzle_migrations SET hash='modified' WHERE id=1")
        .execute(&pool)
        .await
        .unwrap();
    assert!(migrate(&pool).await.is_err());
    let name: Option<String> =
        sqlx::query_scalar("SELECT to_regclass('public._sqlx_migrations')::text")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(name.is_none());
}

async fn install_legacy_for_test(
    pool: &PgPool,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    install_legacy_prefix(pool, 21).await
}

async fn install_legacy_prefix(
    pool: &PgPool,
    count: usize,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    use sha2::{Digest, Sha256};
    sqlx::raw_sql("CREATE SCHEMA drizzle; CREATE TABLE drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint)").execute(pool).await?;
    let entries: Vec<serde_json::Value> =
        serde_json::from_str(include_str!("../legacy-manifest.json"))?;
    for (migration, entry) in sqlx::migrate!("./migrations")
        .iter()
        .zip(entries)
        .take(count)
    {
        sqlx::raw_sql(migration.sql.clone()).execute(pool).await?;
        let hash = format!("{:x}", Sha256::digest(migration.sql.as_str().as_bytes()));
        sqlx::query("INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES ($1,$2)")
            .bind(hash)
            .bind(entry["createdAt"].as_i64().unwrap())
            .execute(pool)
            .await?;
    }
    Ok(())
}

#[sqlx::test(migrations = false)]
async fn history_free_schema_is_adopted_only_when_it_matches_known_schema(pool: PgPool) {
    install_legacy_for_test(&pool).await.unwrap();
    seed(&pool).await.unwrap();
    sqlx::raw_sql("DROP SCHEMA drizzle CASCADE")
        .execute(&pool)
        .await
        .unwrap();
    migrate(&pool).await.unwrap();
    let users: i64 = sqlx::query_scalar("SELECT count(*) FROM \"user\"")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(users, 2);
}

#[sqlx::test(migrations = false)]
async fn drifted_history_free_schema_is_rejected(pool: PgPool) {
    install_legacy_for_test(&pool).await.unwrap();
    sqlx::raw_sql(
        "DROP SCHEMA drizzle CASCADE; ALTER TABLE effects DROP CONSTRAINT effects_name_unique",
    )
    .execute(&pool)
    .await
    .unwrap();
    assert!(migrate(&pool).await.is_err());
    let adopted: bool =
        sqlx::query_scalar("SELECT to_regclass('public._sqlx_migrations') IS NOT NULL")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(!adopted);
}

#[sqlx::test(migrations = false)]
async fn matching_history_with_schema_drift_is_rejected(pool: PgPool) {
    install_legacy_for_test(&pool).await.unwrap();
    sqlx::query("ALTER TABLE effects DROP CONSTRAINT effects_name_unique")
        .execute(&pool)
        .await
        .unwrap();
    assert!(migrate(&pool).await.is_err());
    let adopted: bool =
        sqlx::query_scalar("SELECT to_regclass('public._sqlx_migrations') IS NOT NULL")
            .fetch_one(&pool)
            .await
            .unwrap();
    assert!(!adopted);
}

#[sqlx::test(migrations = false)]
async fn verified_older_history_is_adopted_and_remaining_migrations_run(pool: PgPool) {
    install_legacy_prefix(&pool, 20).await.unwrap();
    migrate(&pool).await.unwrap();
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM _sqlx_migrations")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 21);
    let has_policy: bool = sqlx::query_scalar("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='session' AND column_name='remember_me')").fetch_one(&pool).await.unwrap();
    assert!(has_policy);
}

#[sqlx::test(migrations = false)]
async fn seed_preserves_reference_update_dates_for_library_sorting(pool: PgPool) {
    migrate(&pool).await.unwrap();
    seed(&pool).await.unwrap();
    for (table, name, expected) in [
        ("items", "Iron Sword", "2025-01-01"),
        ("units", "Barbarian", "2025-01-01"),
        ("scenarios", "Ambush at Dawn", "2025-04-01"),
    ] {
        let query = format!("SELECT to_char(updated_at, 'YYYY-MM-DD') FROM {table} WHERE name=$1");
        let date: String = sqlx::query_scalar(sqlx::AssertSqlSafe(query))
            .bind(name)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(date, expected, "{table} seed update date");
    }
}
