use std::collections::HashSet;

use qd_api_types::{
    EffectCategory, EffectInput, EffectTimingType, ItemInput, RowType, ScenarioInput, UnitInput,
};
use uuid::Uuid;

fn name(value: &str) -> Result<(), String> {
    if value.trim().is_empty() {
        Err("Name is required.".into())
    } else {
        Ok(())
    }
}

fn valid_ids(ids: &[String]) -> Result<(), String> {
    if ids.iter().all(|id| Uuid::parse_str(id).is_ok()) {
        Ok(())
    } else {
        Err("Linked IDs must be valid UUIDs.".into())
    }
}

fn positive_integer(value: Option<f64>) -> bool {
    value.is_some_and(|value| value.is_finite() && value > 0.0 && value.fract() == 0.0)
}

fn requires_action_duration(input: &EffectInput) -> bool {
    let duration_stat = [
        input.health,
        input.mana,
        input.melee_dmg,
        input.ranged_dmg,
        input.mana_regen,
        input.spell_dmg,
        input.speed,
        input.dodge,
        input.critical_chance,
    ]
    .into_iter()
    .any(|value| value.is_some())
        || input.shield.is_some_and(|value| value > 0.0);
    !input.is_taunt
        && matches!(input.timing_type, EffectTimingType::Instant)
        && matches!(
            input.effect_type,
            EffectCategory::Buff | EffectCategory::Debuff
        )
        && duration_stat
}

pub fn validate_effect(input: &EffectInput) -> Result<(), String> {
    name(&input.name)?;
    for value in [
        input.trigger_every_actions,
        input.trigger_count,
        input.lasts_for_actions,
        input.health,
        input.mana,
        input.melee_dmg,
        input.ranged_dmg,
        input.mana_regen,
        input.spell_dmg,
        input.speed,
        input.dodge,
        input.critical_chance,
        input.shield,
        input.direct_healing,
        input.direct_melee_dmg,
        input.direct_ranged_dmg,
        input.direct_spell_dmg,
    ] {
        if value.is_some_and(|number| !number.is_finite()) {
            return Err("Numeric fields must be finite.".into());
        }
    }
    for value in [
        input.trigger_every_actions,
        input.trigger_count,
        input.lasts_for_actions,
    ] {
        if value.is_some() && !positive_integer(value) {
            return Err("Timing values must be positive integers.".into());
        }
    }
    if input.shield.is_some_and(|value| value < 0.0)
        || [
            input.direct_healing,
            input.direct_melee_dmg,
            input.direct_ranged_dmg,
            input.direct_spell_dmg,
        ]
        .into_iter()
        .any(|value| value.is_some_and(|number| number < 0.0))
    {
        return Err("Shield and direct/instant values must be non-negative.".into());
    }
    if input.shield.is_some_and(|value| value > 0.0)
        && (!matches!(input.timing_type, EffectTimingType::Instant)
            || !matches!(
                input.effect_type,
                EffectCategory::Buff | EffectCategory::Debuff
            ))
    {
        return Err("Shield is only supported for instant buffs and debuffs.".into());
    }
    if input.is_taunt && matches!(input.timing_type, EffectTimingType::Interval) {
        return Err("Taunt effects must use instant timing.".into());
    }
    if matches!(input.timing_type, EffectTimingType::Interval) {
        if !positive_integer(input.trigger_every_actions) {
            return Err("Trigger every actions is required for interval timing.".into());
        }
        if !positive_integer(input.trigger_count) {
            return Err("Trigger count is required for interval timing.".into());
        }
    }
    if requires_action_duration(input) && !positive_integer(input.lasts_for_actions) {
        return Err("Lasts for actions is required for stat buffs and debuffs.".into());
    }
    Ok(())
}

pub fn validate_item(input: &ItemInput) -> Result<(), String> {
    name(&input.name)?;
    for value in [
        input.mana,
        input.melee_dmg,
        input.ranged_dmg,
        input.mana_regen,
        input.spell_dmg,
        input.dodge,
        input.critical_chance,
        input.activation_mana_cost,
        input.activation_health_cost,
    ] {
        if !value.is_finite() {
            return Err("Numeric fields must be finite.".into());
        }
    }
    if input.activation_mana_cost < 0.0 || input.activation_health_cost < 0.0 {
        return Err("Activation/activation health costs must be non-negative.".into());
    }
    let rows: Vec<&'static str> = input
        .allowed_row_types
        .iter()
        .map(|row| match row {
            RowType::Tank => "tank",
            RowType::Melee => "melee",
            RowType::Ranged => "ranged",
            RowType::Support => "support",
        })
        .collect();
    if rows.iter().collect::<HashSet<_>>().len() != rows.len() {
        return Err("Allowed row types must not contain duplicates.".into());
    }
    valid_ids(&input.effect_ids)
}

pub fn validate_unit(input: &UnitInput) -> Result<(), String> {
    name(&input.name)?;
    for value in [
        input.health,
        input.mana,
        input.melee_dmg,
        input.ranged_dmg,
        input.mana_regen,
        input.spell_dmg,
        input.speed,
        input.dodge,
        input.critical_chance,
    ] {
        if !value.is_finite() {
            return Err("Numeric fields must be finite.".into());
        }
    }
    if input.mana < 0.0 {
        return Err("Mana must be non-negative.".into());
    }
    if input.target_count < 1 {
        return Err("Target count must be at least 1.".into());
    }
    valid_ids(&input.item_ids)
}

pub fn validate_scenario(input: &ScenarioInput) -> Result<(), String> {
    name(&input.name)?;
    let rows: Vec<&'static str> = input
        .rows
        .iter()
        .map(|row| match row.row_type {
            RowType::Tank => "tank",
            RowType::Melee => "melee",
            RowType::Ranged => "ranged",
            RowType::Support => "support",
        })
        .collect();
    if rows.len() != 4
        || ["ranged", "support", "melee", "tank"]
            .into_iter()
            .any(|required| rows.iter().filter(|row| **row == required).count() != 1)
    {
        return Err("Rows must include ranged, support, melee, and tank exactly once.".into());
    }
    for row in &input.rows {
        valid_ids(&row.unit_ids)?;
    }
    Ok(())
}

pub(crate) fn needs_timing_configuration(input: &EffectInput) -> bool {
    matches!(input.timing_type, EffectTimingType::Interval)
        && (input.trigger_every_actions.is_none() || input.trigger_count.is_none())
        || requires_action_duration(input) && input.lasts_for_actions.is_none()
}

pub(crate) fn normalize_effect(input: &mut EffectInput) {
    input.name = input.name.trim().into();
    if matches!(input.timing_type, EffectTimingType::Instant) {
        input.trigger_every_actions = None;
        input.trigger_count = None;
    }
    if !(input.is_taunt || requires_action_duration(input)) {
        input.lasts_for_actions = None;
    }
}

/// Legacy API normalizes missing rows to empty and uses the last duplicate row.
pub(crate) fn normalize_scenario(input: &mut ScenarioInput) {
    use qd_api_types::ScenarioRowInput;
    input.name = input.name.trim().into();
    input.rows = [
        RowType::Ranged,
        RowType::Support,
        RowType::Melee,
        RowType::Tank,
    ]
    .into_iter()
    .map(|kind| {
        input
            .rows
            .iter()
            .rev()
            .find(|row| std::mem::discriminant(&row.row_type) == std::mem::discriminant(&kind))
            .cloned()
            .unwrap_or(ScenarioRowInput {
                row_type: kind,
                unit_ids: vec![],
            })
    })
    .collect();
}
