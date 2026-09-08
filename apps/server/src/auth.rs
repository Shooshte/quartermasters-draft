use std::time::Duration;

use axum::{
    Json,
    extract::{Request, State, rejection::JsonRejection},
    http::{HeaderMap, HeaderValue, StatusCode, header::SET_COOKIE},
    middleware::Next,
    response::{IntoResponse, Response},
};
use base64::{Engine, engine::general_purpose::STANDARD};
use chrono::{Duration as ChronoDuration, NaiveDateTime, Utc};
use hmac::{Hmac, Mac};
use percent_encoding::{AsciiSet, NON_ALPHANUMERIC, percent_decode_str, utf8_percent_encode};
use qd_api_types::{LoginInput, SessionResponse, Success, UserRole};
use rand::{Rng, distr::Alphanumeric};
use scrypt::{Params, scrypt};
use sha2::Sha256;
use sqlx::Row;
use subtle::ConstantTimeEq;
use unicode_normalization::UnicodeNormalization;

use crate::{AppState, error::ApiError};

pub const SHORT_SESSION_SECONDS: i64 = 60 * 60;
pub const REMEMBERED_SESSION_SECONDS: i64 = 30 * 24 * 60 * 60;
const URI_COMPONENT: &AsciiSet = &NON_ALPHANUMERIC
    .remove(b'!')
    .remove(b'\'')
    .remove(b'(')
    .remove(b')')
    .remove(b'*')
    .remove(b'-')
    .remove(b'.')
    .remove(b'_')
    .remove(b'~');

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CookieNames {
    pub session_token: String,
    pub dont_remember: String,
    pub session_data: String,
    pub secure: bool,
}

pub fn cookie_names(auth_url: &str) -> CookieNames {
    let secure = auth_url.to_ascii_lowercase().starts_with("https://");
    let prefix = if secure { "__Secure-" } else { "" };
    CookieNames {
        session_token: format!("{prefix}better-auth.session_token"),
        dont_remember: format!("{prefix}better-auth.dont_remember"),
        session_data: format!("{prefix}better-auth.session_data"),
        secure,
    }
}

pub fn verify_password(hash: &str, password: &str) -> Result<bool, &'static str> {
    let mut parts = hash.split(':');
    let salt = parts.next().ok_or("Invalid password hash")?;
    let expected_hex = parts.next().ok_or("Invalid password hash")?;
    if parts.next().is_some() || salt.len() != 32 || expected_hex.len() != 128 {
        return Err("Invalid password hash");
    }
    let _ = hex::decode(salt).map_err(|_| "Invalid password hash")?;
    let expected = hex::decode(expected_hex).map_err(|_| "Invalid password hash")?;
    let normalized: String = password.nfkc().collect();
    let params = Params::new(14, 16, 1, 64).map_err(|_| "Invalid scrypt parameters")?;
    let mut actual = [0_u8; 64];
    scrypt(normalized.as_bytes(), salt.as_bytes(), &params, &mut actual)
        .map_err(|_| "Password derivation failed")?;
    Ok(actual.ct_eq(expected.as_slice()).into())
}

pub fn sign_cookie_value(value: &str, secret: &str) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).expect("HMAC accepts any key");
    mac.update(value.as_bytes());
    let signature = STANDARD.encode(mac.finalize().into_bytes());
    utf8_percent_encode(&format!("{value}.{signature}"), URI_COMPONENT).to_string()
}

pub fn verify_cookie_value(encoded: &str, secret: &str) -> Option<String> {
    let decoded = percent_decode_str(encoded).decode_utf8().ok()?;
    let (value, signature) = decoded.rsplit_once('.')?;
    if signature.len() != 44 || !signature.ends_with('=') {
        return None;
    }
    let signature = STANDARD.decode(signature).ok()?;
    let mut mac = Hmac::<Sha256>::new_from_slice(secret.as_bytes()).ok()?;
    mac.update(value.as_bytes());
    mac.verify_slice(&signature).ok()?;
    Some(value.into())
}

fn cookie_header(name: &str, value: &str, secure: bool, max_age: Option<i64>) -> String {
    let mut cookie = format!("{name}={value}; Path=/; HttpOnly");
    if let Some(seconds) = max_age {
        cookie.push_str(&format!("; Max-Age={seconds}"));
    }
    if secure {
        cookie.push_str("; Secure");
    }
    cookie.push_str("; SameSite=Lax");
    cookie
}

