use crate::operations::{Operation, Plan, apply_damage};
use serde_json::{Value, json};
use std::collections::HashSet;

pub(crate) const ROWS: [&str; 4] = ["tank", "melee", "ranged", "support"];
pub(crate) const STATS: [&str; 9] = [
    "health",
    "mana",
    "meleeDmg",
    "rangedDmg",
    "manaRegen",
    "spellDmg",
    "speed",
    "dodge",
    "criticalChance",
];
pub(crate) const ITEM_STATS: [usize; 7] = [1, 2, 3, 4, 5, 7, 8];
pub(crate) fn number(v: &Value, key: &str) -> f64 {
    v[key].as_f64().unwrap_or(0.0)
}
pub(crate) fn string<'a>(v: &'a Value, key: &str) -> &'a str {
    v[key].as_str().unwrap_or("")
}
pub(crate) fn name(v: &Value) -> &str {
    v["name"].as_str().unwrap_or("Effect")
}
pub(crate) fn array(v: &Value, key: &str) -> Vec<Value> {
    v[key].as_array().cloned().unwrap_or_default()
}
pub(crate) fn optional_number(v: &Value, key: &str, default: f64) -> f64 {
    v[key].as_f64().unwrap_or(default)
}
pub(crate) fn nn(v: f64) -> f64 {
    if v.is_finite() { v.max(0.0) } else { 0.0 }
}
pub(crate) fn js_round(v: f64) -> f64 {
    let floor = v.floor();
    if v - floor >= 0.5 { floor + 1.0 } else { floor }
}
pub(crate) fn modified_damage(base: f64, crit: f64, dodge: f64) -> f64 {
    js_round(base * (1.0 + crit / 100.0) * (1.0 - dodge / 100.0))
}
pub(crate) fn js_number(v: f64) -> String {
    if v == 0.0 {
        return "0".into();
    }
    if v.abs() >= 1e21 || v.abs() < 1e-6 {
        let text = format!("{v:e}");
        let (m, e) = text.split_once('e').unwrap();
        let e: i32 = e.parse().unwrap();
        format!("{m}e{}{e}", if e >= 0 { "+" } else { "" })
    } else {
        v.to_string()
    }
}
fn js_whitespace(c: char) -> bool {
    matches!(c,'\u{0009}'..='\u{000d}'|'\u{0020}'|'\u{00a0}'|'\u{1680}'|'\u{2000}'..='\u{200a}'|'\u{2028}'|'\u{2029}'|'\u{202f}'|'\u{205f}'|'\u{3000}'|'\u{feff}')
}
pub(crate) fn canonical_seed(seed: &Value) -> Result<String, EngineError> {
    if let Some(v) = seed.as_str() {
        let v = v.trim_matches(js_whitespace);
        if v.is_empty() {
            return Err(EngineError("Battle seed must not be blank.".into()));
        }
        return Ok(v.into());
    }
    if let Some(v) = seed.as_f64().filter(|n| n.is_finite()) {
        return Ok(js_number(v));
    }
    Err(EngineError(
        "Battle seed must be a finite number or non-blank string.".into(),
    ))
}
#[derive(Clone)]
pub(crate) struct Random(u32);
impl Random {
    fn new(seed: &Value) -> Result<Self, EngineError> {
        let mut h = 0x811c9dc5u32;
        for c in canonical_seed(seed)?.encode_utf16() {
            h = (h ^ u32::from(c)).wrapping_mul(0x01000193);
        }
        Ok(Self(h))
    }
    pub(crate) fn next(&mut self) -> f64 {
        self.0 = self.0.wrapping_add(0x6d2b79f5);
        let t = self.0;
        let mut n = (t ^ (t >> 15)).wrapping_mul(t | 1);
        n ^= n.wrapping_add((n ^ (n >> 7)).wrapping_mul(n | 61));
        f64::from(n ^ (n >> 14)) / 4294967296.0
    }
}
pub fn random_sequence(seed: &Value, count: usize) -> Result<Vec<f64>, EngineError> {
    let mut rng = Random::new(seed)?;
    Ok((0..count).map(|_| rng.next()).collect())
}
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EngineError(pub String);
impl std::fmt::Display for EngineError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_str(&self.0)
    }
}
impl std::error::Error for EngineError {}

