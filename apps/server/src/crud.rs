//! Scenario editor REST endpoints. Identifiers interpolated into SQL come exclusively
//! from the closed Entity enum and its audited column lists; all values are bound.
use crate::{AppState, error::ApiError, validation};
use axum::{
    Extension, Json, Router,
    extract::{Path, Query, State, rejection::JsonRejection},
    routing::get,
};
use chrono::{DateTime, SecondsFormat, Utc};
use qd_api_types::*;
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::{Value, json};
use sqlx::{AssertSqlSafe, PgConnection};
use uuid::Uuid;

type Result<T> = std::result::Result<T, ApiError>;
#[derive(Clone, Copy, PartialEq)]
enum Entity {
    Effect,
    Item,
    Unit,
    Scenario,
}
impl Entity {
    fn table(self) -> &'static str {
        match self {
            Self::Effect => "effects",
            Self::Item => "items",
            Self::Unit => "units",
            Self::Scenario => "scenarios",
        }
    }
    fn label(self) -> &'static str {
        match self {
            Self::Effect => "Effect",
            Self::Item => "Item",
            Self::Unit => "Unit",
            Self::Scenario => "Scenario",
        }
    }
    fn columns(self) -> &'static str {
        match self {
            Self::Effect => {
                "name,timing_type,effect_type,is_taunt,bypasses_shield,trigger_every_actions,trigger_count,lasts_for_actions,health,mana,melee_dmg,ranged_dmg,mana_regen,spell_dmg,speed,dodge,critical_chance,shield,direct_healing,direct_melee_dmg,direct_ranged_dmg,direct_spell_dmg"
            }
            Self::Item => {
                "name,mana,melee_dmg,ranged_dmg,mana_regen,spell_dmg,dodge,critical_chance,activation_mana_cost,activation_health_cost"
            }
            Self::Unit => {
                "name,health,mana,melee_dmg,ranged_dmg,mana_regen,spell_dmg,speed,dodge,critical_chance,target_scope,target_priority,target_count,selection_shape"
            }
            Self::Scenario => "name",
        }
    }
    fn missing(self) -> ApiError {
        ApiError::not_found(format!("{} not found", self.label()))
    }
    fn write_error(self, error: sqlx::Error) -> ApiError {
        if error
            .as_database_error()
            .is_some_and(|e| e.code().as_deref() == Some("23505"))
        {
            let article = if matches!(self, Self::Item | Self::Effect) {
                "An"
            } else {
                "A"
            };
            ApiError::conflict(format!(
                "{article} {} with this name already exists.",
                self.label().to_lowercase()
            ))
        } else {
            error.into()
        }
    }
}

