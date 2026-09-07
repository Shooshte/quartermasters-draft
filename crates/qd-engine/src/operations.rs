use crate::model::*;
use serde_json::{Value, json};
#[derive(Clone)]
pub(crate) enum Operation {
    Damage {
        target: usize,
        amount: f64,
        bypass: bool,
    },
    Healing {
        target: usize,
        amount: f64,
    },
    HealthCost {
        target: usize,
        amount: f64,
    },
    ManaCost {
        target: usize,
        amount: f64,
    },
    AddEffect {
        target: usize,
        effect: Value,
    },
    GrantShield {
        target: usize,
        layer: Value,
    },
}
impl Operation {
    fn target(&self) -> usize {
        match self {
            Self::Damage { target, .. }
            | Self::Healing { target, .. }
            | Self::HealthCost { target, .. }
            | Self::ManaCost { target, .. }
            | Self::AddEffect { target, .. }
            | Self::GrantShield { target, .. } => *target,
        }
    }
}
pub(crate) struct Plan {
    pub actor: usize,
    pub operations: Vec<Operation>,
    pub log: Vec<Value>,
}
pub(crate) fn absorb(layers: &mut Vec<Value>, amount: f64) -> f64 {
    let mut remaining = nn(amount);
    for layer in layers.iter_mut() {
        let available = nn(number(layer, "remaining"));
        let absorbed = available.min(remaining);
        layer["remaining"] = json!(available - absorbed);
        remaining -= absorbed;
        if remaining == 0.0 {
            break;
        }
    }
    layers.retain(|layer| number(layer, "remaining") > 0.0);
    remaining
}
pub(crate) fn apply_damage(unit: &mut Unit, amount: f64, bypass: bool) -> f64 {
    let damage = if bypass {
        nn(amount)
    } else {
        absorb(&mut unit.shields, amount)
    };
    let health_damage = unit.health.min(damage);
    unit.health -= health_damage;
    health_damage
}
pub(crate) fn apply_healing(unit: &mut Unit, amount: f64, maximum: f64) {
    unit.health = (unit.health + nn(amount)).min(maximum).max(0.0);
}
impl BattleEngine {
    pub(crate) fn commit(&mut self, plans: &[Plan]) {
        // Vec preserves the operation insertion order of JavaScript's Set/Map.
        let mut targets = vec![];
        for plan in plans {
            for op in &plan.operations {
                let target = op.target();
                if !targets.contains(&target) {
                    targets.push(target);
                }
            }
        }
        let before: Vec<(usize, bool, f64)> = targets
            .iter()
            .map(|i| (*i, self.units[*i].health > 0.0, self.units[*i].stats()[1]))
            .collect();
        for plan in plans {
            for op in &plan.operations {
                if let Operation::AddEffect { target, effect } = op {
                    self.units[*target].effects.push(effect.clone());
                }
            }
        }
        for (target, _, old_mana) in &before {
            let ops: Vec<&Operation> = plans
                .iter()
                .flat_map(|p| &p.operations)
                .filter(|op| op.target() == *target)
                .collect();
            let shield_resolution=ops.iter().any(|op|matches!(op,Operation::GrantShield{layer,..} if nn(number(layer,"remaining"))>0.0)) || (!self.units[*target].shields.is_empty()&&ops.iter().any(|op|matches!(op,Operation::Damage{amount,bypass:false,..}|Operation::HealthCost{amount,..} if nn(*amount)>0.0)));
            let mut damage = 0.0;
            let mut healing = 0.0;
            let mut health_cost = 0.0;
            let mut mana_cost = 0.0;
            for op in &ops {
                match op {
                    Operation::Damage { amount, .. } => damage += nn(*amount),
                    Operation::Healing { amount, .. } => healing += nn(*amount),
                    Operation::HealthCost { amount, .. } => health_cost += nn(*amount),
                    Operation::ManaCost { amount, .. } => mana_cost += amount,
                    _ => {}
                }
            }
            let stats = self.units[*target].stats();
            if shield_resolution {
                let mut granted = vec![];
                let mut shieldable = 0.0;
                let mut after_own_grants = 0.0;
                let mut bypass_damage = 0.0;
                let mut total_healing = 0.0;
                for plan in plans {
                    let mut own_layers = vec![];
                    for op in &plan.operations {
                        if op.target() != *target {
                            continue;
                        }
                        match op {
                            Operation::Damage {
                                amount,
                                bypass: true,
                                ..
                            } => bypass_damage += nn(*amount),
                            Operation::Damage {
                                amount,
                                bypass: false,
                                ..
                            }
                            | Operation::HealthCost { amount, .. } => {
                                let amount = nn(*amount);
                                shieldable += amount;
                                after_own_grants += absorb(&mut own_layers, amount);
                            }
                            Operation::Healing { amount, .. } => total_healing += nn(*amount),
                            Operation::GrantShield { layer, .. }
                                if nn(number(layer, "remaining")) > 0.0 =>
                            {
                                granted.push(layer.clone());
                                own_layers.push(layer.clone());
                            }
                            _ => {}
                        }
                    }
                }
                let capacity: f64 = self.units[*target]
                    .shields
                    .iter()
                    .map(|l| nn(number(l, "remaining")))
                    .sum();
                let health_damage = (after_own_grants - capacity).max(0.0);
                let absorbed = shieldable - health_damage;
                let u = &mut self.units[*target];
                u.shields.extend(granted);
                absorb(&mut u.shields, absorbed);
                bypass_damage += health_damage;
                u.health = (u.health + total_healing - bypass_damage)
                    .min(stats[0])
                    .max(0.0);
            } else {
                let u = &mut self.units[*target];
                u.health = (u.health + healing - damage - health_cost)
                    .min(stats[0])
                    .max(0.0);
            }
            let u = &mut self.units[*target];
            u.mana = (u.mana + stats[1] - old_mana - mana_cost)
                .min(stats[1])
                .max(0.0);
        }
        for plan in plans {
            self.log.extend(plan.log.iter().cloned());
        }
        for i in 0..self.units.len() {
            if before
                .iter()
                .any(|(target, alive, _)| *target == i && *alive)
                && self.units[i].health == 0.0
            {
                self.log_death(i, None);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn shield_absorption_consumes_layers_in_order_and_retains_lifecycle_ids() {
        let mut layers = vec![
            json!({"id":"first","remaining":5,"activeEffectId":"effect-one"}),
            json!({"id":"second","remaining":10,"activeEffectId":"effect-two"}),
        ];
        assert_eq!(absorb(&mut layers, 8.0), 0.0);
        assert_eq!(layers.len(), 1);
        assert_eq!(layers[0]["id"], "second");
        assert_eq!(layers[0]["remaining"].as_f64(), Some(7.0));
        assert_eq!(layers[0]["activeEffectId"], "effect-two");
        assert_eq!(absorb(&mut layers, 12.0), 5.0);
        assert!(layers.is_empty());
    }

    #[test]
    fn negative_and_nonfinite_damage_do_not_consume_shields() {
        let mut layers = vec![json!({"id":"shield","remaining":10})];
        for damage in [-10.0, f64::NAN, f64::INFINITY] {
            assert_eq!(absorb(&mut layers, damage), 0.0);
            assert_eq!(layers[0]["remaining"].as_f64(), Some(10.0));
        }
    }
}
