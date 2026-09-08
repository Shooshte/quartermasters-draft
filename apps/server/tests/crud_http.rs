use axum::{Router, body::Body, http::Request};
use http_body_util::BodyExt;
use qd_server::{Config, app, auth::sign_cookie_value};
use serde_json::{Value, json};
use sqlx::PgPool;
use tower::ServiceExt;

const SECRET: &str = "crud-integration-test-secret";
async fn setup(pool: &PgPool) -> Router {
    qd_db::migrate(pool).await.unwrap();
    sqlx::query(
        "INSERT INTO \"user\"(id,name,email,role) VALUES ('crud-gm','GM','crud@example.com','gm')",
    )
    .execute(pool)
    .await
    .unwrap();
    sqlx::query("INSERT INTO session(id,user_id,token,expires_at) VALUES ('crud-session','crud-gm','crud-token',now()+interval '1 hour')").execute(pool).await.unwrap();
    app(
        pool.clone(),
        Config {
            auth_secret: SECRET.into(),
            auth_url: "http://localhost:3000".into(),
            web_dist_dir: "/missing".into(),
        },
    )
}
async fn call(app: &Router, method: &str, path: &str, body: Value) -> (u16, Value) {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(method)
                .uri(format!("/api/v1/{path}"))
                .header(
                    "cookie",
                    format!(
                        "better-auth.session_token={}",
                        sign_cookie_value("crud-token", SECRET)
                    ),
                )
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status().as_u16();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    (
        status,
        serde_json::from_slice(&bytes)
            .unwrap_or_else(|_| panic!("Non-JSON {status}: {}", String::from_utf8_lossy(&bytes))),
    )
}
fn effect(name: &str) -> Value {
    json!({"name":name,"timingType":"instant","effectType":"damage","directMeleeDmg":2})
}
fn item(name: &str, effects: Value, rows: Value) -> Value {
    json!({"name":name,"mana":-1.25,"meleeDmg":2.5,"rangedDmg":0,"manaRegen":0,"spellDmg":0,"dodge":0,"criticalChance":0,"activationManaCost":0,"activationHealthCost":0,"effectIds":effects,"allowedRowTypes":rows})
}
fn unit(name: &str, items: Value) -> Value {
    json!({"name":name,"health":10,"mana":100,"meleeDmg":0,"rangedDmg":0,"manaRegen":0,"spellDmg":0,"speed":1,"dodge":0,"criticalChance":0,"itemIds":items})
}
fn list_path(entity: &str, input: Value) -> String {
    format!(
        "{entity}?{}",
        url::form_urlencoded::Serializer::new(String::new())
            .append_pair("input", &input.to_string())
            .finish()
    )
}
async fn ok(app: &Router, method: &str, path: &str, body: Value) -> Value {
    let (status, result) = call(app, method, path, body).await;
    assert_eq!(status, 200, "{method} {path}: {result}");
    result
}

