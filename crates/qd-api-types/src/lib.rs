//! Authoritative public HTTP wire contract. Regenerate clients with pnpm --filter @qd/api-client generate.
use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum RowType {
    #[serde(rename = "tank")]
    Tank,
    #[serde(rename = "melee")]
    Melee,
    #[serde(rename = "ranged")]
    Ranged,
    #[serde(rename = "support")]
    Support,
}
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum EffectTimingType {
    #[serde(rename = "instant")]
    Instant,
    #[serde(rename = "interval")]
    Interval,
}
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum EffectCategory {
    #[serde(rename = "buff")]
    Buff,
    #[serde(rename = "debuff")]
    Debuff,
    #[serde(rename = "healing")]
    Healing,
    #[serde(rename = "damage")]
    Damage,
}
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum TargetScope {
    #[serde(rename = "self")]
    SelfTarget,
    #[serde(rename = "self_allies")]
    SelfAllies,
    #[serde(rename = "self_enemies")]
    SelfEnemies,
    #[serde(rename = "allies")]
    Allies,
    #[serde(rename = "enemies")]
    Enemies,
    #[serde(rename = "both")]
    Both,
}
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum TargetPriority {
    #[serde(rename = "highest_health")]
    HighestHealth,
    #[serde(rename = "lowest_health")]
    LowestHealth,
    #[serde(rename = "highest_damage")]
    HighestDamage,
    #[serde(rename = "support")]
    Support,
    #[serde(rename = "random")]
    Random,
}
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum TargetSelectionShape {
    #[serde(rename = "individual")]
    Individual,
    #[serde(rename = "adjacent")]
    Adjacent,
}
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum StatKey {
    #[serde(rename = "health")]
    Health,
    #[serde(rename = "mana")]
    Mana,
    #[serde(rename = "meleeDmg")]
    Meleedmg,
    #[serde(rename = "rangedDmg")]
    Rangeddmg,
    #[serde(rename = "manaRegen")]
    Manaregen,
    #[serde(rename = "spellDmg")]
    Spelldmg,
    #[serde(rename = "speed")]
    Speed,
    #[serde(rename = "dodge")]
    Dodge,
    #[serde(rename = "criticalChance")]
    Criticalchance,
}
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum UserRole {
    #[serde(rename = "game_master")]
    GameMaster,
    #[serde(rename = "player")]
    Player,
}
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct EffectInput {
    pub name: String,
    pub timing_type: EffectTimingType,
    pub effect_type: EffectCategory,
    #[serde(default)]
    pub is_taunt: bool,
    #[serde(default)]
    pub bypasses_shield: bool,
    pub trigger_every_actions: Option<f64>,
    pub trigger_count: Option<f64>,
    pub lasts_for_actions: Option<f64>,
    pub health: Option<f64>,
    pub mana: Option<f64>,
    pub melee_dmg: Option<f64>,
    pub ranged_dmg: Option<f64>,
    pub mana_regen: Option<f64>,
    pub spell_dmg: Option<f64>,
    pub speed: Option<f64>,
    pub dodge: Option<f64>,
    pub critical_chance: Option<f64>,
    pub shield: Option<f64>,
    pub direct_healing: Option<f64>,
    pub direct_melee_dmg: Option<f64>,
    pub direct_ranged_dmg: Option<f64>,
    pub direct_spell_dmg: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EffectData {
    pub name: String,
    pub timing_type: EffectTimingType,
    pub effect_type: EffectCategory,
    pub is_taunt: bool,
    pub bypasses_shield: bool,
    #[schema(required = true)]
    pub trigger_every_actions: Option<f64>,
    #[schema(required = true)]
    pub trigger_count: Option<f64>,
    #[schema(required = true)]
    pub lasts_for_actions: Option<f64>,
    #[schema(required = true)]
    pub health: Option<f64>,
    #[schema(required = true)]
    pub mana: Option<f64>,
    #[schema(required = true)]
    pub melee_dmg: Option<f64>,
    #[schema(required = true)]
    pub ranged_dmg: Option<f64>,
    #[schema(required = true)]
    pub mana_regen: Option<f64>,
    #[schema(required = true)]
    pub spell_dmg: Option<f64>,
    #[schema(required = true)]
    pub speed: Option<f64>,
    #[schema(required = true)]
    pub dodge: Option<f64>,
    #[schema(required = true)]
    pub critical_chance: Option<f64>,
    #[schema(required = true)]
    pub shield: Option<f64>,
    #[schema(required = true)]
    pub direct_healing: Option<f64>,
    #[schema(required = true)]
    pub direct_melee_dmg: Option<f64>,
    #[schema(required = true)]
    pub direct_ranged_dmg: Option<f64>,
    #[schema(required = true)]
    pub direct_spell_dmg: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Effect {
    #[serde(flatten)]
    pub input: EffectData,
    pub id: String,
    pub created_at: String,
    pub updated_at: String,
    pub needs_timing_configuration: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EffectListItem {
    pub name: String,
    pub timing_type: EffectTimingType,
    pub effect_type: EffectCategory,
    #[serde(default)]
    pub is_taunt: bool,
    #[serde(default)]
    pub bypasses_shield: bool,
    #[schema(required = true)]
    pub trigger_every_actions: Option<f64>,
    #[schema(required = true)]
    pub trigger_count: Option<f64>,
    #[schema(required = true)]
    pub lasts_for_actions: Option<f64>,
    #[schema(required = true)]
    pub health: Option<f64>,
    #[schema(required = true)]
    pub mana: Option<f64>,
    #[schema(required = true)]
    pub melee_dmg: Option<f64>,
    #[schema(required = true)]
    pub ranged_dmg: Option<f64>,
    #[schema(required = true)]
    pub mana_regen: Option<f64>,
    #[schema(required = true)]
    pub spell_dmg: Option<f64>,
    #[schema(required = true)]
    pub speed: Option<f64>,
    #[schema(required = true)]
    pub dodge: Option<f64>,
    #[schema(required = true)]
    pub critical_chance: Option<f64>,
    #[schema(required = true)]
    pub shield: Option<f64>,
    pub id: String,
    pub updated_at: String,
    pub needs_timing_configuration: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ItemInput {
    pub name: String,
    pub mana: f64,
    pub melee_dmg: f64,
    pub ranged_dmg: f64,
    pub mana_regen: f64,
    pub spell_dmg: f64,
    pub dodge: f64,
    pub critical_chance: f64,
    pub activation_mana_cost: f64,
    pub activation_health_cost: f64,
    pub effect_ids: Vec<String>,
    pub allowed_row_types: Vec<RowType>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Item {
    #[serde(flatten)]
    pub input: ItemInput,
    pub id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ItemListItem {
    pub name: String,
    pub mana: f64,
    pub melee_dmg: f64,
    pub ranged_dmg: f64,
    pub mana_regen: f64,
    pub spell_dmg: f64,
    pub dodge: f64,
    pub critical_chance: f64,
    pub id: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UnitInput {
    pub name: String,
    pub health: f64,
    pub mana: f64,
    pub melee_dmg: f64,
    pub ranged_dmg: f64,
    pub mana_regen: f64,
    pub spell_dmg: f64,
    pub speed: f64,
    pub dodge: f64,
    pub critical_chance: f64,
    #[serde(default = "default_target_scope")]
    pub target_scope: TargetScope,
    #[serde(default = "default_target_priority")]
    pub target_priority: TargetPriority,
    #[serde(default = "default_page")]
    pub target_count: u32,
    #[serde(default = "default_selection_shape")]
    pub selection_shape: TargetSelectionShape,
    pub item_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UnitData {
    pub name: String,
    pub health: f64,
    pub mana: f64,
    pub melee_dmg: f64,
    pub ranged_dmg: f64,
    pub mana_regen: f64,
    pub spell_dmg: f64,
    pub speed: f64,
    pub dodge: f64,
    pub critical_chance: f64,
    pub target_scope: TargetScope,
    pub target_priority: TargetPriority,
    pub target_count: u32,
    pub selection_shape: TargetSelectionShape,
    pub item_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Unit {
    #[serde(flatten)]
    pub input: UnitData,
    pub id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UnitListItem {
    pub id: String,
    pub name: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioRowInput {
    pub row_type: RowType,
    pub unit_ids: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioInput {
    pub name: String,
    pub rows: Vec<ScenarioRowInput>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioAssignment {
    pub assignment_id: String,
    pub unit_id: String,
    pub unit_name: String,
    pub position: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioRow {
    pub id: String,
    pub row_type: RowType,
    pub assignments: Vec<ScenarioAssignment>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Scenario {
    pub name: String,
    pub rows: Vec<ScenarioRow>,
    pub id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioListItem {
    pub name: String,
    pub id: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EffectList {
    pub items: Vec<EffectListItem>,
    pub total_count: u64,
    pub page: u32,
    pub limit: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ItemList {
    pub items: Vec<ItemListItem>,
    pub total_count: u64,
    pub page: u32,
    pub limit: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UnitList {
    pub items: Vec<UnitListItem>,
    pub total_count: u64,
    pub page: u32,
    pub limit: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioList {
    pub items: Vec<ScenarioListItem>,
    pub total_count: u64,
    pub page: u32,
    pub limit: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema, Default)]
#[serde(tag = "mode", rename_all = "lowercase")]
pub enum LinkageFilter {
    #[default]
    All,
    Linked,
    Unlinked,
    Scenario {
        #[serde(rename = "scenarioId")]
        scenario_id: String,
    },
}
fn default_page() -> u32 {
    1
}
fn default_limit() -> u32 {
    20
}
fn default_sort_by() -> String {
    "name".into()
}
fn default_sort_dir() -> String {
    "asc".into()
}
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ListInput {
    #[serde(default = "default_page")]
    pub page: u32,
    #[serde(default = "default_limit")]
    pub limit: u32,
    #[serde(default = "default_sort_by")]
    pub sort_by: String,
    #[serde(default = "default_sort_dir")]
    pub sort_dir: String,
    #[serde(default)]
    pub linkage_filter: LinkageFilter,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct LoginInput {
    pub email: String,
    pub password: String,
    #[serde(default)]
    pub remember_me: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(untagged)]
pub enum SessionResponse {
    Authenticated {
        authenticated: bool,
        #[serde(rename = "userId")]
        user_id: String,
        #[serde(rename = "userRole")]
        user_role: UserRole,
    },
    Anonymous {
        authenticated: bool,
        #[serde(rename = "hadSession")]
        had_session: bool,
    },
}
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ApiError {
    pub code: String,
    pub message: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ApiErrorEnvelope {
    pub error: ApiError,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Success {
    pub success: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ScenarioOption {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ReplayInput {
    pub scenario_a_id: String,
    pub scenario_b_id: String,
    pub seed: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct Replay {
    #[serde(flatten)]
    pub input: ReplayInput,
    pub id: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct UnitStats {
    pub health: f64,
    pub mana: f64,
    pub melee_dmg: f64,
    pub ranged_dmg: f64,
    pub mana_regen: f64,
    pub spell_dmg: f64,
    pub speed: f64,
    pub dodge: f64,
    pub critical_chance: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BattleLogSourceRef {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub id: Option<String>,
    pub name: String,
    pub position: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum BattleLogOriginKind {
    #[serde(rename = "basic-attack")]
    BasicAttack,
    #[serde(rename = "item-effect")]
    ItemEffect,
    #[serde(rename = "fatigue")]
    Fatigue,
}
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BattleLogOrigin {
    pub kind: BattleLogOriginKind,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub action_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub source_unit_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub item: Option<BattleLogSourceRef>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub effect: Option<BattleLogSourceRef>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BaseLogEntry {
    pub batch_number: u32,
    pub message: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub action_id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub origin: Option<BattleLogOrigin>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AttackLogEntry {
    #[serde(flatten)]
    pub base: BaseLogEntry,
    pub attacker: String,
    pub attacker_id: String,
    pub target: String,
    pub target_id: String,
    pub damage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ItemActivationLogEntry {
    #[serde(flatten)]
    pub base: BaseLogEntry,
    pub caster: String,
    pub caster_id: String,
    pub item: String,
    pub targets: Vec<String>,
    pub target_ids: Vec<String>,
    pub effects: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EffectApplyLogEntry {
    #[serde(flatten)]
    pub base: BaseLogEntry,
    pub target: String,
    pub target_id: String,
    pub effect: String,
    pub stat: StatKey,
    pub value: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub actions_remaining: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct EffectExpireLogEntry {
    #[serde(flatten)]
    pub base: BaseLogEntry,
    pub target: String,
    pub target_id: String,
    pub effect: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub stat: Option<StatKey>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub value: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub actions_remaining: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DamageLogEntry {
    #[serde(flatten)]
    pub base: BaseLogEntry,
    pub source: String,
    pub source_id: String,
    pub target: String,
    pub target_id: String,
    pub damage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct HealLogEntry {
    #[serde(flatten)]
    pub base: BaseLogEntry,
    pub source: String,
    pub source_id: String,
    pub target: String,
    pub target_id: String,
    pub amount: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeathLogEntry {
    #[serde(flatten)]
    pub base: BaseLogEntry,
    pub unit: String,
    pub unit_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct FatigueLogEntry {
    #[serde(flatten)]
    pub base: BaseLogEntry,
    pub target: String,
    pub target_id: String,
    pub damage: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BattleEndLogEntry {
    #[serde(flatten)]
    pub base: BaseLogEntry,
    pub outcome: String,
    #[schema(required = true)]
    pub winner_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum BattleLogEntry {
    Attack(AttackLogEntry),
    ItemActivation(ItemActivationLogEntry),
    EffectApply(EffectApplyLogEntry),
    EffectExpire(EffectExpireLogEntry),
    Damage(DamageLogEntry),
    Heal(HealLogEntry),
    Death(DeathLogEntry),
    Fatigue(FatigueLogEntry),
    BattleEnd(BattleEndLogEntry),
}
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ActiveEffectState {
    pub id: String,
    pub name: String,
    pub source_unit_id: String,
    pub source_scenario_id: String,
    pub target_unit_id: String,
    pub effect_type: EffectCategory,
    pub timing_type: EffectTimingType,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub stat_key: Option<StatKey>,
    pub value: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub remaining_triggers: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub actions_until_trigger: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub trigger_every_actions: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub actions_remaining: Option<u32>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub is_taunt: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub bypasses_shield: Option<bool>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub origin: Option<BattleLogOrigin>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ShieldLayer {
    pub id: String,
    pub remaining: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub active_effect_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BattleItemEffect {
    pub sequence_order: u32,
    pub effect: BattleEffectTemplate,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BattleEffectTemplate {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub id: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub name: Option<String>,
    pub timing_type: EffectTimingType,
    pub effect_type: EffectCategory,
    pub is_taunt: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub trigger_every_actions: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub trigger_count: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub lasts_for_actions: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub health: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub mana: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub melee_dmg: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub ranged_dmg: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub mana_regen: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub spell_dmg: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub speed: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub dodge: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub critical_chance: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub shield: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub direct_healing: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub direct_melee_dmg: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub direct_ranged_dmg: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub direct_spell_dmg: Option<f64>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub bypasses_shield: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BattleItemState {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub id: Option<String>,
    pub name: String,
    pub mana: f64,
    pub melee_dmg: f64,
    pub ranged_dmg: f64,
    pub mana_regen: f64,
    pub spell_dmg: f64,
    pub dodge: f64,
    pub critical_chance: f64,
    pub activation_mana_cost: f64,
    pub activation_health_cost: f64,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub allowed_row_types: Option<Vec<RowType>>,
    pub effects: Vec<BattleItemEffect>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BattleUnitState {
    pub instance_id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub template_id: Option<String>,
    pub scenario_id: String,
    pub row_type: RowType,
    pub slot: u32,
    pub name: String,
    pub base_stats: UnitStats,
    pub item_bonus_stats: UnitStats,
    pub current_health: f64,
    pub mana: f64,
    pub action_bar: f64,
    pub items: Vec<BattleItemState>,
    pub target_scope: TargetScope,
    pub target_priority: TargetPriority,
    pub target_count: u32,
    pub selection_shape: TargetSelectionShape,
    pub active_effects: Vec<ActiveEffectState>,
    pub shield_layers: Vec<ShieldLayer>,
    pub acted_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BattleRows {
    pub tank: Vec<BattleUnitState>,
    pub melee: Vec<BattleUnitState>,
    pub ranged: Vec<BattleUnitState>,
    pub support: Vec<BattleUnitState>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BattleScenarioState {
    pub id: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    #[schema(nullable = false)]
    pub name: Option<String>,
    pub rows: BattleRows,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "snake_case")]
pub enum BattleStatus {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "finished")]
    Finished,
}
#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BattleState {
    pub action_count: u32,
    pub batch_count: u32,
    pub status: BattleStatus,
    #[schema(required = true)]
    pub winner_id: Option<String>,
    pub scenarios: Vec<BattleScenarioState>,
    pub log: Vec<BattleLogEntry>,
    pub fatigue_action_threshold: u32,
    pub fatigue_damage_start: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct BattleResult {
    #[schema(required = true)]
    pub winner_id: Option<String>,
    pub actions_resolved: u32,
    pub final_state: BattleState,
    pub log: Vec<BattleLogEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct ReplayOutput {
    pub replay: Replay,
    pub scenarios: Vec<ScenarioOption>,
    pub result: BattleResult,
}

#[derive(OpenApi)]
#[openapi(components(schemas(
    RowType,
    EffectTimingType,
    EffectCategory,
    TargetScope,
    TargetPriority,
    TargetSelectionShape,
    StatKey,
    UserRole,
    EffectInput,
    Effect,
    EffectListItem,
    ItemInput,
    Item,
    ItemListItem,
    UnitInput,
    Unit,
    UnitListItem,
    ScenarioRowInput,
    ScenarioInput,
    ScenarioAssignment,
    ScenarioRow,
    Scenario,
    ScenarioListItem,
    EffectList,
    ItemList,
    UnitList,
    ScenarioList,
    LinkageFilter,
    ListInput,
    LoginInput,
    SessionResponse,
    ApiError,
    ApiErrorEnvelope,
    Success,
    ScenarioOption,
    ReplayInput,
    Replay,
    UnitStats,
    BattleLogSourceRef,
    BattleLogOriginKind,
    BattleLogOrigin,
    BaseLogEntry,
    AttackLogEntry,
    ItemActivationLogEntry,
    EffectApplyLogEntry,
    EffectExpireLogEntry,
    DamageLogEntry,
    HealLogEntry,
    DeathLogEntry,
    FatigueLogEntry,
    BattleEndLogEntry,
    BattleLogEntry,
    ActiveEffectState,
    ShieldLayer,
    BattleItemEffect,
    BattleEffectTemplate,
    BattleItemState,
    BattleUnitState,
    BattleRows,
    BattleScenarioState,
    BattleStatus,
    BattleState,
    BattleResult,
    ReplayOutput
)))]
struct ApiDoc;

/// OpenAPI 3.1 document generated from serde DTOs, including every transport route.
pub fn openapi() -> serde_json::Value {
    use serde_json::json;
    let mut document = serde_json::to_value(ApiDoc::openapi()).expect("OpenAPI is serializable");
    document["info"] = json!({"title":"Quartermasters Draft API","version":"1.0.0"});
    let mut paths = serde_json::Map::new();
    fn operation(input: Option<&str>, output: &str, list: bool, id: bool) -> serde_json::Value {
        let mut op = json!({"responses":{"200":{"description":"Success","content":{"application/json":{"schema":{"$ref":format!("#/components/schemas/{output}")}}}}}});
        for (code, label) in [
            ("400", "Invalid input"),
            ("401", "Unauthenticated"),
            ("403", "Forbidden"),
            ("404", "Not found"),
            ("409", "Conflict"),
            ("500", "Internal error"),
        ] {
            op["responses"][code] = json!({"description":label,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/ApiErrorEnvelope"}}}});
        }
        if let Some(input) = input {
            op["requestBody"] = json!({"required":true,"content":{"application/json":{"schema":{"$ref":format!("#/components/schemas/{input}")}}}});
        }
        let mut params = vec![];
        if list {
            params.push(json!({"name":"input","in":"query","description":"URL-encoded JSON list filters; defaults page=1, limit=20, sortBy=name, sortDir=asc, linkageFilter.mode=all; limit 1..500.","content":{"application/json":{"schema":{"$ref":"#/components/schemas/ListInput"}}}}));
        }
        if id {
            params.push(json!({"name":"id","in":"path","required":true,"schema":{"type":"string","format":"uuid"}}));
        }
        if !params.is_empty() {
            op["parameters"] = json!(params);
        }
        op
    }
    for (path, name) in [
        ("effects", "Effect"),
        ("items", "Item"),
        ("units", "Unit"),
        ("scenarios", "Scenario"),
    ] {
        paths.insert(format!("/api/v1/{path}"),json!({"get":operation(None,&format!("{name}List"),true,false),"post":operation(Some(&format!("{name}Input")),name,false,false)}));
        paths.insert(format!("/api/v1/{path}/{{id}}"),json!({"get":operation(None,name,false,true),"put":operation(Some(&format!("{name}Input")),name,false,true),"delete":operation(None,"Success",false,true)}));
    }
    paths.insert(
        "/api/v1/auth/session".into(),
        json!({"get":operation(None,"SessionResponse",false,false)}),
    );
    paths.insert(
        "/api/v1/auth/login".into(),
        json!({"post":operation(Some("LoginInput"),"SessionResponse",false,false)}),
    );
    paths.insert(
        "/api/v1/auth/logout".into(),
        json!({"post":operation(None,"Success",false,false)}),
    );
    paths.insert(
        "/api/v1/replays".into(),
        json!({"post":operation(Some("ReplayInput"),"ReplayOutput",false,false)}),
    );
    paths.insert(
        "/api/v1/replays/{id}".into(),
        json!({"get":operation(None,"ReplayOutput",false,true)}),
    );
    let mut options = operation(None, "ScenarioOption", false, false);
    options["responses"]["200"]["content"]["application/json"]["schema"] =
        json!({"type":"array","items":{"$ref":"#/components/schemas/ScenarioOption"}});
    paths.insert(
        "/api/v1/battle/scenario-options".into(),
        json!({"get":options}),
    );
    document["paths"] = json!(paths);
    document
}

fn default_target_scope() -> TargetScope {
    TargetScope::Enemies
}
fn default_target_priority() -> TargetPriority {
    TargetPriority::HighestHealth
}
fn default_selection_shape() -> TargetSelectionShape {
    TargetSelectionShape::Individual
}
