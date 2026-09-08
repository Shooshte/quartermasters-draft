pub mod auth;
pub mod battle;
mod crud;
pub mod error;
pub mod transaction;
pub mod validation;

use std::{path::PathBuf, sync::Arc};

use axum::{
    Json, Router,
    body::Body,
    extract::{Request, State},
    http::{HeaderValue, Method, StatusCode, Uri, header},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde_json::json;
use sqlx::PgPool;

use error::ApiError;

#[derive(Debug, Clone)]
pub struct Config {
    pub auth_secret: String,
    pub auth_url: String,
    pub web_dist_dir: PathBuf,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        let auth_secret = std::env::var("AUTH_SECRET")
            .or_else(|_| std::env::var("BETTER_AUTH_SECRET"))
            .map_err(|_| "AUTH_SECRET or BETTER_AUTH_SECRET is required".to_owned())?;
        let auth_url = std::env::var("AUTH_URL")
            .or_else(|_| std::env::var("BETTER_AUTH_URL"))
            .map_err(|_| "AUTH_URL or BETTER_AUTH_URL is required".to_owned())?;
        let web_dist_dir = std::env::var("WEB_DIST_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| PathBuf::from("apps/web/dist"));
        Ok(Self {
            auth_secret,
            auth_url,
            web_dist_dir,
        })
    }
}

#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: Arc<Config>,
    pub blocking_slots: Arc<tokio::sync::Semaphore>,
}

async fn health() -> Json<serde_json::Value> {
    Json(json!({"status": "ok"}))
}

async fn ready(State(state): State<AppState>) -> Result<Json<serde_json::Value>, ApiError> {
    sqlx::query_scalar::<_, i32>("SELECT 1")
        .fetch_one(&state.pool)
        .await
        .map_err(|error| {
            eprintln!("readiness database check failed: {error}");
            ApiError::service_unavailable("Database is unavailable")
        })?;
    Ok(Json(json!({"status": "ready"})))
}

async fn enforce_origin(State(state): State<AppState>, request: Request, next: Next) -> Response {
    if matches!(
        *request.method(),
        Method::POST | Method::PUT | Method::PATCH | Method::DELETE
    ) && let Some(origin) = request
        .headers()
        .get(header::ORIGIN)
        .and_then(|v| v.to_str().ok())
    {
        let expected = state.config.auth_url.trim_end_matches('/');
        if origin.trim_end_matches('/') != expected {
            return ApiError::forbidden("Cross-origin request rejected").into_response();
        }
    }
    next.run(request).await
}

async fn api_not_found() -> ApiError {
    ApiError::not_found("API route not found")
}

async fn spa_fallback(State(state): State<AppState>, uri: Uri) -> Response {
    let path = uri.path();
    if path.starts_with("/api/")
        || path
            .rsplit('/')
            .next()
            .is_some_and(|part| part.contains('.'))
    {
        return StatusCode::NOT_FOUND.into_response();
    }
    serve_file(&state.config.web_dist_dir.join("index.html"), false).await
}

async fn static_file(State(state): State<AppState>, uri: Uri) -> Response {
    let relative = uri.path().trim_start_matches('/');
    if relative.contains("..") {
        return StatusCode::NOT_FOUND.into_response();
    }
    serve_file(&state.config.web_dist_dir.join(relative), true).await
}

async fn serve_file(path: &std::path::Path, immutable: bool) -> Response {
    match tokio::fs::read(path).await {
        Ok(bytes) => {
            let content_type = match path.extension().and_then(|ext| ext.to_str()).unwrap_or("") {
                "html" => "text/html; charset=utf-8",
                "js" => "text/javascript; charset=utf-8",
                "css" => "text/css; charset=utf-8",
                "svg" => "image/svg+xml",
                "png" => "image/png",
                "jpg" | "jpeg" => "image/jpeg",
                "woff2" => "font/woff2",
                _ => "application/octet-stream",
            };
            let mut response = Body::from(bytes).into_response();
            response
                .headers_mut()
                .insert(header::CONTENT_TYPE, HeaderValue::from_static(content_type));
            response.headers_mut().insert(
                header::CACHE_CONTROL,
                HeaderValue::from_static(if immutable {
                    "public, max-age=31536000, immutable"
                } else {
                    "no-cache"
                }),
            );
            response
        }
        Err(_) => StatusCode::NOT_FOUND.into_response(),
    }
}

pub fn app(pool: PgPool, config: Config) -> Router {
    let blocking_limit = std::thread::available_parallelism()
        .map_or(2, |count| count.get())
        .max(1);
    let state = AppState {
        pool,
        config: Arc::new(config),
        blocking_slots: Arc::new(tokio::sync::Semaphore::new(blocking_limit)),
    };
    let protected = Router::new()
        .merge(crud::router())
        .merge(battle::router())
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            auth::require_gm,
        ));
    let api = Router::new()
        .route("/health", get(health))
        .route("/ready", get(ready))
        .route("/auth/login", post(auth::login))
        .route("/auth/logout", post(auth::logout))
        .route("/auth/session", get(auth::session))
        .merge(protected)
        .fallback(api_not_found)
        .route_layer(middleware::from_fn_with_state(
            state.clone(),
            enforce_origin,
        ));
    Router::new()
        .nest("/api/v1", api)
        .route("/assets/{*path}", get(static_file))
        .fallback(spa_fallback)
        .with_state(state)
}
