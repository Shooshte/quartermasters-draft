use std::path::PathBuf;

use axum::{
    body::Body,
    http::{Request, StatusCode, header},
};
use chrono::NaiveDateTime;
use http_body_util::BodyExt;
use qd_server::{Config, app};
use sqlx::{PgPool, Row};
use tower::ServiceExt;

const AUTH_SECRET: &str = "rust-auth-integration-test-secret";

fn config() -> Config {
    Config {
        auth_secret: AUTH_SECRET.into(),
        auth_url: "http://localhost:3000".into(),
        web_dist_dir: PathBuf::from("/missing"),
    }
}

async fn request(
    router: axum::Router,
    method: &str,
    path: &str,
    body: Option<&str>,
    cookie: Option<&str>,
) -> axum::response::Response {
    let mut builder = Request::builder().method(method).uri(path);
    if body.is_some() {
        builder = builder.header(header::CONTENT_TYPE, "application/json");
    }
    if let Some(cookie) = cookie {
        builder = builder.header(header::COOKIE, cookie);
    }
    router
        .oneshot(
            builder
                .body(body.map_or_else(Body::empty, |value| Body::from(value.to_owned())))
                .unwrap(),
        )
        .await
        .unwrap()
}

fn response_cookie(response: &axum::response::Response, suffix: &str) -> Option<String> {
    response
        .headers()
        .get_all(header::SET_COOKIE)
        .iter()
        .filter_map(|v| v.to_str().ok())
        .find(|v| v.starts_with(&format!("better-auth.{suffix}=")))
        .map(str::to_owned)
}

fn cookie_pair(set_cookie: &str) -> &str {
    set_cookie.split(';').next().unwrap()
}

async fn latest_session(
    pool: &PgPool,
    user_id: &str,
) -> (String, bool, NaiveDateTime, NaiveDateTime) {
    let row = sqlx::query("SELECT token, remember_me, expires_at, updated_at FROM session WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1")
        .bind(user_id).fetch_one(pool).await.unwrap();
    (
        row.get("token"),
        row.get("remember_me"),
        row.get("expires_at"),
        row.get("updated_at"),
    )
}

