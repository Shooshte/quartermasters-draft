use crate::model::*;
use std::cmp::Ordering;
impl BattleEngine {
    fn projected_damage(&self, i: usize) -> f64 {
        let unit = &self.units[i];
        let stats = unit.stats();
        let stat_damage = stats[2] + stats[3] + stats[5];
        if !["enemies", "self_enemies", "both"].contains(&unit.scope.as_str()) {
            return stat_damage * stats[6] / 100.0;
        }
        let mut instant = 0.0;
        let mut interval = 0.0;
        for item in &unit.items {
            for seq in array(item, "effects") {
                let e = &seq["effect"];
                if string(e, "effectType") == "healing" {
                    continue;
                }
                if string(e, "timingType") == "instant" {
                    instant += ["directMeleeDmg", "directRangedDmg", "directSpellDmg"]
                        .iter()
                        .find_map(|key| e[*key].as_f64())
                        .unwrap_or(0.0);
                }
                if string(e, "timingType") == "interval" {
                    interval += (number(e, "directMeleeDmg")
                        + number(e, "directRangedDmg")
                        + number(e, "directSpellDmg"))
                        / optional_number(e, "triggerEveryActions", 1.0);
                }
            }
        }
        (stat_damage + instant) * stats[6] / 100.0 + interval
    }
    fn fallback(&self, a: usize, b: usize) -> Ordering {
        let a = &self.units[a];
        let b = &self.units[b];
        a.row
            .cmp(&b.row)
            .then(a.slot.cmp(&b.slot))
            .then(a.scenario.cmp(&b.scenario))
            .then(a.id.cmp(&b.id))
    }
    pub(crate) fn targets(&mut self, caster: usize, basic: bool) -> Vec<usize> {
        let u = &self.units[caster];
        let scope = if basic { "enemies" } else { &u.scope };
        let priority = u.priority.clone();
        let count = if basic { 1 } else { u.count };
        let adjacent = !basic && u.shape == "adjacent";
        let own = u.scenario;
        // Scope expansion begins with the caster's side even when it is second
        // in input order. This also defines random score consumption order.
        let sides: Vec<usize> = match scope {
            "self" | "self_allies" | "allies" => vec![own],
            "enemies" => vec![1 - own],
            _ => vec![own, 1 - own],
        };
        let mut candidates: Vec<usize> = vec![];
        for side in sides {
            for (i, unit) in self.units.iter().enumerate() {
                if unit.scenario == side && unit.health > 0.0 {
                    candidates.push(i);
                }
            }
        }
        candidates.retain(|i| match scope {
            "self" => *i == caster,
            "self_enemies" => *i == caster || self.units[*i].scenario != own,
            "allies" | "both" => *i != caster,
            _ => true,
        });
        if u.row < 2
            && let Some(row) = candidates.iter().map(|i| self.units[*i].row).min()
        {
            candidates.retain(|i| self.units[*i].row == row);
            let mut groups: Vec<usize> = vec![];
            for i in &candidates {
                if !groups.contains(&self.units[*i].scenario) {
                    groups.push(self.units[*i].scenario);
                }
            }
            if groups.len() > 1 {
                let side = groups[(self.rng.next() * groups.len() as f64).floor() as usize];
                candidates.retain(|i| self.units[*i].scenario == side);
            }
        }
        let taunt = self.units[caster]
            .effects
            .iter()
            .rev()
            .filter(|e| e["isTaunt"] == true)
            .find_map(|e| {
                candidates
                    .iter()
                    .copied()
                    .find(|i| self.units[*i].id == string(e, "sourceUnitId"))
            });
        let mut ranked: Vec<(usize, f64)> = candidates
            .into_iter()
            .map(|i| {
                let score = match priority.as_str() {
                    "highest_health" | "lowest_health" => self.units[i].health,
                    "highest_damage" => self.projected_damage(i),
                    "support" => {
                        if self.units[i].row == 3 {
                            0.0
                        } else {
                            1.0
                        }
                    }
                    "random" => self.rng.next(),
                    _ => 0.0,
                };
                (i, score)
            })
            .collect();
        ranked.sort_by(|(a, av), (b, bv)| {
            let diff = if priority == "highest_health" || priority == "highest_damage" {
                bv - av
            } else {
                av - bv
            };
            let primary = if diff.is_nan() || diff == 0.0 {
                Ordering::Equal
            } else if diff < 0.0 {
                Ordering::Less
            } else {
                Ordering::Greater
            };
            primary.then_with(|| self.fallback(*a, *b))
        });
        let mut ranked: Vec<usize> = ranked.into_iter().map(|(i, _)| i).collect();
        if let Some(taunt) = taunt {
            ranked.retain(|i| *i != taunt);
            ranked.insert(0, taunt);
        }
        if !adjacent || ranked.is_empty() {
            ranked.truncate(count);
            return ranked;
        }
        let primary = ranked[0];
        let row = self.units[primary].row;
        let side = self.units[primary].scenario;
        ranked.retain(|i| self.units[*i].row == row && self.units[*i].scenario == side);
        ranked.sort_by_key(|i| self.units[*i].slot);
        if count >= ranked.len() {
            return ranked;
        }
        let position = ranked.iter().position(|i| *i == primary).unwrap();
        let start = position
            .saturating_sub((count - 1) / 2)
            .min(ranked.len() - count);
        ranked[start..start + count].to_vec()
    }
}