#[derive(Clone)]
pub(crate) struct Unit {
    pub id: String,
    pub scenario: usize,
    pub scenario_id: String,
    pub row: usize,
    pub slot: usize,
    pub name: String,
    pub template_id: Option<Value>,
    pub base: [f64; 9],
    pub base_json: Value,
    pub bonuses: [f64; 9],
    pub health: f64,
    pub mana: f64,
    pub bar: f64,
    pub items: Vec<Value>,
    pub scope: String,
    pub priority: String,
    pub count: usize,
    pub shape: String,
    pub effects: Vec<Value>,
    pub shields: Vec<Value>,
    pub acted: usize,
}
impl Unit {
    pub(crate) fn stats(&self) -> [f64; 9] {
        let mut stats = self.base;
        // Keep the original addition order; summing the item bonuses first can
        // change floating point rounding at the boundary of an action batch.
        for item in &self.items {
            for i in ITEM_STATS {
                stats[i] += number(item, STATS[i]);
            }
        }
        for effect in &self.effects {
            if let Some(i) = STATS.iter().position(|s| *s == string(effect, "statKey")) {
                stats[i] += number(effect, "value");
            }
        }
        stats.map(|v| v.max(0.0))
    }
    pub(crate) fn speed(&self) -> f64 {
        self.stats()[6].max(1.0)
    }
    pub(crate) fn json(&self) -> Value {
        let bonuses: serde_json::Map<String, Value> = STATS
            .iter()
            .zip(self.bonuses)
            .map(|(s, n)| (s.to_string(), json!(n)))
            .collect();
        let mut v = json!({"instanceId":self.id,"scenarioId":self.scenario_id,"rowType":ROWS[self.row],"slot":self.slot,"name":self.name,"baseStats":self.base_json,"itemBonusStats":bonuses,"currentHealth":self.health,"mana":self.mana,"actionBar":self.bar,"items":self.items,"targetScope":self.scope,"targetPriority":self.priority,"targetCount":self.count,"selectionShape":self.shape,"activeEffects":self.effects,"shieldLayers":self.shields,"actedCount":self.acted});
        if let Some(id) = &self.template_id {
            v["templateId"] = id.clone();
        }
        v
    }
}
#[derive(Clone)]
pub struct BattleEngine {
    pub(crate) units: Vec<Unit>,
    pub(crate) scenarios: Vec<Value>,
    pub(crate) actions: usize,
    pub(crate) batch: usize,
    pub(crate) finished: bool,
    pub(crate) winner: Option<String>,
    pub(crate) log: Vec<Value>,
    pub(crate) threshold: f64,
    pub(crate) fatigue: f64,
    pub(crate) rng: Random,
    pub(crate) effect_counter: usize,
    pub(crate) operations: Vec<Operation>,
}
impl BattleEngine {
    pub fn new(input: Value, options: Value) -> Result<Self, EngineError> {
        crate::validation::validate(&input)?;
        let scenarios = array(&input, "scenarios");
        let mut units = vec![];
        for (si, s) in scenarios.iter().enumerate() {
            let sid = string(s, "id");
            for (row, row_name) in ROWS.iter().enumerate() {
                for (slot, u) in array(&s["rows"], row_name).iter().enumerate() {
                    let mut items = vec![];
                    let mut bonuses = [0.0; 9];
                    for item in array(u, "items") {
                        let mut normalized = json!({"name":item["name"]});
                        for key in [
                            "mana",
                            "meleeDmg",
                            "rangedDmg",
                            "manaRegen",
                            "spellDmg",
                            "dodge",
                            "criticalChance",
                            "activationManaCost",
                            "activationHealthCost",
                        ] {
                            normalized[key] = json!(number(&item, key));
                        }
                        for key in ["id", "allowedRowTypes"] {
                            if let Some(v) = item.get(key) {
                                normalized[key] = v.clone();
                            }
                        }
                        let mut effects = array(&item, "effects");
                        effects.sort_by(|a, b| {
                            number(a, "sequenceOrder").total_cmp(&number(b, "sequenceOrder"))
                        });
                        normalized["effects"] = json!(effects);
                        for i in ITEM_STATS {
                            bonuses[i] += number(&normalized, STATS[i]);
                        }
                        items.push(normalized);
                    }
                    let base = STATS.map(|key| number(&u["stats"], key));
                    units.push(Unit {
                        id: format!("{sid}:{row_name}:{}", slot + 1),
                        scenario: si,
                        scenario_id: sid.into(),
                        row,
                        slot: slot + 1,
                        name: string(u, "name").into(),
                        template_id: u.get("id").cloned(),
                        base,
                        base_json: u["stats"].clone(),
                        bonuses,
                        health: optional_number(u, "currentHealth", base[0]),
                        mana: (base[1] + bonuses[1]).max(0.0),
                        bar: number(u, "startingActionBar"),
                        items,
                        scope: u["targetScope"].as_str().unwrap_or("enemies").into(),
                        priority: u["targetPriority"]
                            .as_str()
                            .unwrap_or("highest_health")
                            .into(),
                        count: optional_number(u, "targetCount", 1.0) as usize,
                        shape: u["selectionShape"].as_str().unwrap_or("individual").into(),
                        effects: vec![],
                        shields: vec![],
                        acted: 0,
                    });
                }
            }
        }
        let mut state = Self {
            units,
            scenarios,
            actions: 0,
            batch: 0,
            finished: false,
            winner: None,
            log: vec![],
            threshold: optional_number(&options, "fatigueActionThreshold", 500.0),
            fatigue: optional_number(&options, "fatigueDamageStart", 1.0),
            rng: Random::new(&input["seed"])?,
            effect_counter: 0,
            operations: vec![],
        };
        state.maybe_finish(false);
        Ok(state)
    }
    pub fn get_state(&self) -> Value {
        let scenarios: Vec<Value> = self
            .scenarios
            .iter()
            .enumerate()
            .map(|(i, s)| {
                let mut rows = json!({});
                for (row, key) in ROWS.iter().enumerate() {
                    rows[*key] = json!(
                        self.units
                            .iter()
                            .filter(|u| u.scenario == i && u.row == row)
                            .map(Unit::json)
                            .collect::<Vec<_>>()
                    );
                }
                let mut v = json!({"id":s["id"],"rows":rows});
                if let Some(name) = s.get("name") {
                    v["name"] = name.clone();
                }
                v
            })
            .collect();
        json!({"actionCount":self.actions,"batchCount":self.batch,"status":if self.finished{"finished"}else{"active"},"winnerId":self.winner,"scenarios":scenarios,"log":self.log,"fatigueActionThreshold":self.threshold,"fatigueDamageStart":self.fatigue})
    }
    pub(crate) fn effect_id(&mut self) -> String {
        self.effect_counter += 1;
        format!("active-effect-{}", self.effect_counter)
    }
    pub(crate) fn index(&self, id: &str) -> Option<usize> {
        self.units.iter().position(|u| u.id == id)
    }
    fn determine_winner(&self) -> Option<Option<String>> {
        let alive = [0, 1].map(|i| self.units.iter().any(|u| u.scenario == i && u.health > 0.0));
        match alive {
            [true, true] => None,
            [false, false] => Some(None),
            [true, false] => Some(Some(string(&self.scenarios[0], "id").into())),
            [false, true] => Some(Some(string(&self.scenarios[1], "id").into())),
        }
    }
    fn maybe_finish(&mut self, limit: bool) {
        if let Some(winner) = self.determine_winner() {
            self.finished = true;
            self.winner = winner.clone();
            if self.log.last().map(|e| string(e, "type")) != Some("battle-end") {
                let outcome = winner.as_deref().unwrap_or("draw");
                self.log.push(json!({"batchNumber":self.batch,"type":"battle-end","outcome":outcome,"winnerId":winner,"message":format!("Battle ends{}: {outcome}",if limit{" at the action limit"}else{""})}));
            }
        }
    }
    pub fn resolve_next_batch(&mut self) -> Value {
        if self.finished {
            return self.get_state();
        }
        let living: Vec<usize> = (0..self.units.len())
            .filter(|i| self.units[*i].health > 0.0)
            .collect();
        let progress = living
            .iter()
            .map(|i| (100.0 - self.units[*i].bar).max(0.0) / self.units[*i].speed())
            .fold(f64::INFINITY, f64::min);
        for i in living.iter().copied() {
            self.units[i].bar = (self.units[i].bar + self.units[i].speed() * progress).min(100.0);
        }
        let mut ready: Vec<usize> = living
            .into_iter()
            .filter(|i| self.units[*i].bar >= 100.0 - 1e-9)
            .collect();
        ready.sort_by(|a, b| {
            self.units[*b]
                .speed()
                .total_cmp(&self.units[*a].speed())
                .then(a.cmp(b))
        });
        self.batch += 1;
        let survivors = self.process_pre_action(&ready);
        for i in &survivors {
            let stats = self.units[*i].stats();
            self.units[*i].mana = stats[1].min(self.units[*i].mana + stats[4]);
        }
        let eligible: HashSet<String> = self
            .units
            .iter()
            .flat_map(|u| &u.effects)
            .filter(|e| e.get("actionsRemaining").is_some())
            .map(|e| string(e, "id").into())
            .collect();
        let snapshot = self.clone();
        let mut plans = vec![];
        for i in survivors {
            let mut planning = snapshot.clone();
            planning.rng = self.rng.clone();
            planning.effect_counter = self.effect_counter;
            planning.operations.clear();
            planning.log.clear();
            planning.resolve_action(i);
            self.rng = planning.rng;
            self.effect_counter = planning.effect_counter;
            plans.push(Plan {
                actor: i,
                operations: planning.operations,
                log: planning.log,
            });
        }
        self.commit(&plans);
        let actors: Vec<usize> = plans.iter().map(|p| p.actor).collect();
        for i in &actors {
            self.units[*i].acted += 1;
        }
        self.actions += actors.len();
        self.complete_effects(&actors, &eligible);
        for i in ready {
            self.units[i].bar = 0.0;
        }
        let before = self.determine_winner();
        let mut damage = 0.0;
        for ordinal in (self.actions - actors.len() + 1)..=self.actions {
            if ordinal as f64 > self.threshold {
                damage += self.fatigue + ordinal as f64 - self.threshold - 1.0;
            }
        }
        if damage != 0.0 {
            let survivors: Vec<usize> = (0..self.units.len())
                .filter(|i| self.units[*i].health > 0.0)
                .collect();
            for i in &survivors {
                apply_damage(&mut self.units[*i], damage, false);
            }
            for i in survivors {
                let unit = &self.units[i];
                self.log.push(json!({"batchNumber":self.batch,"type":"fatigue","target":unit.name,"targetId":unit.id,"damage":damage,"origin":{"kind":"fatigue"},"message":format!("Fatigue hits {} for {} damage",unit.name,js_number(damage))}));
                if self.units[i].health == 0.0 {
                    self.log_death(i, Some(json!({"kind":"fatigue"})));
                }
            }
        }
        let after = self.determine_winner();
        self.maybe_finish(before.is_none() || before != after);
        self.get_state()
    }
    pub fn resolve(&mut self) -> Value {
        while !self.finished {
            self.resolve_next_batch();
        }
        json!({"winnerId":self.winner,"actionsResolved":self.actions,"finalState":self.get_state(),"log":self.log})
    }
    pub(crate) fn log_death(&mut self, i: usize, origin: Option<Value>) {
        let u = &self.units[i];
        let mut v = json!({"batchNumber":self.batch,"type":"death","unit":u.name,"unitId":u.id,"message":format!("{} dies",u.name)});
        if let Some(o) = origin {
            v["origin"] = o;
        }
        self.log.push(v);
    }
    pub(crate) fn log_health(
        &mut self,
        source: usize,
        target: usize,
        amount: f64,
        healing: bool,
        origin: &Value,
        action: bool,
    ) {
        let s = &self.units[source];
        let t = &self.units[target];
        let mut log = json!({"batchNumber":self.batch,"type":if healing{"heal"}else{"damage"},"source":s.name,"sourceId":s.id,"target":t.name,"targetId":t.id,"origin":origin,"message":if healing{format!("{} heals {} for {}",s.name,t.name,js_number(amount))}else{format!("{} hits {} for {} damage",s.name,t.name,js_number(amount))}});
        log[if healing { "amount" } else { "damage" }] = json!(amount);
        if action && let Some(id) = origin.get("actionId") {
            log["actionId"] = id.clone();
        }
        self.log.push(log);
    }
}

