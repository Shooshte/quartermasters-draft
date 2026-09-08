//! Transaction acquisition for cancellation-prone HTTP handlers.
use std::future::Future;

use sqlx::{PgPool, Postgres, Transaction};

type BeginResult = Result<Transaction<'static, Postgres>, sqlx::Error>;

pub async fn begin(pool: &PgPool) -> BeginResult {
    let pool = pool.clone();
    complete_begin(async move { pool.begin().await }).await
}

async fn complete_begin(future: impl Future<Output = BeginResult> + Send + 'static) -> BeginResult {
    // SQLx 0.9 sends BEGIN before incrementing its transaction depth. Dropping
    // that future while awaiting PostgreSQL can return a connection whose open
    // transaction is invisible to SQLx's rollback-on-drop guard. Complete only
    // acquisition in an owned task: dropping this JoinHandle does not abort it,
    // and its resulting Transaction is dropped/rolled back if the caller left.
    tokio::spawn(future).await.map_err(|error| {
        sqlx::Error::Protocol(format!("Transaction acquisition task failed: {error}"))
    })?
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::postgres::PgPoolOptions;
    use std::time::Duration;

    #[sqlx::test(migrations = false)]
    async fn cancelled_begin_never_returns_an_open_transaction_to_the_pool(pool: PgPool) {
        let actor_pool = PgPoolOptions::new()
            .max_connections(1)
            .connect_with((*pool.connect_options()).clone())
            .await
            .unwrap();
        let actor_pid: i32 = sqlx::query_scalar("SELECT pg_backend_pid()")
            .fetch_one(&actor_pool)
            .await
            .unwrap();
        let mut blocker = pool.acquire().await.unwrap();
        sqlx::query("SELECT pg_advisory_lock(91827123)")
            .execute(&mut *blocker)
            .await
            .unwrap();

        let owned_pool = actor_pool.clone();
        let request = tokio::spawn(async move {
            // Delay the BEGIN response after PostgreSQL has entered a transaction,
            // making the cancellation window deterministic instead of timing a race.
            complete_begin(async move {
                owned_pool
                    .begin_with("BEGIN; SELECT pg_advisory_xact_lock(91827123)")
                    .await
            })
            .await
        });
        tokio::time::timeout(Duration::from_secs(5), async {
            loop {
                let waiting: bool = sqlx::query_scalar(
                    "SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE pid=$1 AND wait_event='advisory')",
                )
                .bind(actor_pid)
                .fetch_one(&pool)
                .await
                .unwrap();
                if waiting {
                    break;
                }
                tokio::task::yield_now().await;
            }
        })
        .await
        .expect("BEGIN must reach the PostgreSQL advisory lock");
        request.abort();
        assert!(request.await.unwrap_err().is_cancelled());
        sqlx::query("SELECT pg_advisory_unlock(91827123)")
            .execute(&mut *blocker)
            .await
            .unwrap();

        let mut returned = tokio::time::timeout(Duration::from_secs(5), actor_pool.acquire())
            .await
            .expect("Cancelled BEGIN must release its connection")
            .unwrap();
        // A reused connection must execute subsequent auth/CRUD SQL outside the
        // cancelled transaction, or session UPDATE row locks can live forever.
        sqlx::query("SELECT 1")
            .execute(&mut *returned)
            .await
            .unwrap();
        let state: String = sqlx::query_scalar("SELECT state FROM pg_stat_activity WHERE pid=$1")
            .bind(actor_pid)
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(state, "idle", "Cancelled BEGIN leaked a transaction");
        drop(returned);
        actor_pool.close().await;
    }
}