pub fn router() -> Router<AppState> {
    let mut router = Router::new();
    for entity in [Entity::Effect, Entity::Item, Entity::Unit, Entity::Scenario] {
        router = router.merge(
            Router::new()
                .route(&format!("/{}", entity.table()), get(list).post(create))
                .route(
                    &format!("/{}/{{id}}", entity.table()),
                    get(read).put(update).delete(delete),
                )
                .layer(Extension(entity)),
        );
    }
    router
}
fn decode<T: DeserializeOwned>(value: Value) -> Result<T> {
    serde_json::from_value(value).map_err(|e| ApiError::bad_request(e.to_string()))
}
fn encode<T: Serialize>(value: T) -> Result<Value> {
    serde_json::to_value(value).map_err(|_| ApiError::internal("Response serialization failed"))
}
fn contract<T: DeserializeOwned + Serialize>(value: Value) -> Result<Value> {
    let parsed: T = serde_json::from_value(value).map_err(|e| {
        eprintln!("CRUD response contract error: {e}");
        ApiError::internal("Stored data does not match the API contract")
    })?;
    encode(parsed)
}
fn id(value: &str) -> Result<Uuid> {
    if value.len() != 36 {
        return Err(ApiError::bad_request("Invalid UUID"));
    }
    Uuid::parse_str(value).map_err(|_| ApiError::bad_request("Invalid UUID"))
}
fn camel(key: &str) -> String {
    let mut upper = false;
    key.chars()
        .filter_map(|c| {
            if c == '_' {
                upper = true;
                None
            } else if upper {
                upper = false;
                Some(c.to_ascii_uppercase())
            } else {
                Some(c)
            }
        })
        .collect()
}
fn snake(key: &str) -> String {
    key.chars()
        .flat_map(|c| {
            if c.is_ascii_uppercase() {
                vec!['_', c.to_ascii_lowercase()]
            } else {
                vec![c]
            }
        })
        .collect()
}
fn wire_row(value: Value) -> Result<Value> {
    let object = value
        .as_object()
        .ok_or_else(|| ApiError::internal("Invalid database row"))?;
    let mut output = serde_json::Map::new();
    for (key, value) in object {
        let value = if key == "created_at" || key == "updated_at" {
            let date = DateTime::parse_from_rfc3339(
                value
                    .as_str()
                    .ok_or_else(|| ApiError::internal("Invalid stored timestamp"))?,
            )
            .map_err(|_| ApiError::internal("Invalid stored timestamp"))?;
            json!(
                date.with_timezone(&Utc)
                    .to_rfc3339_opts(SecondsFormat::Millis, true)
            )
        } else {
            value.clone()
        };
        output.insert(camel(key), value);
    }
    Ok(Value::Object(output))
}
fn normalized(entity: Entity, value: Value) -> Result<Value> {
    let mut value = match entity {
        Entity::Effect => {
            let mut input: EffectInput = decode(value)?;
            validation::validate_effect(&input).map_err(ApiError::bad_request)?;
            validation::normalize_effect(&mut input);
            encode(input)?
        }
        Entity::Item => {
            let mut input: ItemInput = decode(value)?;
            validation::validate_item(&input).map_err(ApiError::bad_request)?;
            input.name = input.name.trim().into();
            encode(input)?
        }
        Entity::Unit => {
            let mut input: UnitInput = decode(value)?;
            validation::validate_unit(&input).map_err(ApiError::bad_request)?;
            input.name = input.name.trim().into();
            encode(input)?
        }
        Entity::Scenario => {
            let mut input: ScenarioInput = decode(value)?;
            for row in &input.rows {
                for raw_id in &row.unit_ids {
                    id(raw_id)?;
                }
            }
            validation::normalize_scenario(&mut input);
            validation::validate_scenario(&input).map_err(ApiError::bad_request)?;
            encode(input)?
        }
    };
    // Zod's GUID validation accepts case-insensitive UUIDs; PostgreSQL reads canonical lowercase.
    for field in ["itemIds", "effectIds"] {
        if let Some(ids) = value.get_mut(field).and_then(Value::as_array_mut) {
            for value in ids {
                *value = json!(
                    id(value
                        .as_str()
                        .ok_or_else(|| ApiError::bad_request("Invalid UUID"))?)?
                    .to_string()
                );
            }
        }
    }
    if let Some(rows) = value.get_mut("rows").and_then(Value::as_array_mut) {
        for row in rows {
            if let Some(ids) = row["unitIds"].as_array_mut() {
                for value in ids {
                    *value = json!(
                        id(value
                            .as_str()
                            .ok_or_else(|| ApiError::bad_request("Invalid UUID"))?)?
                        .to_string()
                    );
                }
            }
        }
    }
    Ok(value)
}
fn timing_status(value: &mut Value) -> Result<()> {
    let mut input = value.clone();
    let object = input
        .as_object_mut()
        .ok_or_else(|| ApiError::internal("Invalid effect row"))?;
    for key in ["id", "createdAt", "updatedAt", "needsTimingConfiguration"] {
        object.remove(key);
    }
    let effect: EffectInput =
        serde_json::from_value(input).map_err(|_| ApiError::internal("Invalid stored effect"))?;
    value["needsTimingConfiguration"] = json!(validation::needs_timing_configuration(&effect));
    Ok(())
}
async fn record(connection: &mut PgConnection, entity: Entity, entity_id: Uuid) -> Result<Value> {
    let sql = format!("SELECT to_jsonb(t) FROM {} t WHERE id=$1", entity.table());
    let row: Option<Value> = sqlx::query_scalar(AssertSqlSafe(sql))
        .bind(entity_id)
        .fetch_optional(&mut *connection)
        .await?;
    let mut value = wire_row(row.ok_or_else(|| entity.missing())?)?;
    match entity {
        Entity::Effect => {
            timing_status(&mut value)?;
            contract::<Effect>(value)
        }
        Entity::Item => {
            let ids:Vec<Uuid>=sqlx::query_scalar("SELECT effect_template_id FROM items_effects WHERE item_id=$1 ORDER BY sequence_order").bind(entity_id).fetch_all(&mut *connection).await?;
            let rows:Vec<String>=sqlx::query_scalar("SELECT row_type::text FROM items_allowed_rows WHERE item_id=$1 ORDER BY CASE row_type WHEN 'tank' THEN 0 WHEN 'melee' THEN 1 WHEN 'ranged' THEN 2 ELSE 3 END").bind(entity_id).fetch_all(&mut *connection).await?;
            value["effectIds"] = json!(ids);
            value["allowedRowTypes"] = json!(rows);
            contract::<Item>(value)
        }
        Entity::Unit => {
            let ids: Vec<Uuid> = sqlx::query_scalar(
                "SELECT item_id FROM units_items WHERE unit_id=$1 ORDER BY priority",
            )
            .bind(entity_id)
            .fetch_all(&mut *connection)
            .await?;
            value["itemIds"] = json!(ids);
            contract::<Unit>(value)
        }
        Entity::Scenario => {
            let rows:Vec<(Uuid,String)>=sqlx::query_as("SELECT id,row_type::text FROM scenarios_rows WHERE scenario_id=$1 ORDER BY CASE row_type WHEN 'ranged' THEN 0 WHEN 'support' THEN 1 WHEN 'melee' THEN 2 ELSE 3 END").bind(entity_id).fetch_all(&mut *connection).await?;
            let mut result = vec![];
            for (row_id, row_type) in rows {
                let assignments:Vec<(Uuid,Uuid,String,i32)>=sqlx::query_as("SELECT a.id,a.unit_id,u.name,a.slot FROM scenarios_rows_units a JOIN units u ON u.id=a.unit_id WHERE a.row_id=$1 ORDER BY a.slot").bind(row_id).fetch_all(&mut *connection).await?;
                result.push(json!({"id":row_id,"rowType":row_type,"assignments":assignments.into_iter().map(|(assignment_id,unit_id,unit_name,position)|json!({"assignmentId":assignment_id,"unitId":unit_id,"unitName":unit_name,"position":position})).collect::<Vec<_>>()}));
            }
            value["rows"] = json!(result);
            contract::<Scenario>(value)
        }
    }
}
async fn read(
    State(state): State<AppState>,
    Extension(entity): Extension<Entity>,
    Path(raw_id): Path<String>,
) -> Result<Json<Value>> {
    let entity_id = id(&raw_id)?;
    let mut connection = state.pool.acquire().await?;
    Ok(Json(record(&mut connection, entity, entity_id).await?))
}
async fn create(
    State(state): State<AppState>,
    Extension(entity): Extension<Entity>,
    body: std::result::Result<Json<Value>, JsonRejection>,
) -> Result<Json<Value>> {
    let Json(value) = body.map_err(|e| ApiError::bad_request(e.body_text()))?;
    save(&state, entity, None, value).await.map(Json)
}
async fn update(
    State(state): State<AppState>,
    Extension(entity): Extension<Entity>,
    Path(raw_id): Path<String>,
    body: std::result::Result<Json<Value>, JsonRejection>,
) -> Result<Json<Value>> {
    let entity_id = id(&raw_id)?;
    let Json(mut value) = body.map_err(|e| ApiError::bad_request(e.body_text()))?;
    if let Some(object) = value.as_object_mut() {
        object.remove("id");
    }
    save(&state, entity, Some(entity_id), value).await.map(Json)
}
async fn save(
    state: &AppState,
    entity: Entity,
    entity_id: Option<Uuid>,
    value: Value,
) -> Result<Value> {
    let value = normalized(entity, value)?;
    let mut tx = crate::transaction::begin(&state.pool).await?;
    let mut scenario_rows = vec![];
    if let Some(entity_id) = entity_id {
        let sql = format!("SELECT id FROM {} WHERE id=$1 FOR UPDATE", entity.table());
        let found: Option<Uuid> = sqlx::query_scalar(AssertSqlSafe(sql))
            .bind(entity_id)
            .fetch_optional(&mut *tx)
            .await?;
        if found.is_none() {
            return Err(entity.missing());
        }
        if entity == Entity::Scenario {
            scenario_rows = sqlx::query_as::<_, (Uuid, String)>(
                "SELECT id,row_type::text FROM scenarios_rows WHERE scenario_id=$1",
            )
            .bind(entity_id)
            .fetch_all(&mut *tx)
            .await?;
            if scenario_rows.len() != 4
                || ["ranged", "support", "melee", "tank"]
                    .iter()
                    .any(|kind| scenario_rows.iter().filter(|(_, row)| row == kind).count() != 1)
            {
                return Err(ApiError::internal(
                    "Scenario data is in an unexpected state. Please contact support.",
                ));
            }
        }
    }
    if entity == Entity::Scenario {
        validate_placements(&mut tx, &value).await?;
    }
    let mut persisted = Value::Object(
        value
            .as_object()
            .ok_or_else(|| ApiError::bad_request("Expected an object"))?
            .iter()
            .map(|(key, value)| (snake(key), value.clone()))
            .collect(),
    );
    // PostgreSQL integer input rejects a JSON token such as 2.0. These fields
    // have already passed positive-integer validation; preserve integer tokens.
    if entity == Entity::Effect {
        for key in [
            "trigger_every_actions",
            "trigger_count",
            "lasts_for_actions",
        ] {
            if let Some(number) = persisted[key].as_f64() {
                persisted[key] = json!(number as i64);
            }
        }
    }
    let columns = entity.columns();
    let sql = if entity_id.is_some() {
        format!(
            "UPDATE {} SET ({columns})=(SELECT {columns} FROM jsonb_populate_record(NULL::{},$1)),updated_at=now() WHERE id=$2 RETURNING id",
            entity.table(),
            entity.table()
        )
    } else {
        format!(
            "INSERT INTO {} ({columns}) SELECT {columns} FROM jsonb_populate_record(NULL::{},$1) RETURNING id",
            entity.table(),
            entity.table()
        )
    };
    let query = sqlx::query_scalar::<_, Uuid>(AssertSqlSafe(sql)).bind(persisted);
    let saved_id = if let Some(entity_id) = entity_id {
        query.bind(entity_id).fetch_one(&mut *tx).await
    } else {
        query.fetch_one(&mut *tx).await
    }
    .map_err(|error| entity.write_error(error))?;
    match entity {
        Entity::Item => {
            sqlx::query("DELETE FROM items_effects WHERE item_id=$1")
                .bind(saved_id)
                .execute(&mut *tx)
                .await?;
            for (index, effect_id) in linked_ids(&value, "effectIds")?.into_iter().enumerate() {
                sqlx::query("INSERT INTO items_effects(item_id,effect_template_id,sequence_order) VALUES ($1,$2,$3)").bind(saved_id).bind(effect_id).bind(position(index)?).execute(&mut *tx).await.map_err(|e|entity.write_error(e))?;
            }
            sqlx::query("DELETE FROM items_allowed_rows WHERE item_id=$1")
                .bind(saved_id)
                .execute(&mut *tx)
                .await?;
            for row in value["allowedRowTypes"]
                .as_array()
                .ok_or_else(|| ApiError::internal("Invalid allowed rows"))?
            {
                sqlx::query("INSERT INTO items_allowed_rows(item_id,row_type) VALUES ($1,$2::text::row_type)").bind(saved_id).bind(row.as_str().ok_or_else(||ApiError::internal("Invalid row type"))?).execute(&mut *tx).await.map_err(|e|entity.write_error(e))?;
            }
        }
        Entity::Unit => {
            sqlx::query("DELETE FROM units_items WHERE unit_id=$1")
                .bind(saved_id)
                .execute(&mut *tx)
                .await?;
            for (index, item_id) in linked_ids(&value, "itemIds")?.into_iter().enumerate() {
                sqlx::query("INSERT INTO units_items(unit_id,item_id,priority) VALUES ($1,$2,$3)")
                    .bind(saved_id)
                    .bind(item_id)
                    .bind(position(index)?)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| entity.write_error(e))?;
            }
        }
        Entity::Scenario => {
            for row in value["rows"]
                .as_array()
                .ok_or_else(|| ApiError::internal("Invalid scenario rows"))?
            {
                let kind = row["rowType"]
                    .as_str()
                    .ok_or_else(|| ApiError::internal("Invalid row type"))?;
                let row_id = if entity_id.is_some() {
                    scenario_rows
                        .iter()
                        .find(|(_, row)| row == kind)
                        .map(|(id, _)| *id)
                        .ok_or_else(|| ApiError::internal("Invalid stored scenario rows"))?
                } else {
                    sqlx::query_scalar("INSERT INTO scenarios_rows(scenario_id,row_type) VALUES ($1,$2::text::row_type) RETURNING id").bind(saved_id).bind(kind).fetch_one(&mut *tx).await?
                };
                sqlx::query("DELETE FROM scenarios_rows_units WHERE row_id=$1")
                    .bind(row_id)
                    .execute(&mut *tx)
                    .await?;
                for (index, unit_id) in linked_ids(row, "unitIds")?.into_iter().enumerate() {
                    sqlx::query(
                        "INSERT INTO scenarios_rows_units(row_id,unit_id,slot) VALUES ($1,$2,$3)",
                    )
                    .bind(row_id)
                    .bind(unit_id)
                    .bind(position(index)?)
                    .execute(&mut *tx)
                    .await
                    .map_err(|e| entity.write_error(e))?;
                }
            }
        }
        Entity::Effect => {}
    }
    let mut result = record(&mut tx, entity, saved_id).await?;
    // Create/update return requested row order, while GET uses combat row order.
    if entity == Entity::Item {
        result["allowedRowTypes"] = value["allowedRowTypes"].clone();
    }
    tx.commit().await.map_err(|e| entity.write_error(e))?;
    Ok(result)
}
fn position(index: usize) -> Result<i32> {
    i32::try_from(index + 1).map_err(|_| ApiError::bad_request("Too many linked records"))
}
fn linked_ids(value: &Value, key: &str) -> Result<Vec<Uuid>> {
    value[key]
        .as_array()
        .ok_or_else(|| ApiError::bad_request(format!("{key} must be an array")))?
        .iter()
        .map(|value| {
            id(value
                .as_str()
                .ok_or_else(|| ApiError::bad_request("Invalid UUID"))?)
        })
        .collect()
}
async fn validate_placements(connection: &mut PgConnection, value: &Value) -> Result<()> {
    let rows = value["rows"]
        .as_array()
        .ok_or_else(|| ApiError::internal("Invalid scenario rows"))?;
    let mut ids = vec![];
    for row in rows {
        for unit_id in linked_ids(row, "unitIds")? {
            if !ids.contains(&unit_id) {
                ids.push(unit_id);
            }
        }
    }
    if ids.is_empty() {
        return Ok(());
    }
    let placements:Vec<(Uuid,String,Option<Uuid>,Option<String>)>=sqlx::query_as("SELECT u.id,u.name,i.item_id,r.row_type::text FROM units u LEFT JOIN units_items i ON i.unit_id=u.id LEFT JOIN items_allowed_rows r ON r.item_id=i.item_id WHERE u.id=ANY($1)").bind(&ids).fetch_all(&mut *connection).await?;
    let missing: Vec<String> = ids
        .iter()
        .filter(|id| !placements.iter().any(|(found, _, _, _)| found == *id))
        .map(Uuid::to_string)
        .collect();
    if !missing.is_empty() {
        return Err(ApiError::bad_request(format!(
            "Scenario references non-existent unit IDs: {}.",
            missing.join(", ")
        )));
    }
    for row in rows {
        let kind = row["rowType"]
            .as_str()
            .ok_or_else(|| ApiError::internal("Invalid row type"))?;
        for unit_id in linked_ids(row, "unitIds")? {
            let unit_rows: Vec<_> = placements
                .iter()
                .filter(|(id, _, _, _)| *id == unit_id)
                .collect();
            for (_, name, item_id, item_row) in &unit_rows {
                if item_row.is_some()
                    && !unit_rows.iter().any(|(_, _, other_item, other_row)| {
                        other_item == item_id && other_row.as_deref() == Some(kind)
                    })
                {
                    return Err(ApiError::bad_request(format!(
                        "{name} cannot be deployed in {kind}."
                    )));
                }
            }
        }
    }
    Ok(())
}
async fn delete(
    State(state): State<AppState>,
    Extension(entity): Extension<Entity>,
    Path(raw_id): Path<String>,
) -> Result<Json<Success>> {
    let entity_id = id(&raw_id)?;
    let sql = format!("DELETE FROM {} WHERE id=$1 RETURNING id", entity.table());
    let deleted: Option<Uuid> = sqlx::query_scalar(AssertSqlSafe(sql))
        .bind(entity_id)
        .fetch_optional(&state.pool)
        .await
        .map_err(|error| {
            if entity == Entity::Effect
                && error
                    .as_database_error()
                    .is_some_and(|e| e.code().as_deref() == Some("23503"))
            {
                ApiError::conflict("Cannot delete effect while it is linked to one or more items.")
            } else {
                error.into()
            }
        })?;
    if deleted.is_none() {
        return Err(entity.missing());
    }
    Ok(Json(Success { success: true }))
}

