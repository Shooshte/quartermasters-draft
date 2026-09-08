use qd_api_types::{EffectInput, ItemInput, ScenarioInput, UnitInput};
use qd_server::validation::{validate_effect, validate_item, validate_scenario, validate_unit};

fn decode<T: serde::de::DeserializeOwned>(value: serde_json::Value) -> T {
    serde_json::from_value(value).unwrap()
}

#[test]
fn validates_effect_timing_and_shield_rules() {
    let effect: EffectInput = decode(serde_json::json!({
        "name":"Shield rain", "timingType":"interval", "effectType":"buff",
        "triggerEveryActions":1, "triggerCount":2, "lastsForActions":null,
        "health":null,"mana":null,"meleeDmg":null,"rangedDmg":null,"manaRegen":null,
        "spellDmg":null,"speed":null,"dodge":null,"criticalChance":null,"shield":5,
        "directHealing":null,"directMeleeDmg":null,"directRangedDmg":null,"directSpellDmg":null
    }));
    assert_eq!(
        validate_effect(&effect).unwrap_err(),
        "Shield is only supported for instant buffs and debuffs."
    );
}

#[test]
fn rejects_duplicate_item_allowed_rows() {
    let item: ItemInput = decode(serde_json::json!({
        "name":"Sword","mana":0,"meleeDmg":1,"rangedDmg":0,"manaRegen":0,"spellDmg":0,
        "dodge":0,"criticalChance":0,"activationManaCost":0,"activationHealthCost":0,
        "effectIds":[],"allowedRowTypes":["melee","melee"]
    }));
    assert_eq!(
        validate_item(&item).unwrap_err(),
        "Allowed row types must not contain duplicates."
    );
}

#[test]
fn rejects_negative_unit_mana() {
    let unit: UnitInput = decode(serde_json::json!({
        "name":"Mage","health":10,"mana":-1,"meleeDmg":0,"rangedDmg":0,"manaRegen":1,
        "spellDmg":2,"speed":1,"dodge":0,"criticalChance":0,"targetScope":"enemies",
        "targetPriority":"highest_health","targetCount":1,"selectionShape":"individual","itemIds":[]
    }));
    assert_eq!(
        validate_unit(&unit).unwrap_err(),
        "Mana must be non-negative."
    );
}

#[test]
fn scenario_normalization_requires_each_fixed_row_once() {
    let scenario: ScenarioInput = decode(serde_json::json!({
        "name":"Broken","rows":[{"rowType":"tank","unitIds":[]}]
    }));
    assert_eq!(
        validate_scenario(&scenario).unwrap_err(),
        "Rows must include ranged, support, melee, and tank exactly once."
    );
}

#[test]
fn rejects_invalid_optional_timing_even_when_normalization_would_discard_it() {
    for field in ["triggerEveryActions", "triggerCount", "lastsForActions"] {
        for value in [0.0, -1.0, 1.5] {
            let mut input =
                serde_json::json!({"name":"Hit","timingType":"instant","effectType":"damage"});
            input[field] = serde_json::json!(value);
            let effect: EffectInput = decode(input);
            assert!(
                validate_effect(&effect).is_err(),
                "{field}={value} must fail before normalization"
            );
        }
    }
}

#[test]
fn effect_validation_handles_stat_zero_taunts_shields_and_direct_values() {
    for (patch, valid) in [
        (serde_json::json!({"health":0}), false),
        (serde_json::json!({"health":0,"lastsForActions":1}), true),
        (serde_json::json!({"shield":0}), true),
        (serde_json::json!({"shield":1}), false),
        (serde_json::json!({"shield":1,"lastsForActions":2}), true),
        (serde_json::json!({"health":10,"isTaunt":true}), true),
        (
            serde_json::json!({"timingType":"interval","triggerEveryActions":1,"triggerCount":2,"isTaunt":true}),
            false,
        ),
        (serde_json::json!({"directHealing":-1}), false),
        (serde_json::json!({"directHealing":0}), true),
    ] {
        let mut input =
            serde_json::json!({"name":"Buff","timingType":"instant","effectType":"buff"});
        input
            .as_object_mut()
            .unwrap()
            .extend(patch.as_object().unwrap().clone());
        assert_eq!(
            validate_effect(&decode(input.clone())).is_ok(),
            valid,
            "{input}"
        );
    }
}
