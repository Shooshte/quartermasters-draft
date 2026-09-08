use std::collections::HashMap;

use axum::{
    Json, Router,
    extract::{Path, State, rejection::JsonRejection},
    routing::{get, post},
};
use chrono::{DateTime, Utc};
use qd_api_types::ReplayInput;
use serde_json::{Map, Value, json};
use sqlx::{PgPool, Row};
use uuid::Uuid;

use crate::{AppState, auth::bounded_blocking, error::ApiError};

pub fn router() -> Router<AppState> {
    Router::new()
        .route("/battle/scenario-options", get(scenario_options))
        .route("/replays", post(create_replay))
        .route("/replays/{id}", get(get_replay))
}

pub fn normalize_replay_input(mut input: ReplayInput) -> Result<ReplayInput, ApiError> {
    input.scenario_a_id = Uuid::parse_str(&input.scenario_a_id)
        .map_err(|_| ApiError::bad_request("Scenario A ID must be a valid UUID."))?
        .to_string();
    input.scenario_b_id = Uuid::parse_str(&input.scenario_b_id)
        .map_err(|_| ApiError::bad_request("Scenario B ID must be a valid UUID."))?
        .to_string();
    input.seed = input.seed.trim().into();
    if input.seed.is_empty() {
        return Err(ApiError::bad_request("Battle seed must not be blank."));
    }
    if input.scenario_a_id == input.scenario_b_id {
        return Err(ApiError::bad_request("Choose two different scenarios."));
    }
    Ok(input)
}

async fn scenario_options(State(state): State<AppState>) -> Result<Json<Value>, ApiError> {
    let rows = sqlx::query("SELECT id::text AS id, name FROM scenarios ORDER BY name, id")
        .fetch_all(&state.pool)
        .await?;
    Ok(Json(Value::Array(
        rows.into_iter()
            .map(|row| json!({"id": row.get::<String, _>("id"), "name": row.get::<String, _>("name")}))
            .collect(),
    )))
}

async fn create_replay(
    State(state): State<AppState>,
    payload: Result<Json<ReplayInput>, JsonRejection>,
) -> Result<Json<Value>, ApiError> {
    let Json(input) = payload.map_err(|error| ApiError::bad_request(error.body_text()))?;
    let input = normalize_replay_input(input)?;
    let output = resolve_definition(&state, &input).await?;
    let scenario_a = Uuid::parse_str(&input.scenario_a_id).expect("validated UUID");
    let scenario_b = Uuid::parse_str(&input.scenario_b_id).expect("validated UUID");
    let row = sqlx::query(
        "INSERT INTO battle_replays (scenario_a_id, scenario_b_id, seed) \
         VALUES ($1, $2, $3) \
         RETURNING id::text AS id, scenario_a_id::text AS scenario_a_id, \
                   scenario_b_id::text AS scenario_b_id, seed, created_at",
    )
    .bind(scenario_a)
    .bind(scenario_b)
    .bind(&input.seed)
    .fetch_one(&state.pool)
    .await
    .map_err(|error| {
        eprintln!("failed to save replay: {error}");
        ApiError::internal("Replay was not saved.")
    })?;
    Ok(Json(replay_output(replay_json(&row)?, output)))
}