#[derive(Deserialize)]
struct ListQuery {
    input: Option<String>,
}
fn linkage_sql(entity: Entity, filter: &LinkageFilter) -> Result<(String, Option<Uuid>)> {
    if matches!(filter, LinkageFilter::All) {
        return Ok((String::new(), None));
    }
    let scenario_id = if let LinkageFilter::Scenario { scenario_id } = filter {
        if entity == Entity::Scenario {
            return Err(ApiError::bad_request(
                "Scenarios do not support a scenario linkage filter",
            ));
        }
        Some(id(scenario_id)?)
    } else {
        None
    };
    let subquery = match (entity, scenario_id.is_some()) {
        (Entity::Effect, true) => {
            "SELECT 1 FROM items_effects ie JOIN units_items ui ON ui.item_id=ie.item_id JOIN scenarios_rows_units a ON a.unit_id=ui.unit_id JOIN scenarios_rows r ON r.id=a.row_id WHERE ie.effect_template_id=t.id AND r.scenario_id=$1"
        }
        (Entity::Item, true) => {
            "SELECT 1 FROM units_items ui JOIN scenarios_rows_units a ON a.unit_id=ui.unit_id JOIN scenarios_rows r ON r.id=a.row_id WHERE ui.item_id=t.id AND r.scenario_id=$1"
        }
        (Entity::Unit, true) => {
            "SELECT 1 FROM scenarios_rows_units a JOIN scenarios_rows r ON r.id=a.row_id WHERE a.unit_id=t.id AND r.scenario_id=$1"
        }
        (Entity::Effect, false) => {
            "SELECT 1 FROM items_effects ie WHERE ie.effect_template_id=t.id"
        }
        (Entity::Item, false) => "SELECT 1 FROM units_items ui WHERE ui.item_id=t.id",
        (Entity::Unit, false) => "SELECT 1 FROM scenarios_rows_units a WHERE a.unit_id=t.id",
        (Entity::Scenario, _) => {
            "SELECT 1 FROM scenarios_rows_units a JOIN scenarios_rows r ON r.id=a.row_id WHERE r.scenario_id=t.id"
        }
    };
    let inverse = if matches!(filter, LinkageFilter::Unlinked) {
        "NOT "
    } else {
        ""
    };
    Ok((format!(" WHERE {inverse}EXISTS ({subquery})"), scenario_id))
}
async fn list(
    State(state): State<AppState>,
    Extension(entity): Extension<Entity>,
    query: std::result::Result<Query<ListQuery>, axum::extract::rejection::QueryRejection>,
) -> Result<Json<Value>> {
    let Query(query) = query.map_err(|e| ApiError::bad_request(e.body_text()))?;
    let input: ListInput = serde_json::from_str(query.input.as_deref().unwrap_or("{}"))
        .map_err(|e| ApiError::bad_request(e.to_string()))?;
    if input.page == 0 || input.limit == 0 || input.limit > 500 {
        return Err(ApiError::bad_request(
            "Page must be at least 1 and limit must be between 1 and 500",
        ));
    }
    let sort = match (entity, input.sort_by.as_str()) {
        (_, "name") => "name",
        (Entity::Effect, "timingType") => "timing_type",
        (Entity::Effect, "effectType") => "effect_type",
        (Entity::Item | Entity::Unit | Entity::Scenario, "updatedAt") => "updated_at",
        _ => return Err(ApiError::bad_request("Invalid sortBy")),
    };
    let direction = match input.sort_dir.as_str() {
        "asc" => "ASC",
        "desc" => "DESC",
        _ => return Err(ApiError::bad_request("Invalid sortDir")),
    };
    let tie = if entity == Entity::Scenario {
        ",t.id ASC"
    } else if sort != "name" {
        ",t.name ASC"
    } else {
        ""
    };
    let (condition, scenario_id) = linkage_sql(entity, &input.linkage_filter)?;
    // Repeatable read keeps count and rows from one database snapshot.
    let mut tx = crate::transaction::begin(&state.pool).await?;
    sqlx::query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")
        .execute(&mut *tx)
        .await?;
    let sql = format!("SELECT count(*) FROM {} t{condition}", entity.table());
    let query = sqlx::query_scalar::<_, i64>(AssertSqlSafe(sql));
    let total = if let Some(scenario_id) = scenario_id {
        query.bind(scenario_id).fetch_one(&mut *tx).await?
    } else {
        query.fetch_one(&mut *tx).await?
    };
    let parameter = if scenario_id.is_some() { 2 } else { 1 };
    let sql = format!(
        "SELECT to_jsonb(t) FROM {} t{condition} ORDER BY t.{sort} {direction}{tie} LIMIT ${parameter} OFFSET ${}",
        entity.table(),
        parameter + 1
    );
    let mut query = sqlx::query_scalar::<_, Value>(AssertSqlSafe(sql));
    if let Some(scenario_id) = scenario_id {
        query = query.bind(scenario_id);
    }
    let rows = query
        .bind(i64::from(input.limit))
        .bind(i64::from(input.page - 1) * i64::from(input.limit))
        .fetch_all(&mut *tx)
        .await?;
    let mut items = vec![];
    for row in rows {
        let mut value = wire_row(row)?;
        items.push(match entity {
            Entity::Effect => {
                timing_status(&mut value)?;
                contract::<EffectListItem>(value)?
            }
            Entity::Item => contract::<ItemListItem>(value)?,
            Entity::Unit => contract::<UnitListItem>(value)?,
            Entity::Scenario => contract::<ScenarioListItem>(value)?,
        });
    }
    tx.commit().await?;
    Ok(Json(
        json!({"items":items,"page":input.page,"limit":input.limit,"totalCount":total}),
    ))
}
