use qd_api_types::openapi;
#[test]
fn contract_exposes_typed_mutations_and_replay_logs() {
    let doc = openapi();
    assert_eq!(
        doc["paths"]["/api/v1/effects"]["post"]["requestBody"]["content"]["application/json"]["schema"]
            ["$ref"],
        "#/components/schemas/EffectInput"
    );
    assert!(doc["components"]["schemas"]["BattleLogEntry"]["oneOf"].is_array());
    assert!(doc["paths"]["/api/v1/auth/session"]["get"].is_object());
}

#[test]
fn unit_target_defaults_and_nullable_effect_omission_match_editor_contract() {
    let unit: qd_api_types::UnitInput = serde_json::from_value(serde_json::json!({
        "name":"Unit","health":10,"mana":0,"meleeDmg":1,"rangedDmg":0,"manaRegen":0,"spellDmg":0,"speed":10,"dodge":0,"criticalChance":0,"itemIds":[]
    })).unwrap();
    assert_eq!(unit.target_count, 1);
    assert_eq!(serde_json::to_value(unit.target_scope).unwrap(), "enemies");
    let effect: qd_api_types::EffectInput = serde_json::from_value(
        serde_json::json!({"name":"Effect","timingType":"instant","effectType":"damage"}),
    )
    .unwrap();
    assert!(effect.health.is_none());
    assert!(!effect.is_taunt);
    let schema = qd_api_types::openapi();
    assert!(
        !schema["components"]["schemas"]["EffectInput"]["required"]
            .as_array()
            .unwrap()
            .contains(&serde_json::json!("health"))
    );
    assert!(
        schema["components"]["schemas"]["EffectData"]["required"]
            .as_array()
            .unwrap()
            .contains(&serde_json::json!("health"))
    );

    assert!(serde_json::from_value::<qd_api_types::EffectInput>(serde_json::json!({"name":"Effect","timingType":"instant","effectType":"damage","unknown":1})).is_err());
}

#[test]
fn battle_state_schema_accepts_every_reference_engine_state() {
    for line in include_str!("../../../fixtures/engine-parity/battles.jsonl").lines() {
        let fixture: serde_json::Value = serde_json::from_str(line).unwrap();
        let mut states = fixture["expected"]["batches"].as_array().unwrap().clone();
        states.push(fixture["expected"]["initial"].clone());
        for state in states {
            let parsed = serde_json::from_value::<qd_api_types::BattleState>(state);
            assert!(parsed.is_ok(), "{}: {:?}", fixture["name"], parsed.err());
        }
    }
}
