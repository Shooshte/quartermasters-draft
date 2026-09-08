use qd_db::{DbResult, migrate, reset_game_data, seed};

#[tokio::main]
async fn main() -> DbResult<()> {
    let command = std::env::args()
        .nth(1)
        .ok_or("Usage: qd-db <migrate|seed|reset-game-data>")?;
    if !matches!(command.as_str(), "migrate" | "seed" | "reset-game-data") {
        return Err("Usage: qd-db <migrate|seed|reset-game-data>".into());
    }
    let url = std::env::var("DATABASE_URL").map_err(|_| "DATABASE_URL is required")?;
    let pool = sqlx::postgres::PgPoolOptions::new()
        .max_connections(2)
        .connect(&url)
        .await?;
    match command.as_str() {
        "migrate" => migrate(&pool).await?,
        "seed" => seed(&pool).await?,
        "reset-game-data" => reset_game_data(&pool).await?,
        _ => unreachable!(),
    }
    println!("{command} completed");
    pool.close().await;
    Ok(())
}