#[sqlx::test(migrations = false)]
async fn legacy_login_sliding_expiry_roles_and_logout_replay_are_compatible(pool: PgPool) {
    qd_db::migrate(&pool).await.unwrap();
    qd_db::seed(&pool).await.unwrap();
    sqlx::query("DELETE FROM session WHERE user_id IN ('seed-gm-001','seed-player-001')")
        .execute(&pool)
        .await
        .unwrap();
    let router = app(pool.clone(), config());

    let ready = request(router.clone(), "GET", "/api/v1/ready", None, None).await;
    assert_eq!(ready.status(), StatusCode::OK);
    let ready_body = ready.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&ready_body).unwrap(),
        serde_json::json!({"status":"ready"})
    );

    let wrong_password = request(
        router.clone(),
        "POST",
        "/api/v1/auth/login",
        Some(r#"{"email":"gm@example.com","password":"wrong-password"}"#),
        None,
    )
    .await;
    assert_eq!(wrong_password.status(), StatusCode::UNAUTHORIZED);
    assert!(response_cookie(&wrong_password, "session_token").is_none());

    let login = request(
        router.clone(),
        "POST",
        "/api/v1/auth/login",
        Some(r#"{"email":"GM@EXAMPLE.COM","password":"password123","rememberMe":false}"#),
        None,
    )
    .await;
    assert_eq!(login.status(), StatusCode::OK);
    let session_cookie = response_cookie(&login, "session_token").unwrap();
    assert!(!session_cookie.contains("Max-Age"));
    assert!(response_cookie(&login, "dont_remember").is_some());
    let login_body = login.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&login_body).unwrap(),
        serde_json::json!({"authenticated":true,"userId":"seed-gm-001","userRole":"game_master"})
    );
    let (_, remember, expires, updated) = latest_session(&pool, "seed-gm-001").await;
    assert!(!remember);
    assert!(((expires - updated).num_seconds() - 3600).abs() <= 1);

    let cookie = cookie_pair(&session_cookie).to_owned();
    sqlx::query("UPDATE session SET updated_at=updated_at-INTERVAL '59 minutes', expires_at=expires_at-INTERVAL '59 minutes' WHERE user_id='seed-gm-001'").execute(&pool).await.unwrap();
    let active = request(
        router.clone(),
        "GET",
        "/api/v1/auth/session",
        None,
        Some(&cookie),
    )
    .await;
    assert_eq!(active.status(), StatusCode::OK);
    assert_eq!(active.headers()[header::CACHE_CONTROL], "no-store");
    assert!(
        !response_cookie(&active, "session_token")
            .unwrap()
            .contains("Max-Age")
    );
    let (_, _, expires, updated) = latest_session(&pool, "seed-gm-001").await;
    assert!(((expires - updated).num_seconds() - 3600).abs() <= 1);

    sqlx::query("UPDATE session SET updated_at=updated_at-INTERVAL '59 minutes', expires_at=expires_at-INTERVAL '59 minutes' WHERE user_id='seed-gm-001'").execute(&pool).await.unwrap();
    let active_again = request(
        router.clone(),
        "GET",
        "/api/v1/auth/session",
        None,
        Some(&cookie),
    )
    .await;
    assert_eq!(active_again.status(), StatusCode::OK);
    let (_, _, expires, updated) = latest_session(&pool, "seed-gm-001").await;
    assert!(((expires - updated).num_seconds() - 3600).abs() <= 1);

    sqlx::query("UPDATE session SET expires_at=now() WHERE user_id='seed-gm-001'")
        .execute(&pool)
        .await
        .unwrap();
    let expired = request(
        router.clone(),
        "GET",
        "/api/v1/auth/session",
        None,
        Some(&cookie),
    )
    .await;
    assert_eq!(expired.status(), StatusCode::OK);
    assert!(
        response_cookie(&expired, "session_token")
            .unwrap()
            .contains("Max-Age=0")
    );
    let expired_body = expired.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&expired_body).unwrap(),
        serde_json::json!({"authenticated":false,"hadSession":true})
    );

    let relogin = request(
        router.clone(),
        "POST",
        "/api/v1/auth/login",
        Some(r#"{"email":"gm@example.com","password":"password123"}"#),
        None,
    )
    .await;
    assert_eq!(relogin.status(), StatusCode::OK);
    let session_cookie = response_cookie(&relogin, "session_token").unwrap();
    assert!(!session_cookie.contains("Max-Age"));
    let cookie = cookie_pair(&session_cookie).to_owned();

    let player_login = request(
        router.clone(),
        "POST",
        "/api/v1/auth/login",
        Some(r#"{"email":"player@example.com","password":"password123","rememberMe":true}"#),
        None,
    )
    .await;
    assert_eq!(player_login.status(), StatusCode::OK);
    let player_cookie = response_cookie(&player_login, "session_token").unwrap();
    assert!(player_cookie.contains("Max-Age=2592000"));
    let player_cookie_pair = cookie_pair(&player_cookie);
    sqlx::query("UPDATE session SET updated_at=updated_at-INTERVAL '61 minutes', expires_at=expires_at-INTERVAL '61 minutes' WHERE user_id='seed-player-001'").execute(&pool).await.unwrap();
    let remembered = request(
        router.clone(),
        "GET",
        "/api/v1/auth/session",
        None,
        Some(&format!(
            "{player_cookie_pair}; better-auth.dont_remember=stale"
        )),
    )
    .await;
    assert_eq!(remembered.status(), StatusCode::OK);
    assert!(
        response_cookie(&remembered, "session_token")
            .unwrap()
            .contains("Max-Age=2592000")
    );
    assert!(
        response_cookie(&remembered, "dont_remember")
            .unwrap()
            .contains("Max-Age=0")
    );
    let (_, remember, expires, updated) = latest_session(&pool, "seed-player-001").await;
    assert!(remember);
    assert!(((expires - updated).num_seconds() - 2_592_000).abs() <= 1);
    let forbidden = request(
        router.clone(),
        "GET",
        "/api/v1/battle/scenario-options",
        None,
        Some(cookie_pair(&player_cookie)),
    )
    .await;
    assert_eq!(forbidden.status(), StatusCode::FORBIDDEN);

    let (_, _, _, before_tamper) = latest_session(&pool, "seed-gm-001").await;
    let tampered = format!("{}x", cookie);
    let invalid = request(
        router.clone(),
        "GET",
        "/api/v1/auth/session",
        None,
        Some(&tampered),
    )
    .await;
    assert_eq!(invalid.status(), StatusCode::OK);
    assert!(response_cookie(&invalid, "session_token").is_none());
    let invalid_body = invalid.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(
        serde_json::from_slice::<serde_json::Value>(&invalid_body).unwrap(),
        serde_json::json!({"authenticated":false,"hadSession":true})
    );
    let (_, _, _, after_tamper) = latest_session(&pool, "seed-gm-001").await;
    assert_eq!(after_tamper, before_tamper);

    let logout = request(
        router.clone(),
        "POST",
        "/api/v1/auth/logout",
        None,
        Some(&cookie),
    )
    .await;
    assert_eq!(logout.status(), StatusCode::OK);
    assert!(
        response_cookie(&logout, "session_token")
            .unwrap()
            .contains("Max-Age=0")
    );
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM session WHERE user_id='seed-gm-001'")
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(count, 0);
    let replay = request(
        router.clone(),
        "GET",
        "/api/v1/auth/session",
        None,
        Some(&cookie),
    )
    .await;
    assert_eq!(replay.status(), StatusCode::OK);
    assert!(
        response_cookie(&replay, "session_token")
            .unwrap()
            .contains("Max-Age=0")
    );

    let race_login = request(
        router.clone(),
        "POST",
        "/api/v1/auth/login",
        Some(r#"{"email":"gm@example.com","password":"password123"}"#),
        None,
    )
    .await;
    assert_eq!(race_login.status(), StatusCode::OK);
    let race_cookie =
        cookie_pair(&response_cookie(&race_login, "session_token").unwrap()).to_owned();
    let (race_token, _, _, _) = latest_session(&pool, "seed-gm-001").await;
    let mut revoke = pool.begin().await.unwrap();
    let revoke_backend_pid: i32 = sqlx::query_scalar("SELECT pg_backend_pid()")
        .fetch_one(&mut *revoke)
        .await
        .unwrap();
    sqlx::query("SELECT token FROM session WHERE token=$1 FOR UPDATE")
        .bind(&race_token)
        .fetch_one(&mut *revoke)
        .await
        .unwrap();
    let renewal = tokio::spawn(async move {
        request(
            router,
            "GET",
            "/api/v1/auth/session",
            None,
            Some(&race_cookie),
        )
        .await
    });
    tokio::time::timeout(std::time::Duration::from_secs(2), async {
        loop {
            let renewal_is_blocked: bool = sqlx::query_scalar(
                "SELECT EXISTS (SELECT 1 FROM pg_stat_activity \
                 WHERE $1=ANY(pg_blocking_pids(pid)) \
                   AND query LIKE 'UPDATE session AS s SET updated_at%')",
            )
            .bind(revoke_backend_pid)
            .fetch_one(&pool)
            .await
            .unwrap();
            if renewal_is_blocked {
                break;
            }
            tokio::task::yield_now().await;
        }
    })
    .await
    .expect("renewal must reach the row lock before revocation");
    sqlx::query("DELETE FROM session WHERE token=$1")
        .bind(&race_token)
        .execute(&mut *revoke)
        .await
        .unwrap();
    revoke.commit().await.unwrap();
    let renewal = renewal.await.unwrap();
    assert_eq!(renewal.status(), StatusCode::OK);
    assert!(
        response_cookie(&renewal, "session_token")
            .unwrap()
            .contains("Max-Age=0")
    );
    let remaining: i64 = sqlx::query_scalar("SELECT count(*) FROM session WHERE token=$1")
        .bind(race_token)
        .fetch_one(&pool)
        .await
        .unwrap();
    assert_eq!(remaining, 0);

    sqlx::query("UPDATE account SET password='malformed' WHERE user_id='seed-gm-001'")
        .execute(&pool)
        .await
        .unwrap();
    let malformed = request(
        app(pool, config()),
        "POST",
        "/api/v1/auth/login",
        Some(r#"{"email":"gm@example.com","password":"password123"}"#),
        None,
    )
    .await;
    assert_eq!(malformed.status(), StatusCode::INTERNAL_SERVER_ERROR);
}