impl Default for BattleEngine {
    fn default() -> Self {
        let scenarios: Vec<Value> = ["A", "B"]
            .iter()
            .map(|id| {
                json!({"id":id,"rows":{"tank":[{"name":format!("Default {id}"),"stats":{
                    "health":100,"mana":100,"meleeDmg":10,"rangedDmg":0,
                    "manaRegen":0,"spellDmg":0,"speed":10,"dodge":0,"criticalChance":0
                }}]}})
            })
            .collect();
        Self::new(json!({"scenarios":scenarios,"seed":0}), json!({}))
            .expect("the built-in default battle is valid")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ecmascript_rounding_uses_ties_toward_positive_infinity() {
        for (input, expected) in [
            (-2.5, -2.0),
            (-1.5, -1.0),
            (-0.5, 0.0),
            (0.49999999999999994, 0.0),
            (0.5, 1.0),
            (1.5, 2.0),
        ] {
            assert_eq!(js_round(input), expected);
        }
    }

    #[test]
    fn critical_and_dodge_modifiers_compose_multiplicatively() {
        assert_eq!(modified_damage(20.0, 50.0, 20.0), 24.0);
        // Basic attack logs preserve signed damage even though applying health
        // damage clamps negative values; direct effect logs clamp it as well.
        assert_eq!(modified_damage(20.0, 0.0, 150.0), -10.0);
    }

    #[test]
    fn canonical_seed_uses_javascript_number_formatting() {
        for (value, expected) in [
            (0.0, "0"),
            (-0.0, "0"),
            (1e21, "1e+21"),
            (1e20, "100000000000000000000"),
            (1e-6, "0.000001"),
            (1e-7, "1e-7"),
        ] {
            assert_eq!(js_number(value), expected);
        }
    }
}