#[sqlx::test(migrations = false)]
async fn editor_graph_preserves_order_defaults_cascades_and_conflicts(pool: PgPool) {
    let app = setup(&pool).await;
    let a = ok(&app, "POST", "effects", effect(" A ")).await;
    let b = ok(&app, "POST", "effects", effect("B")).await;
    assert_eq!(a["name"], "A");
    assert_eq!(a["shield"], Value::Null);
    assert_eq!(a["needsTimingConfiguration"], false);
    let aid = a["id"].as_str().unwrap();
    let bid = b["id"].as_str().unwrap();
    let i = ok(
        &app,
        "POST",
        "items",
        item("Blade", json!([bid, aid, bid]), json!(["support", "tank"])),
    )
    .await;
    assert_eq!(i["effectIds"], json!([bid, aid, bid]));
    assert_eq!(i["allowedRowTypes"], json!(["support", "tank"]));
    let ip = format!("items/{}", i["id"].as_str().unwrap());
    let got = ok(&app, "GET", &ip, Value::Null).await;
    assert_eq!(got["allowedRowTypes"], json!(["tank", "support"]));
    let u = ok(
        &app,
        "POST",
        "units",
        unit("Guard", json!([i["id"], i["id"]])),
    )
    .await;
    assert_eq!(u["targetScope"], "enemies");
    assert_eq!(u["targetCount"], 1);
    assert_eq!(u["itemIds"], json!([i["id"], i["id"]]));
    let s = ok(
        &app,
        "POST",
        "scenarios",
        json!({"name":"Battle","rows":[{"rowType":"tank","unitIds":[u["id"],u["id"]]}]}),
    )
    .await;
    assert_eq!(s["rows"].as_array().unwrap().len(), 4);
    assert_eq!(s["rows"][3]["assignments"][1]["position"], 2);
    let (status, err) = call(&app, "DELETE", &format!("effects/{aid}"), Value::Null).await;
    assert_eq!(status, 409);
    assert_eq!(
        err["error"]["message"],
        "Cannot delete effect while it is linked to one or more items."
    );
    for entity in ["effects", "items", "units", "scenarios"] {
        let listed = ok(&app, "GET", entity, Value::Null).await;
        assert_eq!(listed["limit"], 20);
        assert_eq!(listed["page"], 1);
    }
    let (status, err) = call(&app, "POST", "effects", effect("A")).await;
    assert_eq!(status, 409);
    assert_eq!(
        err["error"]["message"],
        "An effect with this name already exists."
    );
    ok(&app, "DELETE", &ip, Value::Null).await;
    assert_eq!(
        ok(
            &app,
            "GET",
            &format!("units/{}", u["id"].as_str().unwrap()),
            Value::Null
        )
        .await["itemIds"],
        json!([])
    );
    ok(&app, "DELETE", &format!("effects/{aid}"), Value::Null).await;
    ok(
        &app,
        "DELETE",
        &format!("units/{}", u["id"].as_str().unwrap()),
        Value::Null,
    )
    .await;
    let sp = format!("scenarios/{}", s["id"].as_str().unwrap());
    assert_eq!(
        ok(&app, "GET", &sp, Value::Null).await["rows"][3]["assignments"],
        json!([])
    );
    ok(&app, "DELETE", &sp, Value::Null).await;
}

#[sqlx::test(migrations = false)]
async fn updates_are_atomic_and_scenario_restrictions_use_intersection(pool: PgPool) {
    let app = setup(&pool).await;
    let e = ok(&app, "POST", "effects", effect("Hit")).await;
    let i = ok(
        &app,
        "POST",
        "items",
        item("Bow", json!([e["id"]]), json!(["ranged", "support"])),
    )
    .await;
    let j = ok(
        &app,
        "POST",
        "items",
        item("Staff", json!([]), json!(["support", "tank"])),
    )
    .await;
    let u = ok(
        &app,
        "POST",
        "units",
        unit("Archer", json!([i["id"], j["id"]])),
    )
    .await;
    let invalid = json!({"name":"Bad","rows":[{"rowType":"ranged","unitIds":[u["id"]]}]});
    let (status, err) = call(&app, "POST", "scenarios", invalid).await;
    assert_eq!(status, 400);
    assert_eq!(
        err["error"]["message"],
        "Archer cannot be deployed in ranged."
    );
    let s = ok(
        &app,
        "POST",
        "scenarios",
        json!({"name":"Good","rows":[{"rowType":"support","unitIds":[u["id"]]}]}),
    )
    .await;
    let sp = format!("scenarios/{}", s["id"].as_str().unwrap());
    let missing = "00000000-0000-0000-0000-000000000099";
    let (status, err) = call(
        &app,
        "PUT",
        &sp,
        json!({"name":"Changed","rows":[{"rowType":"tank","unitIds":[missing]}]}),
    )
    .await;
    assert_eq!(status, 400);
    assert_eq!(
        err["error"]["message"],
        format!("Scenario references non-existent unit IDs: {missing}.")
    );
    assert_eq!(ok(&app, "GET", &sp, Value::Null).await, s);
    let ip = format!("items/{}", i["id"].as_str().unwrap());
    let before = ok(&app, "GET", &ip, Value::Null).await;
    assert_eq!(
        call(
            &app,
            "PUT",
            &ip,
            item("Broken", json!([missing]), json!([]))
        )
        .await
        .0,
        500
    );
    assert_eq!(ok(&app, "GET", &ip, Value::Null).await, before);
    let up = format!("units/{}", u["id"].as_str().unwrap());
    let before = ok(&app, "GET", &up, Value::Null).await;
    assert_eq!(
        call(&app, "PUT", &up, unit("Broken", json!([missing])))
            .await
            .0,
        500
    );
    assert_eq!(ok(&app, "GET", &up, Value::Null).await, before);
    let mut update = unit("Archer II", json!([j["id"], i["id"], j["id"]]));
    update["id"] = json!(missing);
    let updated = ok(&app, "PUT", &up, update).await;
    assert_eq!(updated["id"], u["id"]);
    assert_eq!(updated["itemIds"], json!([j["id"], i["id"], j["id"]]));
    let updated = ok(
        &app,
        "PUT",
        &sp,
        json!({"name":"Renamed","rows":[{"rowType":"support","unitIds":[u["id"],u["id"]]}]}),
    )
    .await;
    assert_eq!(updated["rows"][1]["id"], s["rows"][1]["id"]);
    assert_eq!(updated["rows"][1]["assignments"][1]["position"], 2);
}