async fn get_replay(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, ApiError> {
    let id = Uuid::parse_str(&id)
        .map_err(|_| ApiError::bad_request("Replay ID must be a valid UUID."))?;
    let row = sqlx::query(
        "SELECT id::text AS id, scenario_a_id::text AS scenario_a_id, \
                scenario_b_id::text AS scenario_b_id, seed, created_at \
         FROM battle_replays WHERE id = $1 LIMIT 1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| ApiError::not_found("Replay not found"))?;
    let input = ReplayInput {
        scenario_a_id: row.try_get("scenario_a_id")?,
        scenario_b_id: row.try_get("scenario_b_id")?,
        seed: row.try_get("seed")?,
    };
    let output = resolve_definition(&state, &input).await?;
    Ok(Json(replay_output(replay_json(&row)?, output)))
}

fn replay_json(row: &sqlx::postgres::PgRow) -> Result<Value, ApiError> {
    let created_at: DateTime<Utc> = row.try_get("created_at")?;
    Ok(json!({
        "id": row.try_get::<String, _>("id")?,
        "scenarioAId": row.try_get::<String, _>("scenario_a_id")?,
        "scenarioBId": row.try_get::<String, _>("scenario_b_id")?,
        "seed": row.try_get::<String, _>("seed")?,
        "createdAt": created_at.to_rfc3339_opts(chrono::SecondsFormat::Millis, true),
    }))
}

fn replay_output(replay: Value, (scenarios, result): (Vec<Value>, Value)) -> Value {
    json!({"replay": replay, "scenarios": scenarios, "result": result})
}

async fn resolve_definition(
    state: &AppState,
    input: &ReplayInput,
) -> Result<(Vec<Value>, Value), ApiError> {
    let scenario_a = load_scenario(&state.pool, &input.scenario_a_id).await?;
    let scenario_b = load_scenario(&state.pool, &input.scenario_b_id).await?;
    let scenarios = vec![
        json!({"id": scenario_a["id"], "name": scenario_a["name"]}),
        json!({"id": scenario_b["id"], "name": scenario_b["name"]}),
    ];
    let engine_input = json!({"scenarios": [scenario_a, scenario_b], "seed": input.seed});
    let result = bounded_blocking(state, move || {
        qd_engine::resolve_json(engine_input, json!({}))
            .map_err(|error| ApiError::bad_request(error.to_string()))
    })
    .await?;
    Ok((scenarios, result))
}

async fn load_scenario(pool: &PgPool, id: &str) -> Result<Value, ApiError> {
    let id = Uuid::parse_str(id)
        .map_err(|_| ApiError::bad_request("Scenario ID must be a valid UUID."))?;
    let scenario = sqlx::query("SELECT id::text AS id, name FROM scenarios WHERE id = $1 LIMIT 1")
        .bind(id)
        .fetch_optional(pool)
        .await?
        .ok_or_else(|| ApiError::not_found("Scenario not found"))?;
    let assignments = sqlx::query(
        "SELECT sr.row_type::text AS row_type, sru.slot, u.id::text AS unit_id, u.name, \
                u.health::text AS health, u.mana::text AS mana, u.melee_dmg::text AS melee_dmg, \
                u.ranged_dmg::text AS ranged_dmg, u.mana_regen::text AS mana_regen, \
                u.spell_dmg::text AS spell_dmg, u.speed::text AS speed, u.dodge::text AS dodge, \
                u.critical_chance::text AS critical_chance, u.target_scope::text AS target_scope, \
                u.target_priority::text AS target_priority, u.target_count, \
                u.selection_shape::text AS selection_shape \
         FROM scenarios_rows sr \
         JOIN scenarios_rows_units sru ON sru.row_id = sr.id \
         JOIN units u ON u.id = sru.unit_id \
         WHERE sr.scenario_id = $1 ORDER BY sru.slot",
    )
    .bind(id)
    .fetch_all(pool)
    .await?;
    let unit_ids: Vec<Uuid> = assignments
        .iter()
        .filter_map(|row| row.try_get::<String, _>("unit_id").ok())
        .filter_map(|id| Uuid::parse_str(&id).ok())
        .collect();
    let item_rows = if unit_ids.is_empty() {
        Vec::new()
    } else {
        sqlx::query(
            "SELECT ui.unit_id::text AS unit_id, ui.priority, i.id::text AS item_id, i.name, \
                    i.melee_dmg::text AS melee_dmg, i.ranged_dmg::text AS ranged_dmg, \
                    i.mana::text AS mana, i.mana_regen::text AS mana_regen, \
                    i.spell_dmg::text AS spell_dmg, i.dodge::text AS dodge, \
                    i.critical_chance::text AS critical_chance, \
                    i.activation_mana_cost::text AS activation_mana_cost, \
                    i.activation_health_cost::text AS activation_health_cost \
             FROM units_items ui JOIN items i ON i.id = ui.item_id \
             WHERE ui.unit_id = ANY($1) ORDER BY ui.priority",
        )
        .bind(&unit_ids)
        .fetch_all(pool)
        .await?
    };
    let item_ids: Vec<Uuid> = item_rows
        .iter()
        .filter_map(|row| row.try_get::<String, _>("item_id").ok())
        .filter_map(|id| Uuid::parse_str(&id).ok())
        .collect();
    let allowed_rows = if item_ids.is_empty() {
        Vec::new()
    } else {
        sqlx::query(
            "SELECT item_id::text AS item_id, row_type::text AS row_type \
             FROM items_allowed_rows WHERE item_id = ANY($1) \
             ORDER BY CASE row_type::text WHEN 'tank' THEN 0 WHEN 'melee' THEN 1 WHEN 'ranged' THEN 2 ELSE 3 END",
        )
        .bind(&item_ids)
        .fetch_all(pool)
        .await?
    };
    let effect_rows = if item_ids.is_empty() {
        Vec::new()
    } else {
        sqlx::query(
            "SELECT ie.item_id::text AS item_id, ie.sequence_order, e.id::text AS effect_id, e.name, \
                    e.timing_type::text AS timing_type, e.effect_type::text AS effect_type, e.is_taunt, \
                    e.trigger_every_actions, e.trigger_count, e.lasts_for_actions, \
                    e.melee_dmg::text AS melee_dmg, e.health::text AS health, e.mana::text AS mana, \
                    e.ranged_dmg::text AS ranged_dmg, e.mana_regen::text AS mana_regen, \
                    e.spell_dmg::text AS spell_dmg, e.speed::text AS speed, e.dodge::text AS dodge, \
                    e.critical_chance::text AS critical_chance, e.shield::text AS shield, \
                    e.bypasses_shield, e.direct_healing::text AS direct_healing, \
                    e.direct_melee_dmg::text AS direct_melee_dmg, \
                    e.direct_ranged_dmg::text AS direct_ranged_dmg, \
                    e.direct_spell_dmg::text AS direct_spell_dmg \
             FROM items_effects ie JOIN effects e ON e.id = ie.effect_template_id \
             WHERE ie.item_id = ANY($1) ORDER BY ie.sequence_order",
        )
        .bind(&item_ids)
        .fetch_all(pool)
        .await?
    };

    let mut allowed_by_item: HashMap<String, Vec<String>> = HashMap::new();
    for row in allowed_rows {
        allowed_by_item
            .entry(row.try_get("item_id")?)
            .or_default()
            .push(row.try_get("row_type")?);
    }
    let mut effects_by_item: HashMap<String, Vec<Value>> = HashMap::new();
    for row in effect_rows {
        let item_id: String = row.try_get("item_id")?;
        let effect = json!({
            "id": row.try_get::<String, _>("effect_id")?,
            "name": row.try_get::<String, _>("name")?,
            "timingType": row.try_get::<String, _>("timing_type")?,
            "effectType": row.try_get::<String, _>("effect_type")?,
            "isTaunt": row.try_get::<bool, _>("is_taunt")?,
            "triggerEveryActions": row.try_get::<Option<i32>, _>("trigger_every_actions")?,
            "triggerCount": row.try_get::<Option<i32>, _>("trigger_count")?,
            "lastsForActions": row.try_get::<Option<i32>, _>("lasts_for_actions")?,
            "meleeDmg": optional_real(&row, "melee_dmg")?, "health": optional_real(&row, "health")?,
            "mana": optional_real(&row, "mana")?, "rangedDmg": optional_real(&row, "ranged_dmg")?,
            "manaRegen": optional_real(&row, "mana_regen")?, "spellDmg": optional_real(&row, "spell_dmg")?,
            "speed": optional_real(&row, "speed")?, "dodge": optional_real(&row, "dodge")?,
            "criticalChance": optional_real(&row, "critical_chance")?, "shield": optional_real(&row, "shield")?,
            "bypassesShield": row.try_get::<bool, _>("bypasses_shield")?,
            "directHealing": optional_real(&row, "direct_healing")?,
            "directMeleeDmg": optional_real(&row, "direct_melee_dmg")?,
            "directRangedDmg": optional_real(&row, "direct_ranged_dmg")?,
            "directSpellDmg": optional_real(&row, "direct_spell_dmg")?,
        });
        effects_by_item.entry(item_id).or_default().push(json!({
            "sequenceOrder": row.try_get::<i32, _>("sequence_order")?, "effect": effect
        }));
    }
    let mut items_by_unit: HashMap<String, Vec<Value>> = HashMap::new();
    for row in item_rows {
        let unit_id: String = row.try_get("unit_id")?;
        let item_id: String = row.try_get("item_id")?;
        let item = json!({
            "id": item_id,
            "name": row.try_get::<String, _>("name")?,
            "meleeDmg": real(&row, "melee_dmg")?, "rangedDmg": real(&row, "ranged_dmg")?,
            "mana": real(&row, "mana")?, "manaRegen": real(&row, "mana_regen")?,
            "spellDmg": real(&row, "spell_dmg")?, "dodge": real(&row, "dodge")?,
            "criticalChance": real(&row, "critical_chance")?,
            "activationManaCost": real(&row, "activation_mana_cost")?,
            "activationHealthCost": real(&row, "activation_health_cost")?,
            "allowedRowTypes": allowed_by_item.get(&item_id).cloned().unwrap_or_default(),
            "effects": effects_by_item.get(&item_id).cloned().unwrap_or_default(),
        });
        items_by_unit.entry(unit_id).or_default().push(item);
    }
    let mut rows = Map::new();
    for name in ["tank", "melee", "ranged", "support"] {
        rows.insert(name.into(), Value::Array(Vec::new()));
    }
    for row in assignments {
        let unit_id: String = row.try_get("unit_id")?;
        let row_type: String = row.try_get("row_type")?;
        let unit = json!({
            "id": unit_id,
            "name": row.try_get::<String, _>("name")?,
            "stats": {
                "health": real(&row, "health")?, "mana": real(&row, "mana")?,
                "meleeDmg": real(&row, "melee_dmg")?, "rangedDmg": real(&row, "ranged_dmg")?,
                "manaRegen": real(&row, "mana_regen")?, "spellDmg": real(&row, "spell_dmg")?,
                "speed": real(&row, "speed")?, "dodge": real(&row, "dodge")?,
                "criticalChance": real(&row, "critical_chance")?,
            },
            "targetScope": row.try_get::<String, _>("target_scope")?,
            "targetPriority": row.try_get::<String, _>("target_priority")?,
            "targetCount": row.try_get::<i32, _>("target_count")?,
            "selectionShape": row.try_get::<String, _>("selection_shape")?,
            "items": items_by_unit.get(&unit_id).cloned().unwrap_or_default(),
        });
        rows.get_mut(&row_type)
            .and_then(Value::as_array_mut)
            .ok_or_else(|| ApiError::internal("Scenario contains an unknown row type"))?
            .push(unit);
    }
    Ok(json!({
        "id": scenario.try_get::<String, _>("id")?,
        "name": scenario.try_get::<String, _>("name")?,
        "rows": Value::Object(rows),
    }))
}

fn real(row: &sqlx::postgres::PgRow, column: &str) -> Result<f64, ApiError> {
    parse_pg_real(row.try_get(column)?)
}

fn optional_real(row: &sqlx::postgres::PgRow, column: &str) -> Result<Option<f64>, ApiError> {
    row.try_get::<Option<String>, _>(column)?
        .map(parse_pg_real)
        .transpose()
}

// The legacy Node driver parses PostgreSQL's REAL text representation. Reading
// `::text` above preserves PostgreSQL's own rounding, including decimal ties that
// differ from Rust's f32 formatter.
fn parse_pg_real(value: String) -> Result<f64, ApiError> {
    value
        .parse()
        .map_err(|_| ApiError::internal("Database contains an invalid numeric value"))
}
