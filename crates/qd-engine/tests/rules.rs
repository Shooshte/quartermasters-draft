//! Native regression tests for the standalone public engine boundary.
use qd_engine::{BattleEngine, random_sequence, resolve_json};
use serde_json::{Value, json};
fn unit(name: &str, health: f64, speed: f64) -> Value {
    json!({"name":name,"stats":{"health":health,"mana":100,"meleeDmg":10,"rangedDmg":0,"manaRegen":0,"spellDmg":0,"speed":speed,"dodge":0,"criticalChance":0}})
}
fn input() -> Value {
    json!({"seed":42,"scenarios":[{"id":"A","rows":{"tank":[unit("A",100.0,10.0)]}},{"id":"B","rows":{"tank":[unit("B",100.0,10.0)]}}]})
}
fn actor(input: &mut Value) -> &mut Value {
    &mut input["scenarios"][0]["rows"]["tank"][0]
}
fn engine(input: Value) -> BattleEngine {
    BattleEngine::new(input, json!({})).unwrap()
}
fn error(input: Value) -> String {
    match BattleEngine::new(input, json!({})) {
        Err(e) => e.to_string(),
        Ok(_) => panic!("expected rejection"),
    }
}
fn effect_input(effect: Value) -> Value {
    let mut v = input();
    actor(&mut v)["items"] =
        json!([{"name":"Item","effects":[{"sequenceOrder":1,"effect":effect}]}]);
    v
}
#[test]
fn no_living_units_are_rejected() {
    let mut v = input();
    actor(&mut v)["currentHealth"] = json!(0);
    v["scenarios"][1]["rows"] = json!({});
    assert_eq!(
        error(v),
        "Battle initialization requires at least one living unit."
    );
}
#[test]
fn invalid_seeds_are_rejected() {
    for seed in [Value::Null, json!(true), json!([]), json!({})] {
        let mut v = input();
        v["seed"] = seed;
        assert_eq!(
            error(v),
            "Battle seed must be a finite number or non-blank string."
        );
    }
}
#[test]
fn blank_ecmascript_whitespace_seed_is_rejected() {
    let mut v = input();
    v["seed"] = json!("\u{feff} \t\u{a0}");
    assert_eq!(error(v), "Battle seed must not be blank.");
}
#[test]
fn non_ecmascript_whitespace_is_retained_in_seed() {
    assert_ne!(
        random_sequence(&json!("\u{85}42\u{85}"), 10).unwrap(),
        random_sequence(&json!(42), 10).unwrap()
    );
}
#[test]
fn canonical_numeric_and_trimmed_string_seeds_match() {
    assert_eq!(
        random_sequence(&json!(42), 100).unwrap(),
        random_sequence(&json!(" 42 "), 100).unwrap()
    );
}
#[test]
fn random_sequence_is_bounded() {
    for seed in [json!(-1), json!(0), json!("⚔️")] {
        assert!(
            random_sequence(&seed, 10000)
                .unwrap()
                .iter()
                .all(|n| *n >= 0.0 && *n < 1.0)
        );
    }
}
#[test]
fn target_count_requires_positive_integer() {
    for count in [json!(0), json!(-1), json!(1.5), Value::Null] {
        let mut v = input();
        actor(&mut v)["targetCount"] = count;
        assert_eq!(error(v), "Target count must be a positive integer");
    }
}
#[test]
fn targeting_enum_errors_identify_unit() {
    for (key, label) in [
        ("targetScope", "target scope"),
        ("targetPriority", "target priority"),
        ("selectionShape", "selection shape"),
    ] {
        let mut v = input();
        actor(&mut v)[key] = json!("invalid");
        assert_eq!(error(v), format!("Invalid {label} \"invalid\" for A."));
    }
}
#[test]
fn duplicate_item_row_restrictions_are_rejected() {
    let mut v = input();
    actor(&mut v)["items"] = json!([{"name":"Sword","allowedRowTypes":["tank","tank"]}]);
    assert_eq!(error(v), "Sword has duplicate allowed row types");
}
#[test]
fn incompatible_item_rows_are_rejected() {
    let mut v = input();
    actor(&mut v)["items"] = json!([{"name":"Sword","allowedRowTypes":["tank"]},{"name":"Bow","allowedRowTypes":["ranged"]}]);
    assert_eq!(error(v), "A has no shared allowed item rows");
}
#[test]
fn deployment_outside_item_rows_is_rejected() {
    let mut v = input();
    actor(&mut v)["items"] = json!([{"name":"Bow","allowedRowTypes":["ranged"]}]);
    assert_eq!(error(v), "A cannot be deployed in tank");
}
#[test]
fn empty_item_row_restrictions_allow_every_row() {
    let mut v = input();
    actor(&mut v)["items"] = json!([{"name":"Sword","allowedRowTypes":[]}]);
    assert!(BattleEngine::new(v, json!({})).is_ok());
}
#[test]
fn interval_taunts_are_rejected() {
    assert_eq!(
        error(effect_input(
            json!({"name":"Taunt","timingType":"interval","effectType":"debuff","isTaunt":true,"triggerEveryActions":1,"triggerCount":2})
        )),
        "Taunt effect \"Taunt\" must use instant timing."
    );
}
#[test]
fn taunt_duration_requires_positive_integer() {
    for duration in [json!(0), json!(-1), json!(0.5)] {
        assert_eq!(
            error(effect_input(
                json!({"name":"Taunt","timingType":"instant","effectType":"debuff","isTaunt":true,"lastsForActions":duration})
            )),
            "Taunt effect \"Taunt\" must have a positive duration."
        );
    }
}
#[test]
fn persistent_taunt_modifiers_need_no_duration() {
    let v = effect_input(
        json!({"name":"Taunt","timingType":"instant","effectType":"debuff","isTaunt":true,"speed":1,"dodge":5}),
    );
    assert!(BattleEngine::new(v, json!({})).is_ok());
}
#[test]
fn positive_shield_requires_instant_modifier_lifecycle() {
    for (timing, category) in [
        ("interval", "buff"),
        ("instant", "healing"),
        ("instant", "damage"),
    ] {
        assert_eq!(
            error(effect_input(
                json!({"name":"Shield","timingType":timing,"effectType":category,"isTaunt":false,"shield":10,"lastsForActions":1,"triggerEveryActions":1,"triggerCount":1})
            )),
            "Effect \"Shield\" shield is only supported for instant buffs and debuffs."
        );
    }
}
#[test]
fn interval_timing_must_be_configured() {
    assert_eq!(
        error(effect_input(
            json!({"timingType":"interval","effectType":"damage","isTaunt":false,"directSpellDmg":10})
        )),
        "Effect \"Effect\" timing needs configuration."
    );
}
#[test]
fn modifier_timing_must_be_configured() {
    assert_eq!(
        error(effect_input(
            json!({"timingType":"instant","effectType":"buff","isTaunt":false,"speed":10})
        )),
        "Effect \"Effect\" timing needs configuration."
    );
}
#[test]
fn simultaneous_lethal_attacks_draw() {
    let mut v = input();
    actor(&mut v)["stats"]["health"] = json!(10);
    v["scenarios"][1]["rows"]["tank"][0]["stats"]["health"] = json!(10);
    let result = resolve_json(v, json!({})).unwrap();
    assert_eq!(result["winnerId"], Value::Null);
    assert_eq!(result["actionsResolved"], 2);
    assert_eq!(
        result["log"]
            .as_array()
            .unwrap()
            .iter()
            .filter(|e| e["type"] == "attack")
            .count(),
        2
    );
}
#[test]
fn empty_opponent_finishes_before_any_batch() {
    let mut v = input();
    v["scenarios"][1]["rows"] = json!({});
    let state = engine(v).get_state();
    assert_eq!(state["status"], "finished");
    assert_eq!(state["winnerId"], "A");
    assert_eq!(state["batchCount"], 0);
}
#[test]
fn snapshots_are_detached() {
    let mut e = engine(input());
    let mut snapshot = e.get_state();
    snapshot["scenarios"][0]["rows"]["tank"][0]["currentHealth"] = json!(0);
    assert_eq!(
        e.resolve_next_batch()["scenarios"][0]["rows"]["tank"][0]["currentHealth"].as_f64(),
        Some(90.0)
    );
}
#[test]
fn fractional_speed_schedules_proportionally() {
    let mut v = input();
    actor(&mut v)["stats"]["speed"] = json!(7.5);
    v["scenarios"][1]["rows"]["tank"][0]["stats"]["speed"] = json!(30);
    let state = engine(v).resolve_next_batch();
    assert_eq!(state["actionCount"], 1);
    assert_eq!(
        state["scenarios"][0]["rows"]["tank"][0]["actionBar"].as_f64(),
        Some(25.0)
    );
}
#[test]
fn fatigue_terminates_zero_damage_zero_speed_battles() {
    let mut v = input();
    for side in [0, 1] {
        let u = &mut v["scenarios"][side]["rows"]["tank"][0];
        u["stats"]["speed"] = json!(0);
        u["stats"]["meleeDmg"] = json!(0);
    }
    let result = resolve_json(v, json!({"fatigueActionThreshold":2})).unwrap();
    assert_eq!(result["winnerId"], Value::Null);
    assert!(result["actionsResolved"].as_u64().unwrap() < 30);
    assert!(
        result["log"].as_array().unwrap().last().unwrap()["message"]
            .as_str()
            .unwrap()
            .contains("action limit")
    );
}

#[test]
fn default_battle_matches_original_zero_argument_constructor() {
    let mut battle = BattleEngine::default();
    let state = battle.get_state();
    assert_eq!(
        state["scenarios"][0]["rows"]["tank"][0]["name"],
        "Default A"
    );
    assert_eq!(
        state["scenarios"][1]["rows"]["tank"][0]["name"],
        "Default B"
    );
    assert_eq!(battle.resolve()["actionsResolved"], 20);
}

#[test]
fn fractional_numeric_seed_uses_ecmascript_shortest_decimal_tie_breaking() {
    // JavaScript String(817617690019844.2) ends in .2, while Rust Display ends in .3.
    // Both denote the same binary64 number; hashing the wrong text changes targeting.
    assert_eq!(
        random_sequence(&json!(817617690019844.2), 32).unwrap(),
        random_sequence(&json!("817617690019844.2"), 32).unwrap()
    );
}
