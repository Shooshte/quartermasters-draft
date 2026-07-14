import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["gm", "player"]);
export const timingTypeEnum = pgEnum("timing_type", ["instant", "interval"]);
export const effectTypeEnum = pgEnum("effect_type", ["buff", "debuff", "healing", "damage"]);
export const targetPolicyEnum = pgEnum("target_policy", [
  "highest_health",
  "lowest_health",
  "highest_damage",
  "random",
]);
export const rowTypeEnum = pgEnum("row_type", ["support", "ranged", "melee", "tank"]);

export const user = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    role: roleEnum("role").notNull().default("player"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("user_email_idx").on(table.email)],
);

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("session_user_id_idx").on(table.userId),
    index("session_token_idx").on(table.token),
  ],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at")
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("account_user_id_idx").on(table.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const effects = pgTable(
  "effects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    timingType: timingTypeEnum("timing_type").notNull(),
    intervalTicks: integer("interval_ticks"),
    triggerCount: integer("trigger_count"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    meleeDmg: real("melee_dmg"),
    health: real("health"),
    mana: real("mana"),
    rangedDmg: real("ranged_dmg"),
    manaRegen: real("mana_regen"),
    spellDmg: real("spell_dmg"),
    speed: real("speed"),
    dodge: real("dodge"),
    criticalChance: real("critical_chance"),
    effectType: effectTypeEnum("effect_type").notNull().default("buff"),
    durationTicks: integer("duration_ticks"),
    directHealing: real("direct_healing"),
    directMeleeDmg: real("direct_melee_dmg"),
    directRangedDmg: real("direct_ranged_dmg"),
    directSpellDmg: real("direct_spell_dmg"),
  },
  (table) => [
    check(
      "interval_ticks_positive",
      sql`${table.intervalTicks} IS NULL OR ${table.intervalTicks} > 0`,
    ),
    check(
      "trigger_count_positive",
      sql`${table.triggerCount} IS NULL OR ${table.triggerCount} > 0`,
    ),
    check(
      "duration_ticks_positive",
      sql`${table.durationTicks} IS NULL OR ${table.durationTicks} > 0`,
    ),
    check(
      "interval_fields_required",
      sql`${table.timingType} != 'interval' OR (${table.intervalTicks} IS NOT NULL AND ${table.triggerCount} IS NOT NULL)`,
    ),
    check(
      "instant_fields_forbidden",
      sql`${table.timingType} != 'instant' OR (${table.intervalTicks} IS NULL AND ${table.triggerCount} IS NULL)`,
    ),
  ],
);

export const spells = pgTable(
  "spells",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    description: text("description"),
    targetPolicy: targetPolicyEnum("target_policy").notNull(),
    targetRowCount: integer("target_row_count").notNull().default(1),
    maxTargetsPerRow: integer("max_targets_per_row").default(1),
    targetOnlyAdjacent: boolean("target_only_adjacent").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check(
      "target_row_count_range",
      sql`${table.targetRowCount} >= 1 AND ${table.targetRowCount} <= 4`,
    ),
    check(
      "max_targets_per_row_positive",
      sql`${table.maxTargetsPerRow} IS NULL OR ${table.maxTargetsPerRow} >= 1`,
    ),
    check(
      "target_only_adjacent_whole_row",
      sql`${table.maxTargetsPerRow} IS NOT NULL OR ${table.targetOnlyAdjacent} = false`,
    ),
    check(
      "target_only_adjacent_min_targets",
      sql`${table.targetOnlyAdjacent} = false OR ${table.maxTargetsPerRow} >= 2`,
    ),
  ],
);

export const spellsEffects = pgTable(
  "spells_effects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spellId: uuid("spell_id")
      .notNull()
      .references(() => spells.id, { onDelete: "cascade" }),
    effectTemplateId: uuid("effect_template_id")
      .notNull()
      .references(() => effects.id),
    sequenceOrder: integer("sequence_order").notNull(),
  },
  (table) => [
    index("spells_effects_spell_id_idx").on(table.spellId),
    index("spells_effects_effect_template_id_idx").on(table.effectTemplateId),
    check("sequence_order_positive", sql`${table.sequenceOrder} > 0`),
    unique("spells_effects_spell_id_sequence_order_unique").on(table.spellId, table.sequenceOrder),
  ],
);
// Migration 0005 adds deferred constraint triggers so every spell keeps at least one linked effect.