#[sqlx::test(migrations = false)]
async fn filters_counts_paging_and_invalid_inputs(pool: PgPool) {
    let app = setup(&pool).await;
    let a = ok(&app, "POST", "effects", effect("Alpha")).await;
    ok(&app, "POST", "effects", effect("Zeta")).await;
    let i = ok(
        &app,
        "POST",
        "items",
        item("I", json!([a["id"], a["id"]]), json!([])),
    )
    .await;
    let u = ok(&app, "POST", "units", unit("U", json!([i["id"], i["id"]]))).await;
    let s = ok(
        &app,
        "POST",
        "scenarios",
        json!({"name":"S","rows":[{"rowType":"tank","unitIds":[u["id"],u["id"]]}]}),
    )
    .await;
    ok(&app, "POST", "scenarios", json!({"name":"Empty","rows":[]})).await;
    for entity in ["effects", "items", "units"] {
        let page = ok(
            &app,
            "GET",
            &list_path(
                entity,
                json!({"linkageFilter":{"mode":"scenario","scenarioId":s["id"]}}),
            ),
            Value::Null,
        )
        .await;
        assert_eq!(page["totalCount"], 1);
        assert_eq!(page["items"].as_array().unwrap().len(), 1);
    }
    for (entity, mode, count) in [
        ("effects", "linked", 1),
        ("effects", "unlinked", 1),
        ("scenarios", "linked", 1),
        ("scenarios", "unlinked", 1),
    ] {
        assert_eq!(
            ok(
                &app,
                "GET",
                &list_path(entity, json!({"linkageFilter":{"mode":mode}})),
                Value::Null
            )
            .await["totalCount"],
            count
        );
    }
    let page = ok(
        &app,
        "GET",
        &list_path("effects", json!({"page":2,"limit":1,"sortDir":"desc"})),
        Value::Null,
    )
    .await;
    assert_eq!(page["totalCount"], 2);
    assert_eq!(page["items"][0]["name"], "Alpha");
    assert!(page["items"][0].get("directMeleeDmg").is_none());
    assert_eq!(
        ok(
            &app,
            "GET",
            &list_path("effects", json!({"page":99,"limit":1})),
            Value::Null
        )
        .await["totalCount"],
        2
    );
    for input in [
        json!({"limit":501}),
        json!({"page":0}),
        json!({"sortBy":"name; DROP TABLE effects"}),
        json!({"sortDir":"bad"}),
        json!({"linkageFilter":{"mode":"scenario"}}),
    ] {
        assert_eq!(
            call(&app, "GET", &list_path("effects", input), Value::Null)
                .await
                .0,
            400
        );
    }
    assert_eq!(
        call(
            &app,
            "GET",
            &list_path(
                "scenarios",
                json!({"linkageFilter":{"mode":"scenario","scenarioId":s["id"]}})
            ),
            Value::Null
        )
        .await
        .0,
        400
    );
    for entity in ["effects", "items", "units", "scenarios"] {
        assert_eq!(
            call(&app, "GET", &format!("{entity}/bad-id"), Value::Null)
                .await
                .0,
            400
        );
        assert_eq!(
            call(
                &app,
                "DELETE",
                &format!("{entity}/00000000-0000-0000-0000-000000000000"),
                Value::Null
            )
            .await
            .0,
            404
        );
    }
    let mut invalid = effect("Old");
    invalid["intervalMs"] = json!(1);
    assert_eq!(call(&app, "POST", "effects", invalid).await.0, 400);
}

