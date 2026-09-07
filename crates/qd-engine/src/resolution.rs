use crate::model::*;
use crate::operations::{Operation, apply_damage};
use serde_json::json;
impl BattleEngine {
    pub(crate) fn resolve_action(&mut self, caster: usize) {
        let action_id = format!(
            "{}:{}:{}",
            self.batch,
            self.units[caster].id,
            self.units[caster].acted + 1
        );
        let items = self.units[caster].items.clone();
        let mut activated = false;
        for (position, item) in items.iter().enumerate() {
            if array(item, "effects").is_empty() {
                continue;
            }
            let mana_cost = number(item, "activationManaCost");
            let health_cost = number(item, "activationHealthCost");
            if self.units[caster].mana < mana_cost || self.units[caster].health < health_cost {
                continue;
            }
            let targets = self.targets(caster, false);
            if targets.is_empty() {
                continue;
            }
            if mana_cost > 0.0 {
                self.operations.push(Operation::ManaCost {
                    target: caster,
                    amount: mana_cost,
                });
                self.units[caster].mana -= mana_cost;
            }
            if health_cost > 0.0 {
                self.operations.push(Operation::HealthCost {
                    target: caster,
                    amount: health_cost,
                });
                apply_damage(&mut self.units[caster], health_cost, false);
            }
            let mut item_ref = json!({"name":item["name"],"position":position+1});
            if let Some(id) = item.get("id") {
                item_ref["id"] = id.clone();
            }
            let origin = json!({"kind":"item-effect","actionId":action_id,"sourceUnitId":self.units[caster].id,"item":item_ref});
            self.apply_item(caster, item, &targets, &origin);
            activated = true;
            if self.units[caster].health <= 0.0 {
                break;
            }
        }
        if !activated {
            self.basic_attack(caster, &action_id);
        }
    }
    fn basic_attack(&mut self, caster: usize, action: &str) {
        let targets = self.targets(caster, true);
        let Some(&target) = targets.first() else {
            return;
        };
        let a = self.units[caster].stats();
        let t = self.units[target].stats();
        let base = a[2] + a[3] + a[5];
        let multiplier =
            (1.0 - 0.25 * (self.units[caster].row + self.units[target].row) as f64).max(0.0);
        let damage = modified_damage(js_round(base * multiplier), a[8], t[7]);
        self.operations.push(Operation::Damage {
            target,
            amount: damage,
            bypass: false,
        });
        apply_damage(&mut self.units[target], damage, false);
        let attacker = &self.units[caster];
        let defender = &self.units[target];
        let origin = json!({"kind":"basic-attack","actionId":action,"sourceUnitId":attacker.id});
        self.log.push(json!({"batchNumber":self.batch,"type":"attack","attacker":attacker.name,"attackerId":attacker.id,"target":defender.name,"targetId":defender.id,"damage":damage,"actionId":action,"origin":origin,"message":format!("{} attacks {} for {} damage",attacker.name,defender.name,js_number(damage))}));
        self.log_health(caster, target, damage, false, &origin, true);
    }
}