pub fn clear_auth_cookies(auth_url: &str) -> Vec<String> {
    let names = cookie_names(auth_url);
    [names.session_token, names.dont_remember, names.session_data]
        .into_iter()
        .map(|name| cookie_header(&name, "", names.secure, Some(0)))
        .collect()
}

fn session_cookies(token: &str, remember_me: bool, state: &AppState) -> Vec<String> {
    let names = cookie_names(&state.config.auth_url);
    let signed_token = sign_cookie_value(token, &state.config.auth_secret);
    let mut result = vec![cookie_header(
        &names.session_token,
        &signed_token,
        names.secure,
        remember_me.then_some(REMEMBERED_SESSION_SECONDS),
    )];
    if remember_me {
        result.push(cookie_header(
            &names.dont_remember,
            "",
            names.secure,
            Some(0),
        ));
    } else {
        result.push(cookie_header(
            &names.dont_remember,
            &sign_cookie_value("true", &state.config.auth_secret),
            names.secure,
            None,
        ));
    }
    result
}

fn cookie_value(headers: &HeaderMap, name: &str) -> Option<String> {
    headers
        .get_all(axum::http::header::COOKIE)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(';'))
        .filter_map(|pair| pair.trim().split_once('='))
        .find_map(|(key, value)| (key == name).then(|| value.to_owned()))
}

fn supplied_auth_cookie(headers: &HeaderMap) -> bool {
    headers
        .get_all(axum::http::header::COOKIE)
        .iter()
        .filter_map(|value| value.to_str().ok())
        .flat_map(|value| value.split(';'))
        .filter_map(|pair| pair.trim().split_once('='))
        .any(|(key, _)| key.starts_with("better-auth.") || key.starts_with("__Secure-better-auth."))
}

fn read_signed_session_token(headers: &HeaderMap, state: &AppState) -> Option<String> {
    let configured = cookie_names(&state.config.auth_url);
    let alternate = if configured.secure {
        "better-auth.session_token"
    } else {
        "__Secure-better-auth.session_token"
    };
    [configured.session_token.as_str(), alternate]
        .into_iter()
        .find_map(|name| cookie_value(headers, name))
        .and_then(|value| verify_cookie_value(&value, &state.config.auth_secret))
}

#[derive(Debug, Clone)]
pub struct CurrentUser {
    pub id: String,
    pub role: UserRole,
}

struct SessionRead {
    user: Option<CurrentUser>,
    had_session: bool,
    cookies: Vec<String>,
}

async fn read_session(headers: &HeaderMap, state: &AppState) -> Result<SessionRead, ApiError> {
    read_session_at(headers, state, Utc::now().naive_utc()).await
}

async fn read_session_at(
    headers: &HeaderMap,
    state: &AppState,
    now: NaiveDateTime,
) -> Result<SessionRead, ApiError> {
    let had_session = supplied_auth_cookie(headers);
    let Some(token) = read_signed_session_token(headers, state) else {
        return Ok(SessionRead {
            user: None,
            had_session,
            cookies: Vec::new(),
        });
    };
    let row = sqlx::query(
        "UPDATE session AS s SET updated_at=$2, \
             expires_at=$2 + CASE WHEN s.remember_me THEN INTERVAL '30 days' ELSE INTERVAL '1 hour' END \
         FROM \"user\" AS u \
         WHERE s.token=$1 AND s.user_id=u.id AND s.expires_at>$2 \
         RETURNING s.remember_me, u.id AS user_id, u.role::text AS role",
    )
    .bind(&token)
    .bind(now)
    .fetch_optional(&state.pool)
    .await?;
    let Some(row) = row else {
        sqlx::query("DELETE FROM session WHERE token=$1 AND expires_at<=$2")
            .bind(&token)
            .bind(now)
            .execute(&state.pool)
            .await?;
        return Ok(SessionRead {
            user: None,
            had_session: true,
            cookies: clear_auth_cookies(&state.config.auth_url),
        });
    };
    let remember_me: bool = row.try_get("remember_me")?;
    let role = match row.try_get::<String, _>("role")?.as_str() {
        "gm" => UserRole::GameMaster,
        "player" => UserRole::Player,
        _ => return Err(ApiError::forbidden("Unknown user role")),
    };
    Ok(SessionRead {
        user: Some(CurrentUser {
            id: row.try_get("user_id")?,
            role,
        }),
        had_session: true,
        cookies: session_cookies(&token, remember_me, state),
    })
}

