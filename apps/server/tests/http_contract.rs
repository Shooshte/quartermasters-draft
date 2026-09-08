use std::path::PathBuf;

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use qd_server::{Config, app};
use sqlx::postgres::PgPoolOptions;
use tower::ServiceExt;

fn config() -> Config {
    Config {
        auth_secret: "test-auth-secret-long-enough".into(),
        auth_url: "http://localhost:3000".into(),
        web_dist_dir: PathBuf::from("/definitely/missing/web-dist"),
    }
}

fn lazy_pool() -> sqlx::PgPool {
    PgPoolOptions::new()
        .connect_lazy("postgres://unused:unused@127.0.0.1:1/unused")
        .unwrap()
}

#[tokio::test]
async fn health_is_public_json() {
    let response = app(lazy_pool(), config())
        .oneshot(
            Request::builder()
                .uri("/api/v1/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&body).unwrap(),
        serde_json::json!({"status":"ok"})
    );
}

#[tokio::test]
async fn readiness_checks_the_database() {
    let unavailable_pool = PgPoolOptions::new()
        .acquire_timeout(std::time::Duration::from_millis(100))
        .connect_lazy("postgres://unused:unused@127.0.0.1:1/unused")
        .unwrap();
    let response = app(unavailable_pool, config())
        .oneshot(
            Request::builder()
                .uri("/api/v1/ready")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&body).unwrap(),
        serde_json::json!({"error":{"code":"SERVICE_UNAVAILABLE","message":"Database is unavailable"}}),
    );
}

#[tokio::test]
async fn missing_api_route_is_json_404_without_spa_fallback() {
    let response = app(lazy_pool(), config())
        .oneshot(
            Request::builder()
                .uri("/api/v1/missing")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&body).unwrap()["error"]["code"],
        "NOT_FOUND"
    );
}

#[tokio::test]
async fn cross_origin_auth_mutation_is_rejected_before_database_access() {
    let response = app(lazy_pool(), config())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/auth/login")
                .header("origin", "https://attacker.example")
                .header("content-type", "application/json")
                .body(Body::from(
                    r#"{"email":"gm@example.com","password":"password123","rememberMe":false}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

#[tokio::test]
async fn anonymous_session_reports_absent_cookie() {
    let response = app(lazy_pool(), config())
        .oneshot(
            Request::builder()
                .uri("/api/v1/auth/session")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&body).unwrap(),
        serde_json::json!({"authenticated":false,"hadSession":false})
    );
}

#[tokio::test]
async fn serves_spa_deep_links_but_never_missing_assets_as_html() {
    let directory = std::env::temp_dir().join(format!("qd-server-static-{}", uuid::Uuid::new_v4()));
    tokio::fs::create_dir_all(directory.join("assets"))
        .await
        .unwrap();
    tokio::fs::write(directory.join("index.html"), "<main>Quartermasters</main>")
        .await
        .unwrap();
    tokio::fs::write(directory.join("assets/app-abc.js"), "export {};")
        .await
        .unwrap();
    let mut test_config = config();
    test_config.web_dist_dir = directory.clone();
    let router = app(lazy_pool(), test_config);

    let deep_link = router
        .clone()
        .oneshot(
            Request::builder()
                .uri("/replay/abc")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(deep_link.status(), StatusCode::OK);
    assert_eq!(deep_link.headers()["cache-control"], "no-cache");

    let asset = router
        .clone()
        .oneshot(
            Request::builder()
                .uri("/assets/app-abc.js")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(asset.status(), StatusCode::OK);
    assert_eq!(
        asset.headers()["cache-control"],
        "public, max-age=31536000, immutable"
    );

    let missing = router
        .oneshot(
            Request::builder()
                .uri("/assets/missing.js")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(missing.status(), StatusCode::NOT_FOUND);
    tokio::fs::remove_dir_all(directory).await.unwrap();
}
