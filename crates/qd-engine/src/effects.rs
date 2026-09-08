use crate::model::*;
use crate::operations::{Operation, apply_damage, apply_healing};
use serde_json::{Value, json};
use std::collections::HashSet;

#[derive(Clone)]
struct IntervalEvent {
    target: usize,
    source: usize,
    effect: Value,
    amount: f64,
    healing: bool,
}
impl BattleEngine {
    fn active_effect(
        &mut self,
        caster: usize,
        target: usize,
        effect: &Value,
        origin: &Value,
        value: f64,
    ) -> Value {
        let id = self.effect_id();
        let c = &self.units[caster];
        let t = &self.units[target];
        json!({"id":id,"name":name(effect),"sourceUnitId":c.id,"sourceScenarioId":c.scenario_id,"targetUnitId":t.id,"effectType":effect["effectType"],"timingType":effect["timingType"],"value":value,"origin":origin})
    }
    fn add_effect(&mut self, target: usize, effect: Value) {
        self.operations.push(Operation::AddEffect {
            target,
            effect: effect.clone(),
        });
        self.units[target].effects.push(effect);
    }
    pub(crate) fn apply_item(
        &mut self,
        caster: usize,
        item: &Value,
        targets: &[usize],
        origin: &Value,
    ) {
        let effects = array(item, "effects");
        let target_names: Vec<String> = targets
            .iter()
            .map(|i| self.units[*i].name.clone())
            .collect();
        let target_ids: Vec<String> = targets.iter().map(|i| self.units[*i].id.clone()).collect();
        let names: Vec<String> = effects
            .iter()
            .map(|seq| name(&seq["effect"]).to_string())
            .collect();
        self.log.push(json!({"batchNumber":self.batch,"type":"item-activation","caster":self.units[caster].name,"casterId":self.units[caster].id,"item":item["name"],"targets":target_names,"targetIds":target_ids,"effects":names,"actionId":origin["actionId"],"origin":origin,"message":format!("{} activates {} on {}",self.units[caster].name,string(item,"name"),target_names.join(", "))}));
        for (position, seq) in effects.iter().enumerate() {
            let living: Vec<usize> = targets
                .iter()
                .copied()
                .filter(|i| self.units[*i].health > 0.0)
                .collect();
            if living.is_empty() {
                break;
            }
            let effect = &seq["effect"];
            let mut effect_ref = json!({"name":name(effect),"position":position+1});
            if let Some(id) = effect.get("id") {
                effect_ref["id"] = id.clone();
            }
            let mut origin = origin.clone();
            origin["effect"] = effect_ref;
            for target in living {
                if string(effect, "timingType") == "interval" {
                    self.queue_interval(caster, target, effect, &origin);
                } else {
                    self.apply_instant(caster, target, effect, &origin);
                }
            }
        }
    }
    fn queue_interval(&mut self, caster: usize, target: usize, effect: &Value, origin: &Value) {
        let healing = string(effect, "effectType") == "healing";
        let values: Vec<f64> = if healing {
            effect["directHealing"]
                .as_f64()
                .or_else(|| effect["directSpellDmg"].as_f64())
                .into_iter()
                .collect()
        } else {
            ["directMeleeDmg", "directRangedDmg", "directSpellDmg"]
                .iter()
                .filter_map(|key| effect[*key].as_f64())
                .collect()
        };
        for value in values {
            let mut active = self.active_effect(caster, target, effect, origin, nn(value));
            active["remainingTriggers"] = json!(number(effect, "triggerCount"));
            active["actionsUntilTrigger"] = json!(number(effect, "triggerEveryActions"));
            active["triggerEveryActions"] = json!(number(effect, "triggerEveryActions"));
            active["bypassesShield"] = json!(effect["bypassesShield"] == true);
            self.add_effect(target, active);
        }
    }
    fn apply_instant(&mut self, caster: usize, target: usize, effect: &Value, origin: &Value) {
        let caster_stats = self.units[caster].stats();
        let target_stats = self.units[target].stats();
        let maximum = target_stats[0];
        let category = string(effect, "effectType");
        let modifier = category == "buff" || category == "debuff";
        let shield = nn(number(effect, "shield"));
        let mut timed_id = None;
        if shield > 0.0 && modifier && effect["lastsForActions"].is_number() {
            let mut active = self.active_effect(caster, target, effect, origin, 0.0);
            active["actionsRemaining"] = effect["lastsForActions"].clone();
            timed_id = Some(string(&active, "id").to_string());
            self.add_effect(target, active);
        }
        if shield > 0.0 {
            let id = timed_id.clone().unwrap_or_else(|| self.effect_id());
            let mut layer = json!({"id":format!("shield-{id}"),"remaining":shield});
            if let Some(id) = timed_id {
                layer["activeEffectId"] = json!(id);
            }
            self.operations.push(Operation::GrantShield {
                target,
                layer: layer.clone(),
            });
            self.units[target].shields.push(layer);
        }
        if let Some(amount) = effect["directHealing"].as_f64() {
            let amount = nn(amount);
            self.operations.push(Operation::Healing { target, amount });
            apply_healing(&mut self.units[target], amount, maximum);
            self.log_health(caster, target, amount, true, origin, true);
        }
        if let Some(damage) = ["directMeleeDmg", "directRangedDmg", "directSpellDmg"]
            .iter()
            .find_map(|key| effect[*key].as_f64())
        {
            let amount = nn(modified_damage(
                nn(damage),
                caster_stats[8],
                target_stats[7],
            ));
            let bypass = effect["bypassesShield"] == true;
            self.operations.push(Operation::Damage {
                target,
                amount,
                bypass,
            });
            apply_damage(&mut self.units[target], amount, bypass);
            self.log_health(caster, target, amount, false, origin, true);
        }
        if category == "healing"
            && let Some(amount) = effect["health"].as_f64()
        {
            let amount = nn(amount);
            self.operations.push(Operation::Healing { target, amount });
            apply_healing(&mut self.units[target], amount, maximum);
            self.log_health(caster, target, amount, true, origin, true);
        }
        let taunt = effect["isTaunt"] == true;
        let persistent = taunt && effect["lastsForActions"].is_null();
        if taunt {
            let mut active = self.active_effect(caster, target, effect, origin, 0.0);
            active["isTaunt"] = json!(true);
            if !persistent {
                active["actionsRemaining"] = effect["lastsForActions"].clone();
            }
            self.add_effect(target, active);
        }
        if modifier {
            let old_mana = self.units[target].stats()[1];
            for key in STATS {
                if let Some(value) = effect[key].as_f64() {
                    let value = if category == "debuff" && value > 0.0 {
                        -value
                    } else {
                        value
                    };
                    let mut active = self.active_effect(caster, target, effect, origin, value);
                    active["statKey"] = json!(key);
                    if !persistent {
                        active["actionsRemaining"] = json!(number(effect, "lastsForActions"));
                    }
                    let mut log = json!({"batchNumber":self.batch,"type":"effect-apply","target":self.units[target].name,"targetId":self.units[target].id,"effect":name(effect),"stat":key,"value":value,"actionId":origin["actionId"],"origin":origin,"message":format!("{} gains {} ({key} modified)",self.units[target].name,name(effect))});
                    if let Some(duration) = active.get("actionsRemaining") {
                        log["actionsRemaining"] = duration.clone();
                    }
                    self.log.push(log);
                    self.add_effect(target, active);
                }
            }
            let stats = self.units[target].stats();
            let unit = &mut self.units[target];
            unit.health = unit.health.max(0.0).min(stats[0]);
            unit.mana = stats[1].min((unit.mana + stats[1] - old_mana).max(0.0));
        }
    }
    pub(crate) fn process_pre_action(&mut self, ready: &[usize]) -> Vec<usize> {
        let mut snapshot: Vec<(usize, usize)> = vec![];
        for target in ready {
            for (ei, e) in self.units[*target].effects.iter().enumerate() {
                if string(e, "timingType") == "interval" {
                    snapshot.push((*target, ei));
                }
            }
        }
        let mut expired: HashSet<String> = HashSet::new();
        let mut events = vec![];
        for (target, ei) in &snapshot {
            let effect = self.units[*target].effects[*ei].clone();
            let id = string(&effect, "id");
            if self.units[*target].health <= 0.0 || number(&effect, "remainingTriggers") <= 0.0 {
                expired.insert(id.into());
                continue;
            }
            let until = number(&effect, "actionsUntilTrigger") - 1.0;
            self.units[*target].effects[*ei]["actionsUntilTrigger"] = json!(until);
            if until > 0.0 {
                continue;
            }
            let Some(source) = self.index(string(&effect, "sourceUnitId")) else {
                expired.insert(id.into());
                continue;
            };
            let healing = string(&effect, "effectType") == "healing";
            let amount = nn(if healing {
                number(&effect, "value")
            } else {
                modified_damage(
                    nn(number(&effect, "value")),
                    self.units[source].stats()[8],
                    self.units[*target].stats()[7],
                )
            });
            events.push(IntervalEvent {
                target: *target,
                source,
                effect: effect.clone(),
                amount,
                healing,
            });
            let remaining = number(&effect, "remainingTriggers") - 1.0;
            self.units[*target].effects[*ei]["remainingTriggers"] = json!(remaining);
            if remaining > 0.0 {
                self.units[*target].effects[*ei]["actionsUntilTrigger"] =
                    json!(number(&effect, "triggerEveryActions"));
            } else {
                expired.insert(id.into());
            }
        }
        let mut affected = vec![];
        for event in &events {
            if !affected.contains(&event.target) {
                affected.push(event.target);
            }
        }
        for target in &affected {
            let target_events: Vec<&IntervalEvent> =
                events.iter().filter(|e| e.target == *target).collect();
            let shielded = !self.units[*target].shields.is_empty()
                && target_events
                    .iter()
                    .any(|e| !e.healing && e.effect["bypassesShield"] != true && e.amount > 0.0);
            if shielded {
                for e in target_events {
                    if e.healing {
                        let maximum = self.units[*target].stats()[0];
                        apply_healing(&mut self.units[*target], e.amount, maximum);
                    } else {
                        apply_damage(
                            &mut self.units[*target],
                            e.amount,
                            e.effect["bypassesShield"] == true,
                        );
                    }
                }
            } else {
                let mut healing = 0.0;
                let mut damage = 0.0;
                for e in target_events {
                    if e.healing {
                        healing += e.amount;
                    } else {
                        damage += e.amount;
                    }
                }
                let maximum = self.units[*target].stats()[0];
                let u = &mut self.units[*target];
                u.health = (u.health + healing - damage).min(maximum).max(0.0);
            }
            if self.units[*target].health == 0.0 {
                for (ti, ei) in &snapshot {
                    if ti == target {
                        expired.insert(string(&self.units[*ti].effects[*ei], "id").into());
                    }
                }
            }
        }
        for event in &events {
            let origin = event
                .effect
                .get("origin")
                .cloned()
                .unwrap_or_else(|| json!({"kind":"item-effect"}));
            self.log_health(
                event.source,
                event.target,
                event.amount,
                event.healing,
                &origin,
                false,
            );
        }
        for target in affected {
            if self.units[target].health == 0.0 {
                self.log_death(target, None);
            }
        }
        let mut missing_source_expired = vec![];
        for (target, ei) in snapshot {
            let effect = &self.units[target].effects[ei];
            if expired.contains(string(effect, "id"))
                && self.index(string(effect, "sourceUnitId")).is_none()
            {
                missing_source_expired.push((target, effect.clone()));
            }
        }
        for unit in &mut self.units {
            unit.effects.retain(|e| !expired.contains(string(e, "id")));
        }
        for (target, effect) in missing_source_expired {
            self.log_expiry(target, &effect, false);
        }
        ready
            .iter()
            .copied()
            .filter(|i| self.units[*i].health > 0.0)
            .collect()
    }
    fn log_expiry(&mut self, target: usize, effect: &Value, modifier: bool) {
        let u = &self.units[target];
        let mut log = json!({"batchNumber":self.batch,"type":"effect-expire","target":u.name,"targetId":u.id,"effect":effect["name"],"message":format!("{} expires on {}",name(effect),u.name)});
        if let Some(origin) = effect.get("origin") {
            log["origin"] = origin.clone();
        }
        if modifier {
            log["stat"] = effect["statKey"].clone();
            log["value"] = effect["value"].clone();
            log["actionsRemaining"] = json!(0);
        }
        self.log.push(log);
    }
    pub(crate) fn complete_effects(&mut self, actors: &[usize], eligible: &HashSet<String>) {
        for i in actors {
            let old_mana = self.units[*i].stats()[1];
            let mut expired = vec![];
            for effect in &mut self.units[*i].effects {
                if effect.get("actionsRemaining").is_some()
                    && eligible.contains(string(effect, "id"))
                {
                    let remaining = number(effect, "actionsRemaining") - 1.0;
                    effect["actionsRemaining"] = json!(remaining);
                    if remaining <= 0.0 {
                        expired.push(effect.clone());
                    }
                }
            }
            if expired.is_empty() {
                continue;
            }
            let ids: HashSet<String> = expired.iter().map(|e| string(e, "id").into()).collect();
            let unit = &mut self.units[*i];
            unit.effects.retain(|e| !ids.contains(string(e, "id")));
            unit.shields
                .retain(|l| !ids.contains(string(l, "activeEffectId")));
            let stats = unit.stats();
            unit.health = unit.health.max(0.0).min(stats[0]);
            unit.mana = stats[1].min((unit.mana + stats[1] - old_mana).max(0.0));
            for effect in expired {
                let modifier = effect["statKey"].is_string();
                self.log_expiry(*i, &effect, modifier);
            }
        }
    }
}
