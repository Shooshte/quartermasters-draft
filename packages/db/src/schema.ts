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
export const targetScopeEnum = pgEnum("target_scope", [
  "self",
  "self_allies",
  "self_enemies",
  "allies",
  "enemies",
  "both",
]);
export const targetPriorityEnum = pgEnum("target_priority", [
  "highest_health",
  "lowest_health",
  "highest_damage",
  "support",
  "random",
]);
export const targetSelectionShapeEnum = pgEnum("target_selection_shape", [
  "individual",
  "adjacent",
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
    triggerEveryActions: integer("trigger_every_actions"),
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
    lastsForActions: integer("lasts_for_actions"),
    directHealing: real("direct_healing"),
    directMeleeDmg: real("direct_melee_dmg"),
    directRangedDmg: real("direct_ranged_dmg"),
    directSpellDmg: real("direct_spell_dmg"),
  },
  (table) => [
    check(
      "trigger_every_actions_positive",
      sql`${table.triggerEveryActions} IS NULL OR ${table.triggerEveryActions} > 0`,
    ),
    check(
      "trigger_count_positive",
      sql`${table.triggerCount} IS NULL OR ${table.triggerCount} > 0`,
    ),
    check(
      "lasts_for_actions_positive",
      sql`${table.lastsForActions} IS NULL OR ${table.lastsForActions} > 0`,
    ),
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

export const itemsAllowedRows = pgTable(
  "items_allowed_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    rowType: rowTypeEnum("row_type").notNull(),
  },
  (table) => [
    index("items_allowed_rows_item_id_idx").on(table.itemId),
    unique("items_allowed_rows_item_id_row_type_unique").on(table.itemId, table.rowType),
  ],
);

export const itemsEffects = pgTable(
  "items_effects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    effectTemplateId: uuid("effect_template_id")
      .notNull()
      .references(() => effects.id),
    sequenceOrder: integer("sequence_order").notNull(),
  },
  (table) => [
    index("items_effects_item_id_idx").on(table.itemId),
    index("items_effects_effect_template_id_idx").on(table.effectTemplateId),
    check("items_effects_sequence_order_positive", sql`${table.sequenceOrder} > 0`),
    unique("items_effects_item_id_sequence_order_unique").on(table.itemId, table.sequenceOrder),
  ],
);
// Item-effect links are optional; items without rows in items_effects are stat-only.

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
    targetScope: targetScopeEnum("target_scope").notNull().default("enemies"),
    targetPriority: targetPriorityEnum("target_priority").notNull().default("highest_health"),
    targetCount: integer("target_count").notNull().default(1),
    selectionShape: targetSelectionShapeEnum("selection_shape").notNull().default("individual"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check("units_mana_nonnegative", sql`${table.mana} >= 0`),
    check("units_target_count_positive", sql`${table.targetCount} >= 1`),
  ],
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
