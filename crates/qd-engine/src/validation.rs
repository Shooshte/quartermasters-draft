use crate::model::*;
use serde_json::Value;
fn fail(message: impl Into<String>) -> Result<(), EngineError> {
    Err(EngineError(message.into()))
}
pub(crate) fn validate(input: &Value) -> Result<(), EngineError> {
    canonical_seed(&input["seed"])?;
    if input["scenarios"].as_array().map(Vec::len) != Some(2) {
        return fail("Battle initialization requires exactly two scenarios.");
    }
    let scenarios = array(input, "scenarios");
    let mut alive = false;
    for scenario in scenarios {
        if scenario["id"].as_str().is_none() {
            return fail("Scenario id must be a string.");
        }
        for row in ROWS {
            for unit in array(&scenario["rows"], row) {
                for (key, label, allowed) in [
                    (
                        "targetScope",
                        "target scope",
                        &[
                            "self",
                            "self_allies",
                            "self_enemies",
                            "allies",
                            "enemies",
                            "both",
                        ][..],
                    ),
                    (
                        "targetPriority",
                        "target priority",
                        &[
                            "highest_health",
                            "lowest_health",
                            "highest_damage",
                            "support",
                            "random",
                        ][..],
                    ),
                    (
                        "selectionShape",
                        "selection shape",
                        &["individual", "adjacent"][..],
                    ),
                ] {
                    if let Some(v) = unit.get(key)
                        && !v.as_str().is_some_and(|v| allowed.contains(&v))
                    {
                        let text = v
                            .as_str()
                            .map(str::to_owned)
                            .unwrap_or_else(|| v.to_string());
                        return fail(format!(
                            "Invalid {label} \"{text}\" for {}.",
                            string(&unit, "name")
                        ));
                    }
                }
                if let Some(count) = unit.get("targetCount")
                    && !count.as_f64().is_some_and(|n| n > 0.0 && n.fract() == 0.0)
                {
                    return fail("Target count must be a positive integer");
                }
                let items = array(&unit, "items");
                let mut allowed = ROWS.to_vec();
                for item in &items {
                    let row_values = array(item, "allowedRowTypes");
                    let item_rows: Vec<&str> = row_values
                        .iter()
                        .map(|v| v.as_str().unwrap_or(""))
                        .collect();
                    let unique: std::collections::HashSet<_> = item_rows.iter().collect();
                    if unique.len() != item_rows.len() {
                        return fail(format!(
                            "{} has duplicate allowed row types",
                            string(item, "name")
                        ));
                    }
                    if !item_rows.is_empty() {
                        allowed.retain(|r| item_rows.contains(r));
                    }
                }
                if allowed.is_empty() {
                    return fail(format!(
                        "{} has no shared allowed item rows",
                        string(&unit, "name")
                    ));
                }
                if !allowed.contains(&row) {
                    return fail(format!(
                        "{} cannot be deployed in {row}",
                        string(&unit, "name")
                    ));
                }
                for item in &items {
                    for sequence in array(item, "effects") {
                        let e = &sequence["effect"];
                        let timing = string(e, "timingType");
                        let category = string(e, "effectType");
                        let taunt = e["isTaunt"] == true;
                        let modifiers = STATS.iter().any(|key| !e[*key].is_null());
                        let shield = number(e, "shield") > 0.0;
                        if shield
                            && !(timing == "instant"
                                && (category == "buff" || category == "debuff"))
                        {
                            return fail(format!(
                                "Effect \"{}\" shield is only supported for instant buffs and debuffs.",
                                name(e)
                            ));
                        }
                        if taunt && timing == "interval" {
                            return fail(format!(
                                "Taunt effect \"{}\" must use instant timing.",
                                name(e)
                            ));
                        }
                        if taunt
                            && timing == "instant"
                            && !e["lastsForActions"].is_null()
                            && !e["lastsForActions"]
                                .as_f64()
                                .is_some_and(|n| n > 0.0 && n.fract() == 0.0)
                        {
                            return fail(format!(
                                "Taunt effect \"{}\" must have a positive duration.",
                                name(e)
                            ));
                        }
                        if (timing == "interval"
                            && (e["triggerEveryActions"].is_null() || e["triggerCount"].is_null()))
                            || (!taunt
                                && timing == "instant"
                                && (category == "buff" || category == "debuff")
                                && (modifiers || shield)
                                && e["lastsForActions"].is_null())
                        {
                            return fail(format!(
                                "Effect \"{}\" timing needs configuration.",
                                name(e)
                            ));
                        }
                    }
                }
                if optional_number(&unit, "currentHealth", number(&unit["stats"], "health")) > 0.0 {
                    alive = true;
                }
            }
        }
    }
    if !alive {
        return fail("Battle initialization requires at least one living unit.");
    }
    Ok(())
}
