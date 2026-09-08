use std::path::PathBuf;

use axum::{
    body::Body,
    http::{Request, StatusCode, header},
};
use http_body_util::BodyExt;
use qd_api_types::{BattleLogEntry, ReplayOutput};
use qd_server::{Config, app, auth::sign_cookie_value};
use sqlx::PgPool;
use tower::ServiceExt;
use uuid::Uuid;

const AUTH_SECRET: &str = "rust-battle-integration-test-secret";

fn config() -> Config {
    Config {
        auth_secret: AUTH_SECRET.into(),
        auth_url: "http://localhost:3000".into(),
        web_dist_dir: PathBuf::from("/missing"),
    }
}

#[sqlx::test(migrations = false)]
async fn seeded_scenarios_resolve_and_persist_a_typed_replay(pool: PgPool) {
    qd_db::migrate(&pool).await.unwrap();
    qd_db::seed(&pool).await.unwrap();
    let previous_mana_regen: f32 = sqlx::query_scalar(
        "SELECT mana_regen FROM units WHERE id='f0000000-0000-0000-0000-000000000001'",
    )
    .fetch_one(&pool)
    .await
    .unwrap();
    sqlx::query("UPDATE units SET mana_regen=0.1 WHERE id='f0000000-0000-0000-0000-000000000001'")
        .execute(&pool)
        .await
        .unwrap();

    let nonce = Uuid::new_v4().simple().to_string();
    let token = format!("battle{nonce}");
    let session_id = format!("battle-session-{nonce}");
    sqlx::query(
        "INSERT INTO session (id,user_id,token,remember_me,expires_at,created_at,updated_at) \
         VALUES ($1,'seed-gm-001',$2,false,now()+INTERVAL '1 hour',now(),now())",
    )
    .bind(&session_id)
    .bind(&token)
    .execute(&pool)
    .await
    .unwrap();
    let cookie = format!(
        "better-auth.session_token={}",
        sign_cookie_value(&token, AUTH_SECRET)
    );
    let router = app(pool.clone(), config());

    let options = router
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/v1/battle/scenario-options")
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(options.status(), StatusCode::OK);
    let options_body = options.into_body().collect().await.unwrap().to_bytes();
    let options: serde_json::Value = serde_json::from_slice(&options_body).unwrap();
    assert_eq!(options[0]["name"], "Ambush at Dawn");

    let create = router
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/replays")
                .header(header::COOKIE, &cookie)
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    r#"{"scenarioAId":"a2000000-0000-0000-0000-000000000001","scenarioBId":"a2000000-0000-0000-0000-000000000002","seed":" integration-seed "}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(create.status(), StatusCode::OK);
    let create_body = create.into_body().collect().await.unwrap().to_bytes();
    let created: ReplayOutput = serde_json::from_slice(&create_body).unwrap();
    assert_eq!(created.replay.input.seed, "integration-seed");
    assert_eq!(created.scenarios.len(), 2);
    assert_eq!(
        created.result.final_state.scenarios[0].rows.melee[0]
            .base_stats
            .mana_regen,
        0.1,
    );

    let get = router
        .oneshot(
            Request::builder()
                .uri(format!("/api/v1/replays/{}", created.replay.id))
                .header(header::COOKIE, &cookie)
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(get.status(), StatusCode::OK);
    let get_body = get.into_body().collect().await.unwrap().to_bytes();
    let loaded: ReplayOutput = serde_json::from_slice(&get_body).unwrap();
    assert_eq!(loaded.replay.id, created.replay.id);
    assert_eq!(
        loaded.result.actions_resolved,
        created.result.actions_resolved
    );
    assert_eq!(loaded.result.winner_id, created.result.winner_id);

    sqlx::query("DELETE FROM battle_replays WHERE id=$1")
        .bind(Uuid::parse_str(&created.replay.id).unwrap())
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("DELETE FROM session WHERE id=$1")
        .bind(session_id)
        .execute(&pool)
        .await
        .unwrap();
    sqlx::query("UPDATE units SET mana_regen=$1 WHERE id='f0000000-0000-0000-0000-000000000001'")
        .bind(previous_mana_regen)
        .execute(&pool)
        .await
        .unwrap();
}

#[sqlx::test(migrations = false)]
async fn postgres_real_values_preserve_legacy_action_grouping(pool: PgPool) {
    qd_db::migrate(&pool).await.unwrap();
    qd_db::seed(&pool).await.unwrap();
    sqlx::raw_sql(
        "UPDATE units SET name='Fast',health=30,mana=2097152.25,melee_dmg=10,ranged_dmg=0,\
         mana_regen=0,spell_dmg=0,speed=3.3,dodge=0,critical_chance=0,target_scope='enemies',\
         target_priority='highest_health',target_count=1,selection_shape='individual' \
         WHERE id='f0000000-0000-0000-0000-000000000004'; \
         UPDATE units SET name='Slow',health=30,mana=0,melee_dmg=10,ranged_dmg=0,\
         mana_regen=0,spell_dmg=0,speed=1.1,dodge=0,critical_chance=0,target_scope='enemies',\
         target_priority='highest_health',target_count=1,selection_shape='individual' \
         WHERE id='f0000000-0000-0000-0000-000000000005'",
    )
    .execute(&pool)
    .await
    .unwrap();
    sqlx::raw_sql(
        "INSERT INTO scenarios(id,name) VALUES \
          ('b2000000-0000-0000-0000-000000000001','Float Fast'),\
          ('b2000000-0000-0000-0000-000000000002','Float Slow'); \
         INSERT INTO scenarios_rows(id,scenario_id,row_type) VALUES \
          ('b3000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000001','tank'),\
          ('b3000000-0000-0000-0000-000000000002','b2000000-0000-0000-0000-000000000002','tank'); \
         INSERT INTO scenarios_rows_units(id,row_id,unit_id,slot) VALUES \
          ('b4000000-0000-0000-0000-000000000001','b3000000-0000-0000-0000-000000000001','f0000000-0000-0000-0000-000000000004',1),\
          ('b4000000-0000-0000-0000-000000000002','b3000000-0000-0000-0000-000000000002','f0000000-0000-0000-0000-000000000005',1)",
    )
    .execute(&pool)
    .await
    .unwrap();

    let token = "battle-float-token";
    sqlx::query(
        "INSERT INTO session(id,user_id,token,remember_me,expires_at,created_at,updated_at) \
         VALUES ('battle-float-session','seed-gm-001',$1,false,now()+INTERVAL '1 hour',now(),now())",
    )
    .bind(token)
    .execute(&pool)
    .await
    .unwrap();
    let cookie = format!(
        "better-auth.session_token={}",
        sign_cookie_value(token, AUTH_SECRET)
    );
    let response = app(pool, config())
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/v1/replays")
                .header(header::COOKIE, cookie)
                .header(header::CONTENT_TYPE, "application/json")
                .body(Body::from(
                    r#"{"scenarioAId":"b2000000-0000-0000-0000-000000000001","scenarioBId":"b2000000-0000-0000-0000-000000000002","seed":"float-action-groups"}"#,
                ))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let replay: ReplayOutput = serde_json::from_slice(&body).unwrap();
    assert_eq!(
        replay.result.final_state.scenarios[0].rows.tank[0]
            .base_stats
            .speed,
        3.3,
    );
    assert_eq!(
        replay.result.final_state.scenarios[0].rows.tank[0]
            .base_stats
            .mana,
        2_097_152.2,
    );
    assert_eq!(
        replay.result.final_state.scenarios[1].rows.tank[0]
            .base_stats
            .speed,
        1.1,
    );
    let attacks: Vec<(u32, String)> = replay
        .result
        .log
        .into_iter()
        .filter_map(|entry| match entry {
            BattleLogEntry::Attack(attack) => Some((attack.base.batch_number, attack.attacker)),
            _ => None,
        })
        .collect();
    assert_eq!(
        attacks,
        vec![
            (1, "Fast".into()),
            (2, "Fast".into()),
            (3, "Fast".into()),
            (3, "Slow".into()),
        ],
    );
}
