import { effects, spells, spellsEffects } from "./schema";

const now = new Date();

export function buildSeedData(hashedPassword: string) {
  const users = [
    {
      id: "seed-gm-001",
      name: "Test GM",
      email: "gm@example.com",
      emailVerified: false,
      role: "gm" as const,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed-player-001",
      name: "Test Player",
      email: "player@example.com",
      emailVerified: false,
      role: "player" as const,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const accounts = users.map((user) => ({
    id: `account-${user.id}`,
    userId: user.id,
    accountId: user.id,
    providerId: "credential",
    password: hashedPassword,
    createdAt: now,
    updatedAt: now,
  }));

  return { users, accounts };
}

export const effectSeedData: (typeof effects.$inferInsert)[] = [
  {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "Barbarian Roar",
    effectType: "buff" as const,
    timingType: "instant" as const,
    durationMs: 5000,
    meleeDmg: 20.5
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    name: "Rage",
    effectType: "buff" as const,
    timingType: "interval" as const,
    intervalMs: 1000,
    triggerCount: 5,
    meleeDmg: 10.0,
    rangedDmg: 10.0,
    speed: 0.5
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    name: "Exhaust",
    effectType: "debuff" as const,
    timingType: "instant" as const,
    durationMs: 10000,
    speed: -0.2,
    dodge: -0.2,
    criticalChance: -25,
    meleeDmg: -5,
    rangedDmg: -5,
  },
  {
    id: "a0000000-0000-0000-0000-000000000004",
    name: "Mend",
    effectType: "healing" as const,
    timingType: "instant" as const,
    directHealing: 10.25
  },
  {
    id: "a0000000-0000-0000-0000-000000000005",
    name: "Bandage",
    effectType: "healing" as const,
    timingType: "interval" as const,
    intervalMs: 5000,
    triggerCount: 5,
    health: 10.0,
  },
  {
    id: "a0000000-0000-0000-0000-000000000006",
    name: "Arcane Damage",
    effectType: "damage" as const,
    timingType: "instant" as const,
    directSpellDmg: 8.5,
  },
  {
    id: "a0000000-0000-0000-0000-000000000007",
    name: "Sizzling Flesh",
    effectType: "damage" as const,
    timingType: "interval" as const,
    intervalMs: 1000,
    triggerCount: 2,
    directSpellDmg: 12.5,
  }
];

export const spellSeedData: (typeof spells.$inferInsert)[] = [
  {
    id: "b0000000-0000-0000-0000-000000000001",
    name: "Fireball",
    description: "Hurls a ball of fire at the target, dealing instant arcane damage followed by burning.",
    targetPolicy: "highest_health" as const,
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    name: "Battle Cry",
    description: "A mighty roar that buffs the caster with increased melee damage.",
    targetPolicy: "random" as const,
  },
  {
    id: "b0000000-0000-0000-0000-000000000003",
    name: "Healing Touch",
    description: "Gently mends wounds, restoring health over time.",
    targetPolicy: "lowest_health" as const,
  },
];

export const spellsEffectsSeedData: (typeof spellsEffects.$inferInsert)[] = [
  {
    spellId: "b0000000-0000-0000-0000-000000000001",
    effectTemplateId: "a0000000-0000-0000-0000-000000000006", // Arcane Damage
    sequenceOrder: 1,
  },
  {
    spellId: "b0000000-0000-0000-0000-000000000001",
    effectTemplateId: "a0000000-0000-0000-0000-000000000007", // Sizzling Flesh
    sequenceOrder: 2,
  },
  {
    spellId: "b0000000-0000-0000-0000-000000000002",
    effectTemplateId: "a0000000-0000-0000-0000-000000000001", // Barbarian Roar
    sequenceOrder: 1,
  },
  {
    spellId: "b0000000-0000-0000-0000-000000000003",
    effectTemplateId: "a0000000-0000-0000-0000-000000000004", // Mend
    sequenceOrder: 1,
  },
  {
    spellId: "b0000000-0000-0000-0000-000000000003",
    effectTemplateId: "a0000000-0000-0000-0000-000000000005", // Bandage
    sequenceOrder: 2,
  },
];
