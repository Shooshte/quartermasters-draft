export const ROW_TYPES = ["tank", "melee", "ranged", "support"] as const;

export type RowType = (typeof ROW_TYPES)[number];

export const TARGET_POLICIES = [
  "highest_health",
  "lowest_health",
  "highest_damage",
  "random",
  "self",
] as const;

export type TargetPolicy = (typeof TARGET_POLICIES)[number];

export const TARGET_SIDES = ["allies", "enemies", "self"] as const;

export type TargetSide = (typeof TARGET_SIDES)[number];

export const STAT_KEYS = [
  "health",
  "mana",
  "meleeDmg",
  "rangedDmg",
  "manaRegen",
  "spellDmg",
  "speed",
  "dodge",
  "criticalChance",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

export type UnitStats = Record<StatKey, number>;

export type EffectTimingType = "instant" | "interval";
export type EffectCategory = "buff" | "debuff" | "healing" | "damage";

export interface EffectTemplateInput {
  id?: string;
  name?: string;
  timingType: EffectTimingType;
  effectType: EffectCategory;
  intervalTicks?: number | null;
  triggerCount?: number | null;
  durationTicks?: number | null;
  meleeDmg?: number | null;
  health?: number | null;
  mana?: number | null;
  rangedDmg?: number | null;
  manaRegen?: number | null;
  spellDmg?: number | null;
  speed?: number | null;
  dodge?: number | null;
  criticalChance?: number | null;
  directHealing?: number | null;
  directMeleeDmg?: number | null;
  directRangedDmg?: number | null;
  directSpellDmg?: number | null;
}

export interface ItemEffectInput {
  sequenceOrder: number;
  effect: EffectTemplateInput;
}

export interface ItemInput {
  id?: string;
  name: string;
  mana?: number;
  meleeDmg?: number;
  rangedDmg?: number;
  manaRegen?: number;
  spellDmg?: number;
  dodge?: number;
  criticalChance?: number;
  activationManaCost?: number;
  activationHealthCost?: number;
  effects?: ItemEffectInput[];
}

export interface UnitInput {
  id?: string;
  name: string;
  stats: UnitStats;
  items?: ItemInput[];
  targetSide?: TargetSide;
  targetPolicy?: TargetPolicy;
  targetRowCount?: number;
  maxTargetsPerRow?: number | null;
  targetOnlyAdjacent?: boolean;
  allowedRowTypes?: RowType[];
  currentHealth?: number;
  startingActionBar?: number;
}

export interface ScenarioInput {
  id: string;
  name?: string;
  rows?: Partial<Record<RowType, UnitInput[]>>;
}

export interface TargetingOverrideInput {
  scenarioId: string;
  rowType: RowType;
  slot: number;
  policy: TargetPolicy;
}

export type BattleSeed = number | string;

export interface BattleInput {
  scenarios: [ScenarioInput, ScenarioInput];
  seed: BattleSeed;
  targetingOverrides?: TargetingOverrideInput[];
}

export interface BattleOptions {
  fatigueTickThreshold?: number;
  fatigueDamageStart?: number;
  resolveActionsOnTick?: boolean;
}

export interface BattleItemState {
  id?: string;
  name: string;
  mana: number;
  meleeDmg: number;
  rangedDmg: number;
  manaRegen: number;
  spellDmg: number;
  dodge: number;
  criticalChance: number;
  activationManaCost: number;
  activationHealthCost: number;
  effects: ItemEffectInput[];
}

export interface ActiveEffectState {
  id: string;
  name: string;
  sourceUnitId: string;
  sourceScenarioId: string;
  targetUnitId: string;
  effectType: EffectCategory;
  timingType: EffectTimingType;
  statKey?: StatKey;
  value: number;
  remainingTriggers?: number;
  nextTriggerTick?: number;
  intervalTicks?: number;
  expiresAtTick?: number;
  origin?: BattleLogOrigin;
}

export interface BattleUnitState {
  instanceId: string;
  templateId?: string;
  scenarioId: string;
  rowType: RowType;
  slot: number;
  name: string;
  baseStats: UnitStats;
  itemBonusStats: UnitStats;
  currentHealth: number;
  mana: number;
  actionBar: number;
  items: BattleItemState[];
  targetSide: TargetSide;
  targetPolicy: TargetPolicy;
  targetRowCount: number;
  maxTargetsPerRow: number | null;
  targetOnlyAdjacent: boolean;
  allowedRowTypes: RowType[];
  targetPolicyOverride: TargetPolicy | null;
  activeEffects: ActiveEffectState[];
  actedCount: number;
}

export interface BattleScenarioState {
  id: string;
  name?: string;
  rows: Record<RowType, BattleUnitState[]>;
}

export interface BattleState {
  tick: number;
  status: "active" | "finished";
  winnerId: string | null;
  scenarios: [BattleScenarioState, BattleScenarioState];
  log: BattleLogEntry[];
  fatigueTickThreshold: number;
  fatigueDamageStart: number;
}

export interface BattleResult {
  winnerId: string | null;
  ticksElapsed: number;
  finalState: BattleState;
  log: BattleLogEntry[];
}

export interface ActionContext {
  tick: number;
  caster: BattleUnitState;
  targetIds: string[];
}

export type BattleLogEntry =
  | AttackLogEntry
  | ItemActivationLogEntry
  | EffectApplyLogEntry
  | EffectExpireLogEntry
  | DamageLogEntry
  | HealLogEntry
  | DeathLogEntry
  | FatigueLogEntry
  | BattleEndLogEntry;

export interface BaseLogEntry {
  tick: number;
  type: string;
  message: string;
  actionId?: string;
  origin?: BattleLogOrigin;
}

export interface BattleLogSourceRef {
  id?: string;
  name: string;
  position: number;
}

export interface BattleLogOrigin {
  kind: "basic-attack" | "item-effect" | "fatigue";
  actionId?: string;
  sourceUnitId?: string;
  item?: BattleLogSourceRef;
  effect?: BattleLogSourceRef;
}

export interface AttackLogEntry extends BaseLogEntry {
  type: "attack";
  attacker: string;
  attackerId: string;
  target: string;
  targetId: string;
  damage: number;
}

export interface ItemActivationLogEntry extends BaseLogEntry {
  type: "item-activation";
  caster: string;
  casterId: string;
  item: string;
  targets: string[];
  targetIds: string[];
  effects: string[];
}

export interface EffectApplyLogEntry extends BaseLogEntry {
  type: "effect-apply";
  target: string;
  targetId: string;
  effect: string;
  stat?: string;
}

export interface EffectExpireLogEntry extends BaseLogEntry {
  type: "effect-expire";
  target: string;
  targetId: string;
  effect: string;
}

export interface DamageLogEntry extends BaseLogEntry {
  type: "damage";
  source: string;
  sourceId: string;
  target: string;
  targetId: string;
  damage: number;
}

export interface HealLogEntry extends BaseLogEntry {
  type: "heal";
  source: string;
  sourceId: string;
  target: string;
  targetId: string;
  amount: number;
}

export interface DeathLogEntry extends BaseLogEntry {
  type: "death";
  unit: string;
  unitId: string;
}

export interface FatigueLogEntry extends BaseLogEntry {
  type: "fatigue";
  target: string;
  targetId: string;
  damage: number;
}

export interface BattleEndLogEntry extends BaseLogEntry {
  type: "battle-end";
  outcome: string;
  winnerId: string | null;
}
