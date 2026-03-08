import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgEnum, pgTable, real, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["gm", "player"]);
export const timingTypeEnum = pgEnum("timing_type", ["instant", "interval"]);
export const effectTypeEnum = pgEnum("effect_type", ["buff", "debuff", "healing", "damage"]);
export const targetPolicyEnum = pgEnum("target_policy", ["highest_health", "lowest_health", "highest_damage", "random"]);

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
    intervalMs: integer("interval_ms"),
    triggerCount: integer("trigger_count"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
    meleeDmg: real("melee_dmg"),
    health: real("health"),
    rangedDmg: real("ranged_dmg"),
    manaRegen: real("mana_regen"),
    spellDmg: real("spell_dmg"),
    speed: real("speed"),
    dodge: real("dodge"),
    criticalChance: real("critical_chance"),
    effectType: effectTypeEnum("effect_type").notNull().default("buff"),
    durationMs: integer("duration_ms"),
    directHealing: real("direct_healing"),
    directMeleeDmg: real("direct_melee_dmg"),
    directRangedDmg: real("direct_ranged_dmg"),
    directSpellDmg: real("direct_spell_dmg"),
  },
  (table) => [
    check("interval_ms_positive", sql`${table.intervalMs} IS NULL OR ${table.intervalMs} > 0`),
    check("trigger_count_positive", sql`${table.triggerCount} IS NULL OR ${table.triggerCount} > 0`),
    check("duration_ms_positive", sql`${table.durationMs} IS NULL OR ${table.durationMs} > 0`),
    check("interval_fields_required", sql`${table.timingType} != 'interval' OR (${table.intervalMs} IS NOT NULL AND ${table.triggerCount} IS NOT NULL)`),
    check("instant_fields_forbidden", sql`${table.timingType} != 'instant' OR (${table.intervalMs} IS NULL AND ${table.triggerCount} IS NULL)`),
  ],
);

export const spells = pgTable("spells", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  description: text("description"),
  targetPolicy: targetPolicyEnum("target_policy").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const spellsEffects = pgTable(
  "spells_effects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    spellId: uuid("spell_id").notNull().references(() => spells.id, { onDelete: "cascade" }),
    effectTemplateId: uuid("effect_template_id").notNull().references(() => effects.id, { onDelete: "cascade" }),
    sequenceOrder: integer("sequence_order").notNull(),
  },
  (table) => [
    index("spells_effects_spell_id_idx").on(table.spellId),
    index("spells_effects_effect_template_id_idx").on(table.effectTemplateId),
    check("sequence_order_positive", sql`${table.sequenceOrder} > 0`),
    unique("spells_effects_spell_id_sequence_order_unique").on(table.spellId, table.sequenceOrder),
  ],
);