#[sqlx::test(migrations = false)]
async fn effect_update_validation_and_legacy_timing_status(pool: PgPool) {
    let app = setup(&pool).await;
    let e = ok(&app, "POST", "effects", effect("Damage")).await;
    let path = format!("effects/{}", e["id"].as_str().unwrap());
    let updated=ok(&app,"PUT",&path,json!({"name":" Shield ","timingType":"instant","effectType":"buff","shield":10,"lastsForActions":2,"triggerEveryActions":3,"triggerCount":4,"bypassesShield":true})).await;
    assert_eq!(updated["name"], "Shield");
    assert_eq!(updated["triggerEveryActions"], Value::Null);
    assert_eq!(updated["triggerCount"], Value::Null);
    assert_eq!(updated["lastsForActions"], 2.0);
    assert_eq!(ok(&app, "GET", &path, Value::Null).await, updated);
    for (patch, message) in [
        (
            json!({"timingType":"interval","effectType":"buff","isTaunt":true,"triggerEveryActions":1,"triggerCount":1}),
            "Taunt effects must use instant timing.",
        ),
        (
            json!({"timingType":"interval","effectType":"buff","triggerEveryActions":1}),
            "Trigger count is required for interval timing.",
        ),
        (
            json!({"timingType":"instant","effectType":"buff","health":0}),
            "Lasts for actions is required for stat buffs and debuffs.",
        ),
    ] {
        let mut input = patch;
        input["name"] = json!("Invalid");
        let (status, err) = call(&app, "PUT", &path, input).await;
        assert_eq!(status, 400);
        assert_eq!(err["error"]["message"], message);
        assert_eq!(ok(&app, "GET", &path, Value::Null).await, updated);
    }
    sqlx::query(
        "INSERT INTO effects(name,timing_type,effect_type) VALUES ('Legacy','interval','buff')",
    )
    .execute(&pool)
    .await
    .unwrap();
    let page = ok(&app, "GET", "effects", Value::Null).await;
    assert!(
        page["items"]
            .as_array()
            .unwrap()
            .iter()
            .any(|e| e["name"] == "Legacy" && e["needsTimingConfiguration"] == true)
    );
    let _: qd_api_types::Effect = serde_json::from_value(updated).unwrap();
}

#[sqlx::test(migrations = false)]
async fn scenario_normalization_and_corrupt_persisted_rows(pool: PgPool) {
    let app = setup(&pool).await;
    let unit = ok(&app, "POST", "units", unit("U", json!([]))).await;
    let scenario=ok(&app,"POST","scenarios",json!({"name":"Normalized","rows":[{"rowType":"tank","unitIds":[unit["id"]]},{"rowType":"tank","unitIds":[]}]})).await;
    assert_eq!(scenario["rows"][3]["assignments"], json!([]));
    let (status,_)=call(&app,"POST","scenarios",json!({"name":"Invalid discarded ID","rows":[{"rowType":"tank","unitIds":["bad"]},{"rowType":"tank","unitIds":[]}]})).await;
    assert_eq!(status, 400);
    let id = uuid::Uuid::parse_str(scenario["id"].as_str().unwrap()).unwrap();
    sqlx::query("DELETE FROM scenarios_rows WHERE scenario_id=$1 AND row_type='tank'")
        .bind(id)
        .execute(&pool)
        .await
        .unwrap();
    let (status, error) = call(
        &app,
        "PUT",
        &format!("scenarios/{id}"),
        json!({"name":"No","rows":[]}),
    )
    .await;
    assert_eq!(status, 500);
    assert_eq!(
        error["error"]["message"],
        "Scenario data is in an unexpected state. Please contact support."
    );
}