fn add_cookies(response: &mut Response, cookies: Vec<String>) {
    for cookie in cookies {
        if let Ok(value) = HeaderValue::from_str(&cookie) {
            response.headers_mut().append(SET_COOKIE, value);
        }
    }
}

pub async fn require_gm(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Response {
    let session = match read_session(request.headers(), &state).await {
        Ok(session) => session,
        Err(error) => return error.into_response(),
    };
    let Some(user) = session.user else {
        return ApiError::unauthorized()
            .with_cookies(session.cookies)
            .into_response();
    };
    if !matches!(user.role, UserRole::GameMaster) {
        return ApiError::forbidden("Game Master role required")
            .with_cookies(session.cookies)
            .into_response();
    }
    request.extensions_mut().insert(user);
    let mut response = next.run(request).await;
    add_cookies(&mut response, session.cookies);
    response
}

pub async fn session(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Response, ApiError> {
    let session = read_session(&headers, &state).await?;
    let payload = match session.user {
        Some(user) => SessionResponse::Authenticated {
            authenticated: true,
            user_id: user.id,
            user_role: user.role,
        },
        None => SessionResponse::Anonymous {
            authenticated: false,
            had_session: session.had_session,
        },
    };
    let mut response = Json(payload).into_response();
    response.headers_mut().insert(
        axum::http::header::CACHE_CONTROL,
        HeaderValue::from_static("no-store"),
    );
    add_cookies(&mut response, session.cookies);
    Ok(response)
}

pub async fn login(
    State(state): State<AppState>,
    payload: Result<Json<LoginInput>, JsonRejection>,
) -> Result<Response, ApiError> {
    let Json(input) = payload.map_err(|error| ApiError::bad_request(error.body_text()))?;
    let row = sqlx::query(
        "SELECT u.id, u.role::text AS role, a.password FROM \"user\" u \
         JOIN account a ON a.user_id = u.id AND a.provider_id = 'credential' \
         WHERE u.email = lower($1) LIMIT 1",
    )
    .bind(input.email.trim())
    .fetch_optional(&state.pool)
    .await?;
    let Some(row) = row else {
        return Err(ApiError::new(
            StatusCode::UNAUTHORIZED,
            "INVALID_CREDENTIALS",
            "Invalid credentials",
        ));
    };
    let password_hash: Option<String> = row.try_get("password")?;
    let Some(password_hash) = password_hash else {
        return Err(ApiError::new(
            StatusCode::UNAUTHORIZED,
            "INVALID_CREDENTIALS",
            "Invalid credentials",
        ));
    };
    let password = input.password;
    let valid = bounded_blocking(&state, move || {
        verify_password(&password_hash, &password)
            .map_err(|_| ApiError::internal("Stored password hash is invalid"))
    })
    .await?;
    if !valid {
        return Err(ApiError::new(
            StatusCode::UNAUTHORIZED,
            "INVALID_CREDENTIALS",
            "Invalid credentials",
        ));
    }
    let user_id: String = row.try_get("id")?;
    let role = match row.try_get::<String, _>("role")?.as_str() {
        "gm" => UserRole::GameMaster,
        "player" => UserRole::Player,
        _ => return Err(ApiError::forbidden("Unknown user role")),
    };
    let remember_me = input.remember_me;
    let ttl = if remember_me {
        REMEMBERED_SESSION_SECONDS
    } else {
        SHORT_SESSION_SECONDS
    };
    let token: String = rand::rng()
        .sample_iter(Alphanumeric)
        .take(32)
        .map(char::from)
        .collect();
    let id: String = rand::rng()
        .sample_iter(Alphanumeric)
        .take(32)
        .map(char::from)
        .collect();
    let now = Utc::now().naive_utc();
    sqlx::query(
        "INSERT INTO session (id, user_id, token, remember_me, expires_at, created_at, updated_at) \
         VALUES ($1, $2, $3, $4, $5, $6, $6)",
    )
    .bind(id)
    .bind(&user_id)
    .bind(&token)
    .bind(remember_me)
    .bind(now + ChronoDuration::seconds(ttl))
    .bind(now)
    .execute(&state.pool)
    .await?;
    let mut response = Json(SessionResponse::Authenticated {
        authenticated: true,
        user_id,
        user_role: role,
    })
    .into_response();
    add_cookies(&mut response, session_cookies(&token, remember_me, &state));
    Ok(response)
}

pub async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Response, ApiError> {
    if let Some(token) = read_signed_session_token(&headers, &state) {
        sqlx::query("DELETE FROM session WHERE token = $1")
            .bind(token)
            .execute(&state.pool)
            .await?;
    }
    let mut response = Json(Success { success: true }).into_response();
    add_cookies(&mut response, clear_auth_cookies(&state.config.auth_url));
    Ok(response)
}

pub async fn bounded_blocking<F, T>(state: &AppState, work: F) -> Result<T, ApiError>
where
    F: FnOnce() -> Result<T, ApiError> + Send + 'static,
    T: Send + 'static,
{
    let permit = state
        .blocking_slots
        .clone()
        .acquire_owned()
        .await
        .map_err(|_| ApiError::internal("Blocking worker pool is unavailable"))?;
    tokio::time::timeout(
        Duration::from_secs(30),
        tokio::task::spawn_blocking(move || {
            let _permit = permit;
            work()
        }),
    )
    .await
    .map_err(|_| ApiError::internal("Battle resolution timed out"))?
    .map_err(|_| ApiError::internal("Battle resolution task failed"))?
}

#[cfg(test)]
mod tests {
    use std::{path::PathBuf, sync::Arc};

    use axum::http::{HeaderMap, HeaderValue, header};
    use chrono::NaiveDate;
    use sqlx::PgPool;

    use super::*;
    use crate::Config;

    #[sqlx::test(migrations = false)]
    async fn exact_session_deadlines_are_rejected_for_both_policies(pool: PgPool) {
        qd_db::migrate(&pool).await.unwrap();
        qd_db::seed(&pool).await.unwrap();
        let state = AppState {
            pool: pool.clone(),
            config: Arc::new(Config {
                auth_secret: "deadline-policy-test-secret".into(),
                auth_url: "http://localhost:3000".into(),
                web_dist_dir: PathBuf::from("/missing"),
            }),
            blocking_slots: Arc::new(tokio::sync::Semaphore::new(1)),
        };
        let deadline = NaiveDate::from_ymd_opt(2030, 1, 2)
            .unwrap()
            .and_hms_opt(3, 4, 5)
            .unwrap();

        for remember_me in [false, true] {
            for (suffix, checked_at, should_authenticate) in [
                ("before", deadline - ChronoDuration::microseconds(1), true),
                ("exact", deadline, false),
            ] {
                let token = format!("deadline-{remember_me}-{suffix}");
                sqlx::query(
                    "INSERT INTO session(id,user_id,token,remember_me,expires_at,created_at,updated_at) \
                     VALUES($1,'seed-gm-001',$1,$2,$3,$3,$3)",
                )
                .bind(&token)
                .bind(remember_me)
                .bind(deadline)
                .execute(&pool)
                .await
                .unwrap();
                let mut headers = HeaderMap::new();
                headers.insert(
                    header::COOKIE,
                    HeaderValue::from_str(&format!(
                        "better-auth.session_token={}",
                        sign_cookie_value(&token, &state.config.auth_secret)
                    ))
                    .unwrap(),
                );
                let session = read_session_at(&headers, &state, checked_at).await.unwrap();
                assert_eq!(session.user.is_some(), should_authenticate);
                if should_authenticate {
                    let renewed: NaiveDateTime =
                        sqlx::query_scalar("SELECT expires_at FROM session WHERE token=$1")
                            .bind(&token)
                            .fetch_one(&pool)
                            .await
                            .unwrap();
                    let ttl = if remember_me {
                        REMEMBERED_SESSION_SECONDS
                    } else {
                        SHORT_SESSION_SECONDS
                    };
                    assert_eq!(renewed, checked_at + ChronoDuration::seconds(ttl));
                } else {
                    assert!(
                        session
                            .cookies
                            .iter()
                            .all(|cookie| cookie.contains("Max-Age=0"))
                    );
                }
            }
        }
    }
}