export const spellsAllowedRows = pgTable(
  "spells_allowed_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spellId: uuid("spell_id")
      .notNull()
      .references(() => spells.id, { onDelete: "cascade" }),
    rowType: rowTypeEnum("row_type").notNull(),
  },
  (table) => [
    index("spells_allowed_rows_spell_id_idx").on(table.spellId),
    unique("spells_allowed_rows_spell_id_row_type_unique").on(table.spellId, table.rowType),
  ],
);

export const items = pgTable(
  "items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    meleeDmg: real("melee_dmg").notNull().default(0),
    rangedDmg: real("ranged_dmg").notNull().default(0),
    mana: real("mana").notNull().default(0),
    manaRegen: real("mana_regen").notNull().default(0),
    spellDmg: real("spell_dmg").notNull().default(0),
    dodge: real("dodge").notNull().default(0),
    criticalChance: real("critical_chance").notNull().default(0),
    activationManaCost: real("activation_mana_cost").notNull().default(0),
    activationHealthCost: real("activation_health_cost").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("items_activation_mana_cost_nonnegative", sql`${table.activationManaCost} >= 0`),
    check("items_activation_health_cost_nonnegative", sql`${table.activationHealthCost} >= 0`),
  ],
);

export const itemsSpells = pgTable(
  "items_spells",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    spellId: uuid("spell_id")
      .notNull()
      .references(() => spells.id),
  },
  (table) => [
    index("items_spells_item_id_idx").on(table.itemId),
    index("items_spells_spell_id_idx").on(table.spellId),
    unique("items_spells_item_id_spell_id_unique").on(table.itemId, table.spellId),
  ],
);
// Item-spell links are optional; items can exist without rows in items_spells.

export const units = pgTable(
  "units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    meleeDmg: real("melee_dmg").notNull().default(0),
    health: real("health").notNull().default(0),
    mana: real("mana").notNull().default(100),
    rangedDmg: real("ranged_dmg").notNull().default(0),
    manaRegen: real("mana_regen").notNull().default(0),
    spellDmg: real("spell_dmg").notNull().default(0),
    speed: real("speed").notNull().default(0),
    dodge: real("dodge").notNull().default(0),
    criticalChance: real("critical_chance").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [check("units_mana_nonnegative", sql`${table.mana} >= 0`)],
);

// Unique on (unitId, priority) — not (unitId, itemId) — so the same item
// can be assigned to a unit at different priority slots (e.g., dual-wielding).
export const unitsItems = pgTable(
  "units_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    priority: integer("priority").notNull().default(1),
  },
  (table) => [
    index("units_items_item_id_idx").on(table.itemId),
    index("units_items_unit_id_idx").on(table.unitId),
    check("units_items_priority_positive", sql`${table.priority} > 0`),
    unique("units_items_unit_id_priority_unique").on(table.unitId, table.priority),
  ],
);

export const scenarios = pgTable("scenarios", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const scenariosRows = pgTable(
  "scenarios_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scenarioId: uuid("scenario_id")
      .notNull()
      .references(() => scenarios.id, { onDelete: "cascade" }),
    rowType: rowTypeEnum("row_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("scenarios_rows_scenario_id_idx").on(table.scenarioId),
    unique("scenarios_rows_scenario_id_row_type_unique").on(table.scenarioId, table.rowType),
  ],
);

// Unique on (rowId, slot) — not (rowId, unitId) — so the same unit can occupy
// multiple slots within the same row and appear in multiple rows within the
// same scenario (e.g., fielding duplicate squads or versatile units).
export const scenariosRowsUnits = pgTable(
  "scenarios_rows_units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rowId: uuid("row_id")
      .notNull()
      .references(() => scenariosRows.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    slot: integer("slot").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("scenarios_rows_units_row_id_idx").on(table.rowId),
    index("scenarios_rows_units_unit_id_idx").on(table.unitId),
    check("scenarios_rows_units_slot_positive", sql`${table.slot} >= 1`),
    unique("scenarios_rows_units_row_id_slot_unique").on(table.rowId, table.slot),
  ],
);

export const battleReplays = pgTable(
  "battle_replays",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scenarioAId: uuid("scenario_a_id")
      .notNull()
      .references(() => scenarios.id, { onDelete: "cascade" }),
    scenarioBId: uuid("scenario_b_id")
      .notNull()
      .references(() => scenarios.id, { onDelete: "cascade" }),
    seed: text("seed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("battle_replays_scenario_a_id_idx").on(table.scenarioAId),
    index("battle_replays_scenario_b_id_idx").on(table.scenarioBId),
    check("battle_replays_distinct_scenarios", sql`${table.scenarioAId} <> ${table.scenarioBId}`),
  ],
);
