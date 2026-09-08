use qd_server::{Config, app};
use sqlx::postgres::PgPoolOptions;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let config = Config::from_env().map_err(std::io::Error::other)?;
    let database_url = std::env::var("DATABASE_URL")?;
    let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".into());
    let port = std::env::var("PORT").unwrap_or_else(|_| "3000".into());
    let pool = PgPoolOptions::new().connect(&database_url).await?;
    qd_db::migrate(&pool).await?;
    let listener = tokio::net::TcpListener::bind(format!("{host}:{port}")).await?;
    axum::serve(listener, app(pool, config)).await?;
    Ok(())
}