#[sqlx::test(migrations = false)]
async fn item_replacement_name_conflicts_and_missing_updates(pool: PgPool) {
    let app = setup(&pool).await;
    let effect = ok(&app, "POST", "effects", effect("E")).await;
    let item_input = item("Item", json!([effect["id"]]), json!(["tank"]));
    let unit_input = unit("Unit", json!([]));
    let scenario_input = json!({"name":"Scenario","rows":[]});
    for (entity, input, article) in [
        ("items", item_input.clone(), "An item"),
        ("units", unit_input, "A unit"),
        ("scenarios", scenario_input, "A scenario"),
    ] {
        let saved = ok(&app, "POST", entity, input.clone()).await;
        let (status, error) = call(&app, "POST", entity, input.clone()).await;
        assert_eq!(status, 409);
        assert_eq!(
            error["error"]["message"],
            format!("{article} with this name already exists.")
        );
        let mut second_input = input.clone();
        second_input["name"] = json!("Second");
        let second = ok(&app, "POST", entity, second_input).await;
        let path = format!("{entity}/{}", second["id"].as_str().unwrap());
        assert_eq!(call(&app, "PUT", &path, input.clone()).await.0, 409);
        assert_eq!(ok(&app, "GET", &path, Value::Null).await["name"], "Second");
        assert_eq!(
            call(
                &app,
                "PUT",
                &format!("{entity}/00000000-0000-0000-0000-000000000000"),
                input
            )
            .await
            .0,
            404
        );
        if entity == "items" {
            let path = format!("items/{}", saved["id"].as_str().unwrap());
            let updated = ok(
                &app,
                "PUT",
                &path,
                item(
                    "Changed",
                    json!([effect["id"], effect["id"]]),
                    json!(["support", "ranged"]),
                ),
            )
            .await;
            assert_eq!(updated["effectIds"], json!([effect["id"], effect["id"]]));
            assert_eq!(updated["allowedRowTypes"], json!(["support", "ranged"]));
            let updated = ok(&app, "PUT", &path, item("Empty", json!([]), json!([]))).await;
            assert_eq!(updated["effectIds"], json!([]));
            assert_eq!(updated["allowedRowTypes"], json!([]));
        }
    }
    assert_eq!(
        ok(
            &app,
            "GET",
            &list_path(
                "items",
                json!({"limit":500,"sortBy":"updatedAt","sortDir":"desc"})
            ),
            Value::Null
        )
        .await["limit"],
        500
    );
}

#[sqlx::test(migrations = false)]
async fn invalid_payloads_and_all_resource_authentication_are_json_errors(pool: PgPool) {
    let app = setup(&pool).await;
    for entity in ["effects", "items", "units", "scenarios"] {
        for method in ["GET", "POST"] {
            let response = app
                .clone()
                .oneshot(
                    Request::builder()
                        .method(method)
                        .uri(format!("/api/v1/{entity}"))
                        .header("content-type", "application/json")
                        .body(Body::from("{}"))
                        .unwrap(),
                )
                .await
                .unwrap();
            assert_eq!(response.status().as_u16(), 401);
            let bytes = response.into_body().collect().await.unwrap().to_bytes();
            assert_eq!(
                serde_json::from_slice::<Value>(&bytes).unwrap()["error"]["code"],
                "UNAUTHORIZED"
            );
        }
        assert_eq!(
            call(&app, "POST", entity, json!({"name":"Missing fields"}))
                .await
                .0,
            400
        );
    }
    let mut invalid = item("Duplicate", json!([]), json!(["tank", "tank"]));
    let (status, error) = call(&app, "POST", "items", invalid.clone()).await;
    assert_eq!(status, 400);
    assert_eq!(
        error["error"]["message"],
        "Allowed row types must not contain duplicates."
    );
    invalid["allowedRowTypes"] = json!([]);
    invalid["activationManaCost"] = json!(-1);
    assert_eq!(call(&app, "POST", "items", invalid).await.0, 400);
    let mut invalid = unit("Invalid", json!([]));
    invalid["targetCount"] = json!(1.5);
    assert_eq!(call(&app, "POST", "units", invalid.clone()).await.0, 400);
    invalid["targetCount"] = json!(0);
    assert_eq!(call(&app, "POST", "units", invalid.clone()).await.0, 400);
    invalid["targetCount"] = json!(1);
    invalid["mana"] = json!(-1);
    assert_eq!(call(&app, "POST", "units", invalid).await.0, 400);
    for entity in ["effects", "items", "units", "scenarios"] {
        assert_eq!(ok(&app, "GET", entity, Value::Null).await["totalCount"], 0);
    }
}
