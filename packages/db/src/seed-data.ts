import type {
  effects,
  items,
  itemsAllowedRows,
  itemsEffects,
  scenarios,
  scenariosRows,
  scenariosRowsUnits,
  units,
  unitsItems,
} from "./schema";

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
    durationTicks: 5000,
    meleeDmg: 20.5,
  },
  {
    id: "a0000000-0000-0000-0000-000000000002",
    name: "Rage",
    effectType: "buff" as const,
    timingType: "interval" as const,
    intervalTicks: 1000,
    triggerCount: 5,
    meleeDmg: 10.0,
    rangedDmg: 10.0,
    speed: 0.5,
  },
  {
    id: "a0000000-0000-0000-0000-000000000003",
    name: "Exhaust",
    effectType: "debuff" as const,
    timingType: "instant" as const,
    durationTicks: 10000,
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
    directHealing: 10.25,
  },
  {
    id: "a0000000-0000-0000-0000-000000000005",
    name: "Bandage",
    effectType: "healing" as const,
    timingType: "interval" as const,
    intervalTicks: 5000,
    triggerCount: 5,
    health: 10.0,
    mana: null,
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
    intervalTicks: 1000,
    triggerCount: 2,
    directSpellDmg: 12.5,
  },
  {
    id: "a0000000-0000-0000-0000-000000000008",
    name: "Frostbite",
    effectType: "damage" as const,
    timingType: "instant" as const,
    directSpellDmg: 15.0,
  },
  {
    id: "a0000000-0000-0000-0000-000000000009",
    name: "Guardian Shield",
    effectType: "buff" as const,
    timingType: "instant" as const,
    durationTicks: 8000,
    dodge: 0.3,
  },
  {
    id: "a0000000-0000-0000-0000-000000000010",
    name: "Poison Cloud",
    effectType: "debuff" as const,
    timingType: "interval" as const,
    intervalTicks: 2000,
    triggerCount: 3,
    directSpellDmg: 5.0,
  },
  {
    id: "a0000000-0000-0000-0000-000000000011",
    name: "Rejuvenation",
    effectType: "healing" as const,
    timingType: "interval" as const,
    intervalTicks: 3000,
    triggerCount: 4,
    health: 8.0,
    mana: null,
  },
  {
    id: "a0000000-0000-0000-0000-000000000012",
    name: "Tectonic Pulse",
    effectType: "damage" as const,
    timingType: "instant" as const,
    directSpellDmg: 18.0,
  },
  {
    id: "a0000000-0000-0000-0000-000000000013",
    name: "Thornguard Aura",
    effectType: "buff" as const,
    timingType: "instant" as const,
    durationTicks: 6000,
    dodge: 0.15,
  },
  {
    id: "a0000000-0000-0000-0000-000000000014",
    name: "Umbral Shackles",
    effectType: "debuff" as const,
    timingType: "interval" as const,
    intervalTicks: 1500,
    triggerCount: 4,
    speed: -0.15,
  },
  {
    id: "a0000000-0000-0000-0000-000000000015",
    name: "Verdant Mend",
    effectType: "healing" as const,
    timingType: "instant" as const,
    directHealing: 14.0,
  },
  {
    id: "a0000000-0000-0000-0000-000000000016",
    name: "Wildfire Brand",
    effectType: "damage" as const,
    timingType: "interval" as const,
    intervalTicks: 1200,
    triggerCount: 3,
    directSpellDmg: 6.0,
  },
  {
    id: "a0000000-0000-0000-0000-000000000017",
    name: "Xenon Bulwark",
    effectType: "buff" as const,
    timingType: "instant" as const,
    durationTicks: 7000,
    health: 12.0,
    mana: null,
  },
  {
    id: "a0000000-0000-0000-0000-000000000018",
    name: "Yawning Curse",
    effectType: "debuff" as const,
    timingType: "instant" as const,
    durationTicks: 9000,
    meleeDmg: -4.0,
  },
  {
    id: "a0000000-0000-0000-0000-000000000019",
    name: "Zephyr Renewal",
    effectType: "healing" as const,
    timingType: "interval" as const,
    intervalTicks: 2500,
    triggerCount: 4,
    health: 6.0,
    mana: null,
  },
  {
    id: "a0000000-0000-0000-0000-000000000020",
    name: "Zenith Charge",
    effectType: "buff" as const,
    timingType: "interval" as const,
    intervalTicks: 2000,
    triggerCount: 2,
    meleeDmg: 7.0,
  },
  {
    id: "a0000000-0000-0000-0000-000000000021",
    name: "Zodiac Burst",
    effectType: "damage" as const,
    timingType: "instant" as const,
    directSpellDmg: 20.0,
  },
];

export const itemSeedData: (typeof items.$inferInsert)[] = [
  {
    id: "d0000000-0000-0000-0000-000000000001",
    name: "Iron Sword",
    meleeDmg: 15,
    rangedDmg: 0,
    manaRegen: 0,
    mana: 0,
    spellDmg: 0,
    dodge: 0,
    criticalChance: 5,
    activationManaCost: 0,
    activationHealthCost: 0,
    updatedAt: new Date("2025-01-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000002",
    name: "Oak Staff",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 3,
    mana: 0,
    spellDmg: 12,
    dodge: 0,
    criticalChance: 0,
    activationManaCost: 0,
    activationHealthCost: 0,
    updatedAt: new Date("2025-02-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000003",
    name: "Leather Shield",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 0,
    mana: 0,
    spellDmg: 0,
    dodge: 10,
    criticalChance: 0,
    activationManaCost: 5,
    activationHealthCost: 0,
    updatedAt: new Date("2025-03-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000004",
    name: "Pearl Dagger",
    meleeDmg: 8,
    rangedDmg: 0,
    manaRegen: 0,
    mana: 0,
    spellDmg: 0,
    dodge: 0,
    criticalChance: 8,
    activationManaCost: 0,
    activationHealthCost: 0,
    updatedAt: new Date("2025-04-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000005",
    name: "Quartz Staff",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 5,
    mana: 0,
    spellDmg: 10,
    dodge: 0,
    criticalChance: 0,
    activationManaCost: 0,
    activationHealthCost: 0,
    updatedAt: new Date("2025-05-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000006",
    name: "Ruby Wand",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 2,
    mana: 0,
    spellDmg: 18,
    dodge: 0,
    criticalChance: 5,
    activationManaCost: 5,
    activationHealthCost: 0,
    updatedAt: new Date("2025-06-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000007",
    name: "Silver Shield",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 0,
    mana: 0,
    spellDmg: 0,
    dodge: 15,
    criticalChance: 0,
    activationManaCost: 8,
    activationHealthCost: 0,
    updatedAt: new Date("2025-07-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000008",
    name: "Thunder Hammer",
    meleeDmg: 22,
    rangedDmg: 0,
    manaRegen: 0,
    mana: 0,
    spellDmg: 5,
    dodge: 0,
    criticalChance: 3,
    activationManaCost: 10,
    activationHealthCost: 0,
    updatedAt: new Date("2025-08-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000009",
    name: "Unicorn Horn",
    meleeDmg: 5,
    rangedDmg: 0,
    manaRegen: 8,
    mana: 0,
    spellDmg: 15,
    dodge: 0,
    criticalChance: 10,
    activationManaCost: 0,
    activationHealthCost: 5,
    updatedAt: new Date("2025-09-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000010",
    name: "Venom Blade",
    meleeDmg: 12,
    rangedDmg: 0,
    manaRegen: 0,
    mana: 0,
    spellDmg: 8,
    dodge: 0,
    criticalChance: 12,
    activationManaCost: 0,
    activationHealthCost: 3,
    updatedAt: new Date("2025-10-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000011",
    name: "Wyrm Scale",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 0,
    mana: 0,
    spellDmg: 0,
    dodge: 20,
    criticalChance: 0,
    activationManaCost: 12,
    activationHealthCost: 0,
    updatedAt: new Date("2025-11-01T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000012",
    name: "Jade Lantern",
    meleeDmg: 2,
    rangedDmg: 0,
    manaRegen: 4,
    mana: 0,
    spellDmg: 6,
    dodge: 1,
    criticalChance: 2,
    activationManaCost: 0,
    activationHealthCost: 0,
    updatedAt: new Date("2025-03-15T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000013",
    name: "Knightbreaker Axe",
    meleeDmg: 19,
    rangedDmg: 0,
    manaRegen: 0,
    mana: 0,
    spellDmg: 0,
    dodge: 0,
    criticalChance: 6,
    activationManaCost: 4,
    activationHealthCost: 0,
    updatedAt: new Date("2025-04-15T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000014",
    name: "Luminous Cape",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 2,
    mana: 0,
    spellDmg: 4,
    dodge: 12,
    criticalChance: 0,
    activationManaCost: 3,
    activationHealthCost: 0,
    updatedAt: new Date("2025-05-15T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000015",
    name: "Moonsteel Helm",
    meleeDmg: 4,
    rangedDmg: 0,
    manaRegen: 0,
    mana: 0,
    spellDmg: 0,
    dodge: 6,
    criticalChance: 1,
    activationManaCost: 0,
    activationHealthCost: 0,
    updatedAt: new Date("2025-06-15T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000016",
    name: "Nightglass Orb",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 5,
    mana: 0,
    spellDmg: 14,
    dodge: 0,
    criticalChance: 4,
    activationManaCost: 6,
    activationHealthCost: 0,
    updatedAt: new Date("2025-07-15T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000017",
    name: "Onyx Pike",
    meleeDmg: 11,
    rangedDmg: 6,
    manaRegen: 0,
    mana: 0,
    spellDmg: 0,
    dodge: 2,
    criticalChance: 7,
    activationManaCost: 0,
    activationHealthCost: 0,
    updatedAt: new Date("2025-08-15T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000018",
    name: "Phoenix Mail",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 1,
    mana: 0,
    spellDmg: 0,
    dodge: 9,
    criticalChance: 0,
    activationManaCost: 8,
    activationHealthCost: 0,
    updatedAt: new Date("2025-09-15T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000019",
    name: "Quillblade",
    meleeDmg: 13,
    rangedDmg: 0,
    manaRegen: 0,
    mana: 0,
    spellDmg: 2,
    dodge: 3,
    criticalChance: 11,
    activationManaCost: 0,
    activationHealthCost: 2,
    updatedAt: new Date("2025-09-20T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000020",
    name: "Yew Longbow",
    meleeDmg: 0,
    rangedDmg: 21,
    manaRegen: 0,
    mana: 0,
    spellDmg: 0,
    dodge: 4,
    criticalChance: 9,
    activationManaCost: 0,
    activationHealthCost: 0,
    updatedAt: new Date("2025-09-25T00:00:00Z"),
  },
  {
    id: "d0000000-0000-0000-0000-000000000021",
    name: "Zircon Crown",
    meleeDmg: 0,
    rangedDmg: 0,
    manaRegen: 6,
    mana: 0,
    spellDmg: 9,
    dodge: 5,
    criticalChance: 3,
    activationManaCost: 4,
    activationHealthCost: 0,
    updatedAt: new Date("2025-09-30T00:00:00Z"),
  },
];

export const itemsEffectsSeedData: (typeof itemsEffects.$inferInsert)[] = [
  {
    id: "c0000000-0000-0000-0000-000000000001",
    itemId: "d0000000-0000-0000-0000-000000000001",
    effectTemplateId: "a0000000-0000-0000-0000-000000000006",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000002",
    itemId: "d0000000-0000-0000-0000-000000000001",
    effectTemplateId: "a0000000-0000-0000-0000-000000000007",
    sequenceOrder: 2,
  },
  {
    id: "c0000000-0000-0000-0000-000000000003",
    itemId: "d0000000-0000-0000-0000-000000000002",
    effectTemplateId: "a0000000-0000-0000-0000-000000000001",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000004",
    itemId: "d0000000-0000-0000-0000-000000000003",
    effectTemplateId: "a0000000-0000-0000-0000-000000000004",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000005",
    itemId: "d0000000-0000-0000-0000-000000000003",
    effectTemplateId: "a0000000-0000-0000-0000-000000000005",
    sequenceOrder: 2,
  },
  {
    id: "c0000000-0000-0000-0000-000000000006",
    itemId: "d0000000-0000-0000-0000-000000000004",
    effectTemplateId: "a0000000-0000-0000-0000-000000000009",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000007",
    itemId: "d0000000-0000-0000-0000-000000000005",
    effectTemplateId: "a0000000-0000-0000-0000-000000000012",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000008",
    itemId: "d0000000-0000-0000-0000-000000000006",
    effectTemplateId: "a0000000-0000-0000-0000-000000000020",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000009",
    itemId: "d0000000-0000-0000-0000-000000000007",
    effectTemplateId: "a0000000-0000-0000-0000-000000000012",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000010",
    itemId: "d0000000-0000-0000-0000-000000000008",
    effectTemplateId: "a0000000-0000-0000-0000-000000000008",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000011",
    itemId: "d0000000-0000-0000-0000-000000000009",
    effectTemplateId: "a0000000-0000-0000-0000-000000000017",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000012",
    itemId: "d0000000-0000-0000-0000-000000000010",
    effectTemplateId: "a0000000-0000-0000-0000-000000000015",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000013",
    itemId: "d0000000-0000-0000-0000-000000000011",
    effectTemplateId: "a0000000-0000-0000-0000-000000000016",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000014",
    itemId: "d0000000-0000-0000-0000-000000000012",
    effectTemplateId: "a0000000-0000-0000-0000-000000000012",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000015",
    itemId: "d0000000-0000-0000-0000-000000000013",
    effectTemplateId: "a0000000-0000-0000-0000-000000000013",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000016",
    itemId: "d0000000-0000-0000-0000-000000000014",
    effectTemplateId: "a0000000-0000-0000-0000-000000000020",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000017",
    itemId: "d0000000-0000-0000-0000-000000000015",
    effectTemplateId: "a0000000-0000-0000-0000-000000000009",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000018",
    itemId: "d0000000-0000-0000-0000-000000000016",
    effectTemplateId: "a0000000-0000-0000-0000-000000000014",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000019",
    itemId: "d0000000-0000-0000-0000-000000000017",
    effectTemplateId: "a0000000-0000-0000-0000-000000000015",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000020",
    itemId: "d0000000-0000-0000-0000-000000000018",
    effectTemplateId: "a0000000-0000-0000-0000-000000000020",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000021",
    itemId: "d0000000-0000-0000-0000-000000000019",
    effectTemplateId: "a0000000-0000-0000-0000-000000000016",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000022",
    itemId: "d0000000-0000-0000-0000-000000000020",
    effectTemplateId: "a0000000-0000-0000-0000-000000000020",
    sequenceOrder: 1,
  },
  {
    id: "c0000000-0000-0000-0000-000000000023",
    itemId: "d0000000-0000-0000-0000-000000000021",
    effectTemplateId: "a0000000-0000-0000-0000-000000000019",
    sequenceOrder: 1,
  },
];

export const unitSeedData: (typeof units.$inferInsert)[] = [
  {
    id: "f0000000-0000-0000-0000-000000000001",
    name: "Barbarian",
    targetScope: "enemies" as const,
    targetPriority: "random" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 25,
    health: 120,
    rangedDmg: 5,
    manaRegen: 1,
    mana: 100,
    spellDmg: 0,
    speed: 0.8,
    dodge: 5,
    criticalChance: 10,
    updatedAt: new Date("2025-01-01T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000002",
    name: "Mage",
    targetScope: "enemies" as const,
    targetPriority: "highest_health" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 5,
    health: 70,
    rangedDmg: 10,
    manaRegen: 8,
    mana: 100,
    spellDmg: 30,
    speed: 0.6,
    dodge: 3,
    criticalChance: 15,
    updatedAt: new Date("2025-02-01T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000003",
    name: "Ranger",
    targetScope: "enemies" as const,
    targetPriority: "lowest_health" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 10,
    health: 90,
    rangedDmg: 25,
    manaRegen: 3,
    mana: 100,
    spellDmg: 5,
    speed: 1.0,
    dodge: 12,
    criticalChance: 20,
    updatedAt: new Date("2025-03-01T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000004",
    name: "Samurai",
    targetScope: "enemies" as const,
    targetPriority: "lowest_health" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 28,
    health: 100,
    rangedDmg: 0,
    manaRegen: 0,
    mana: 100,
    spellDmg: 0,
    speed: 0.9,
    dodge: 8,
    criticalChance: 18,
    updatedAt: new Date("2025-04-01T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000005",
    name: "Templar",
    targetScope: "enemies" as const,
    targetPriority: "highest_damage" as const,
    targetCount: 3,
    selectionShape: "adjacent" as const,
    meleeDmg: 18,
    health: 130,
    rangedDmg: 0,
    manaRegen: 4,
    mana: 100,
    spellDmg: 10,
    speed: 0.5,
    dodge: 6,
    criticalChance: 5,
    updatedAt: new Date("2025-05-01T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000006",
    name: "Undead Knight",
    targetScope: "enemies" as const,
    targetPriority: "highest_health" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 20,
    health: 110,
    rangedDmg: 0,
    manaRegen: 2,
    mana: 100,
    spellDmg: 5,
    speed: 0.6,
    dodge: 4,
    criticalChance: 8,
    updatedAt: new Date("2025-06-01T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000007",
    name: "Valkyrie",
    targetScope: "enemies" as const,
    targetPriority: "random" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 22,
    health: 105,
    rangedDmg: 15,
    manaRegen: 3,
    mana: 100,
    spellDmg: 8,
    speed: 0.8,
    dodge: 10,
    criticalChance: 12,
    updatedAt: new Date("2025-07-01T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000008",
    name: "Warlord",
    targetScope: "enemies" as const,
    targetPriority: "highest_damage" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 30,
    health: 115,
    rangedDmg: 5,
    manaRegen: 1,
    mana: 100,
    spellDmg: 0,
    speed: 0.7,
    dodge: 3,
    criticalChance: 15,
    updatedAt: new Date("2025-08-01T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000009",
    name: "Xenomancer",
    targetScope: "enemies" as const,
    targetPriority: "lowest_health" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 3,
    health: 65,
    rangedDmg: 8,
    manaRegen: 10,
    mana: 100,
    spellDmg: 35,
    speed: 0.5,
    dodge: 2,
    criticalChance: 20,
    updatedAt: new Date("2025-09-01T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000010",
    name: "Yeti Rider",
    targetScope: "enemies" as const,
    targetPriority: "lowest_health" as const,
    targetCount: 2,
    selectionShape: "individual" as const,
    meleeDmg: 20,
    health: 140,
    rangedDmg: 0,
    manaRegen: 0,
    mana: 100,
    spellDmg: 0,
    speed: 0.6,
    dodge: 7,
    criticalChance: 5,
    updatedAt: new Date("2025-10-01T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000011",
    name: "Zephyr Monk",
    targetScope: "enemies" as const,
    targetPriority: "highest_damage" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 15,
    health: 80,
    rangedDmg: 20,
    manaRegen: 5,
    mana: 100,
    spellDmg: 10,
    speed: 1.2,
    dodge: 18,
    criticalChance: 22,
    updatedAt: new Date("2025-11-01T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000012",
    name: "Nimbus Adept",
    targetScope: "enemies" as const,
    targetPriority: "highest_damage" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 8,
    health: 88,
    rangedDmg: 14,
    manaRegen: 6,
    mana: 100,
    spellDmg: 18,
    speed: 0.9,
    dodge: 9,
    criticalChance: 11,
    updatedAt: new Date("2025-03-15T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000013",
    name: "Obsidian Archer",
    targetScope: "enemies" as const,
    targetPriority: "lowest_health" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 9,
    health: 85,
    rangedDmg: 27,
    manaRegen: 2,
    mana: 100,
    spellDmg: 4,
    speed: 1.1,
    dodge: 13,
    criticalChance: 17,
    updatedAt: new Date("2025-04-15T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000014",
    name: "Phantom Brute",
    targetScope: "enemies" as const,
    targetPriority: "highest_health" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 24,
    health: 125,
    rangedDmg: 0,
    manaRegen: 0,
    mana: 100,
    spellDmg: 0,
    speed: 0.5,
    dodge: 4,
    criticalChance: 7,
    updatedAt: new Date("2025-05-15T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000015",
    name: "Quartz Sage",
    targetScope: "enemies" as const,
    targetPriority: "random" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 4,
    health: 72,
    rangedDmg: 8,
    manaRegen: 9,
    mana: 100,
    spellDmg: 28,
    speed: 0.7,
    dodge: 5,
    criticalChance: 14,
    updatedAt: new Date("2025-06-15T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000016",
    name: "Runeblade Duelist",
    targetScope: "enemies" as const,
    targetPriority: "highest_damage" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 21,
    health: 96,
    rangedDmg: 5,
    manaRegen: 2,
    mana: 100,
    spellDmg: 6,
    speed: 1.0,
    dodge: 14,
    criticalChance: 19,
    updatedAt: new Date("2025-07-15T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000017",
    name: "Sunforged Cleric",
    targetScope: "enemies" as const,
    targetPriority: "lowest_health" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 7,
    health: 102,
    rangedDmg: 0,
    manaRegen: 7,
    mana: 100,
    spellDmg: 19,
    speed: 0.6,
    dodge: 6,
    criticalChance: 9,
    updatedAt: new Date("2025-08-15T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000018",
    name: "Thunder Warden",
    targetScope: "enemies" as const,
    targetPriority: "random" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 23,
    health: 118,
    rangedDmg: 4,
    manaRegen: 1,
    mana: 100,
    spellDmg: 3,
    speed: 0.7,
    dodge: 5,
    criticalChance: 10,
    updatedAt: new Date("2025-09-15T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000019",
    name: "Umbral Beast",
    targetScope: "enemies" as const,
    targetPriority: "highest_health" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 26,
    health: 112,
    rangedDmg: 0,
    manaRegen: 0,
    mana: 100,
    spellDmg: 0,
    speed: 0.8,
    dodge: 8,
    criticalChance: 13,
    updatedAt: new Date("2025-09-20T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000020",
    name: "Yojimbo Captain",
    targetScope: "enemies" as const,
    targetPriority: "highest_damage" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 19,
    health: 108,
    rangedDmg: 11,
    manaRegen: 1,
    mana: 100,
    spellDmg: 0,
    speed: 0.9,
    dodge: 9,
    criticalChance: 16,
    updatedAt: new Date("2025-09-25T00:00:00Z"),
  },
  {
    id: "f0000000-0000-0000-0000-000000000021",
    name: "Zircon Juggernaut",
    targetScope: "enemies" as const,
    targetPriority: "lowest_health" as const,
    targetCount: 1,
    selectionShape: "individual" as const,
    meleeDmg: 31,
    health: 150,
    rangedDmg: 0,
    manaRegen: 0,
    mana: 100,
    spellDmg: 0,
    speed: 0.4,
    dodge: 2,
    criticalChance: 6,
    updatedAt: new Date("2025-09-30T00:00:00Z"),
  },
];

const allRowTypes = ["support", "ranged", "melee", "tank"] as const;

export const itemAllowedRowSeedData: (typeof itemsAllowedRows.$inferInsert)[] =
  itemSeedData.flatMap((item, itemIndex) => {
    const itemId = item.id;
    if (typeof itemId !== "string") {
      throw new Error("Every seeded item must have a deterministic string id");
    }

    return allRowTypes.map((rowType, rowIndex) => ({
      id: `e1000000-0000-0000-0000-${String(itemIndex * allRowTypes.length + rowIndex + 1).padStart(12, "0")}`,
      itemId,
      rowType,
    }));
  });

export const unitsItemsSeedData: (typeof unitsItems.$inferInsert)[] = [
  {
    id: "a1000000-0000-0000-0000-000000000001",
    unitId: "f0000000-0000-0000-0000-000000000001", // Barbarian
    itemId: "d0000000-0000-0000-0000-000000000001", // Iron Sword
    priority: 1,
  },
  {
    id: "a1000000-0000-0000-0000-000000000002",
    unitId: "f0000000-0000-0000-0000-000000000002", // Mage
    itemId: "d0000000-0000-0000-0000-000000000002", // Oak Staff
    priority: 1,
  },
  {
    id: "a1000000-0000-0000-0000-000000000003",
    unitId: "f0000000-0000-0000-0000-000000000003", // Ranger
    itemId: "d0000000-0000-0000-0000-000000000003", // Leather Shield
    priority: 1,
  },
];

export const scenarioSeedData: (typeof scenarios.$inferInsert)[] = [
  {
    id: "a2000000-0000-0000-0000-000000000001",
    name: "Ambush at Dawn",
    createdAt: new Date("2025-04-01T00:00:00Z"),
    updatedAt: new Date("2025-04-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000002",
    name: "Castle Siege",
    createdAt: new Date("2025-05-01T00:00:00Z"),
    updatedAt: new Date("2025-05-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000003",
    name: "Bridge Defense",
    createdAt: new Date("2025-07-01T00:00:00Z"),
    updatedAt: new Date("2025-07-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000004",
    name: "Dragon's Lair",
    createdAt: new Date("2025-08-01T00:00:00Z"),
    updatedAt: new Date("2025-08-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000005",
    name: "Eclipse Ritual",
    createdAt: new Date("2025-09-01T00:00:00Z"),
    updatedAt: new Date("2025-09-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000006",
    name: "Forest Ambush",
    createdAt: new Date("2025-10-01T00:00:00Z"),
    updatedAt: new Date("2025-10-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000007",
    name: "Goblin Raid",
    createdAt: new Date("2025-11-01T00:00:00Z"),
    updatedAt: new Date("2025-11-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000008",
    name: "Harbor Assault",
    createdAt: new Date("2025-12-01T00:00:00Z"),
    updatedAt: new Date("2025-12-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000009",
    name: "Ice Cavern",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000010",
    name: "Jungle Trek",
    createdAt: new Date("2026-02-01T00:00:00Z"),
    updatedAt: new Date("2026-02-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000011",
    name: "Zombie Horde",
    createdAt: new Date("2025-06-01T00:00:00Z"),
    updatedAt: new Date("2025-06-01T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000012",
    name: "Kraken Depths",
    createdAt: new Date("2025-07-15T00:00:00Z"),
    updatedAt: new Date("2025-07-15T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000013",
    name: "Lunar Outpost",
    createdAt: new Date("2025-08-15T00:00:00Z"),
    updatedAt: new Date("2025-08-15T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000014",
    name: "Molten Crossing",
    createdAt: new Date("2025-09-15T00:00:00Z"),
    updatedAt: new Date("2025-09-15T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000015",
    name: "Nightfall Bastion",
    createdAt: new Date("2025-10-15T00:00:00Z"),
    updatedAt: new Date("2025-10-15T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000016",
    name: "Obsidian Pass",
    createdAt: new Date("2025-11-15T00:00:00Z"),
    updatedAt: new Date("2025-11-15T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000017",
    name: "Phantom Encampment",
    createdAt: new Date("2025-12-15T00:00:00Z"),
    updatedAt: new Date("2025-12-15T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000018",
    name: "Runic Stronghold",
    createdAt: new Date("2025-07-20T00:00:00Z"),
    updatedAt: new Date("2025-07-20T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000019",
    name: "Sunken Vault",
    createdAt: new Date("2025-08-20T00:00:00Z"),
    updatedAt: new Date("2025-08-20T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000020",
    name: "Titan's Wake",
    createdAt: new Date("2025-09-20T00:00:00Z"),
    updatedAt: new Date("2025-09-20T00:00:00Z"),
  },
  {
    id: "a2000000-0000-0000-0000-000000000021",
    name: "Zorath Keep",
    createdAt: new Date("2025-10-20T00:00:00Z"),
    updatedAt: new Date("2025-10-20T00:00:00Z"),
  },
];

export const scenariosRowsSeedData: (typeof scenariosRows.$inferInsert)[] = [
  {
    id: "a3000000-0000-0000-0000-000000000003",
    scenarioId: "a2000000-0000-0000-0000-000000000001", // Ambush at Dawn
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000004",
    scenarioId: "a2000000-0000-0000-0000-000000000001", // Ambush at Dawn
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000002",
    scenarioId: "a2000000-0000-0000-0000-000000000001", // Ambush at Dawn
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000001",
    scenarioId: "a2000000-0000-0000-0000-000000000001", // Ambush at Dawn
    rowType: "tank" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000007",
    scenarioId: "a2000000-0000-0000-0000-000000000002", // Castle Siege
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000008",
    scenarioId: "a2000000-0000-0000-0000-000000000002", // Castle Siege
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000006",
    scenarioId: "a2000000-0000-0000-0000-000000000002", // Castle Siege
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000005",
    scenarioId: "a2000000-0000-0000-0000-000000000002", // Castle Siege
    rowType: "tank" as const,
  },
  // Bridge Defense
  {
    id: "a3000000-0000-0000-0000-000000000009",
    scenarioId: "a2000000-0000-0000-0000-000000000003", // Bridge Defense
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000010",
    scenarioId: "a2000000-0000-0000-0000-000000000003", // Bridge Defense
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000011",
    scenarioId: "a2000000-0000-0000-0000-000000000003", // Bridge Defense
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000012",
    scenarioId: "a2000000-0000-0000-0000-000000000003", // Bridge Defense
    rowType: "tank" as const,
  },
  // Dragon's Lair
  {
    id: "a3000000-0000-0000-0000-000000000013",
    scenarioId: "a2000000-0000-0000-0000-000000000004", // Dragon's Lair
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000014",
    scenarioId: "a2000000-0000-0000-0000-000000000004", // Dragon's Lair
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000015",
    scenarioId: "a2000000-0000-0000-0000-000000000004", // Dragon's Lair
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000016",
    scenarioId: "a2000000-0000-0000-0000-000000000004", // Dragon's Lair
    rowType: "tank" as const,
  },
  // Eclipse Ritual
  {
    id: "a3000000-0000-0000-0000-000000000017",
    scenarioId: "a2000000-0000-0000-0000-000000000005", // Eclipse Ritual
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000018",
    scenarioId: "a2000000-0000-0000-0000-000000000005", // Eclipse Ritual
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000019",
    scenarioId: "a2000000-0000-0000-0000-000000000005", // Eclipse Ritual
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000020",
    scenarioId: "a2000000-0000-0000-0000-000000000005", // Eclipse Ritual
    rowType: "tank" as const,
  },
  // Forest Ambush
  {
    id: "a3000000-0000-0000-0000-000000000021",
    scenarioId: "a2000000-0000-0000-0000-000000000006", // Forest Ambush
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000022",
    scenarioId: "a2000000-0000-0000-0000-000000000006", // Forest Ambush
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000023",
    scenarioId: "a2000000-0000-0000-0000-000000000006", // Forest Ambush
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000024",
    scenarioId: "a2000000-0000-0000-0000-000000000006", // Forest Ambush
    rowType: "tank" as const,
  },
  // Goblin Raid
  {
    id: "a3000000-0000-0000-0000-000000000025",
    scenarioId: "a2000000-0000-0000-0000-000000000007", // Goblin Raid
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000026",
    scenarioId: "a2000000-0000-0000-0000-000000000007", // Goblin Raid
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000027",
    scenarioId: "a2000000-0000-0000-0000-000000000007", // Goblin Raid
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000028",
    scenarioId: "a2000000-0000-0000-0000-000000000007", // Goblin Raid
    rowType: "tank" as const,
  },
  // Harbor Assault
  {
    id: "a3000000-0000-0000-0000-000000000029",
    scenarioId: "a2000000-0000-0000-0000-000000000008", // Harbor Assault
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000030",
    scenarioId: "a2000000-0000-0000-0000-000000000008", // Harbor Assault
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000031",
    scenarioId: "a2000000-0000-0000-0000-000000000008", // Harbor Assault
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000032",
    scenarioId: "a2000000-0000-0000-0000-000000000008", // Harbor Assault
    rowType: "tank" as const,
  },
  // Ice Cavern
  {
    id: "a3000000-0000-0000-0000-000000000033",
    scenarioId: "a2000000-0000-0000-0000-000000000009", // Ice Cavern
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000034",
    scenarioId: "a2000000-0000-0000-0000-000000000009", // Ice Cavern
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000035",
    scenarioId: "a2000000-0000-0000-0000-000000000009", // Ice Cavern
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000036",
    scenarioId: "a2000000-0000-0000-0000-000000000009", // Ice Cavern
    rowType: "tank" as const,
  },
  // Jungle Trek
  {
    id: "a3000000-0000-0000-0000-000000000037",
    scenarioId: "a2000000-0000-0000-0000-000000000010", // Jungle Trek
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000038",
    scenarioId: "a2000000-0000-0000-0000-000000000010", // Jungle Trek
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000039",
    scenarioId: "a2000000-0000-0000-0000-000000000010", // Jungle Trek
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000040",
    scenarioId: "a2000000-0000-0000-0000-000000000010", // Jungle Trek
    rowType: "tank" as const,
  },
  // Zombie Horde
  {
    id: "a3000000-0000-0000-0000-000000000041",
    scenarioId: "a2000000-0000-0000-0000-000000000011", // Zombie Horde
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000042",
    scenarioId: "a2000000-0000-0000-0000-000000000011", // Zombie Horde
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000043",
    scenarioId: "a2000000-0000-0000-0000-000000000011", // Zombie Horde
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000044",
    scenarioId: "a2000000-0000-0000-0000-000000000011", // Zombie Horde
    rowType: "tank" as const,
  },
  // Kraken Depths
  {
    id: "a3000000-0000-0000-0000-000000000045",
    scenarioId: "a2000000-0000-0000-0000-000000000012", // Kraken Depths
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000046",
    scenarioId: "a2000000-0000-0000-0000-000000000012", // Kraken Depths
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000047",
    scenarioId: "a2000000-0000-0000-0000-000000000012", // Kraken Depths
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000048",
    scenarioId: "a2000000-0000-0000-0000-000000000012", // Kraken Depths
    rowType: "tank" as const,
  },
  // Lunar Outpost
  {
    id: "a3000000-0000-0000-0000-000000000049",
    scenarioId: "a2000000-0000-0000-0000-000000000013", // Lunar Outpost
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000050",
    scenarioId: "a2000000-0000-0000-0000-000000000013", // Lunar Outpost
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000051",
    scenarioId: "a2000000-0000-0000-0000-000000000013", // Lunar Outpost
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000052",
    scenarioId: "a2000000-0000-0000-0000-000000000013", // Lunar Outpost
    rowType: "tank" as const,
  },
  // Molten Crossing
  {
    id: "a3000000-0000-0000-0000-000000000053",
    scenarioId: "a2000000-0000-0000-0000-000000000014", // Molten Crossing
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000054",
    scenarioId: "a2000000-0000-0000-0000-000000000014", // Molten Crossing
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000055",
    scenarioId: "a2000000-0000-0000-0000-000000000014", // Molten Crossing
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000056",
    scenarioId: "a2000000-0000-0000-0000-000000000014", // Molten Crossing
    rowType: "tank" as const,
  },
  // Nightfall Bastion
  {
    id: "a3000000-0000-0000-0000-000000000057",
    scenarioId: "a2000000-0000-0000-0000-000000000015", // Nightfall Bastion
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000058",
    scenarioId: "a2000000-0000-0000-0000-000000000015", // Nightfall Bastion
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000059",
    scenarioId: "a2000000-0000-0000-0000-000000000015", // Nightfall Bastion
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000060",
    scenarioId: "a2000000-0000-0000-0000-000000000015", // Nightfall Bastion
    rowType: "tank" as const,
  },
  // Obsidian Pass
  {
    id: "a3000000-0000-0000-0000-000000000061",
    scenarioId: "a2000000-0000-0000-0000-000000000016", // Obsidian Pass
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000062",
    scenarioId: "a2000000-0000-0000-0000-000000000016", // Obsidian Pass
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000063",
    scenarioId: "a2000000-0000-0000-0000-000000000016", // Obsidian Pass
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000064",
    scenarioId: "a2000000-0000-0000-0000-000000000016", // Obsidian Pass
    rowType: "tank" as const,
  },
  // Phantom Encampment
  {
    id: "a3000000-0000-0000-0000-000000000065",
    scenarioId: "a2000000-0000-0000-0000-000000000017", // Phantom Encampment
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000066",
    scenarioId: "a2000000-0000-0000-0000-000000000017", // Phantom Encampment
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000067",
    scenarioId: "a2000000-0000-0000-0000-000000000017", // Phantom Encampment
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000068",
    scenarioId: "a2000000-0000-0000-0000-000000000017", // Phantom Encampment
    rowType: "tank" as const,
  },
  // Runic Stronghold
  {
    id: "a3000000-0000-0000-0000-000000000069",
    scenarioId: "a2000000-0000-0000-0000-000000000018", // Runic Stronghold
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000070",
    scenarioId: "a2000000-0000-0000-0000-000000000018", // Runic Stronghold
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000071",
    scenarioId: "a2000000-0000-0000-0000-000000000018", // Runic Stronghold
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000072",
    scenarioId: "a2000000-0000-0000-0000-000000000018", // Runic Stronghold
    rowType: "tank" as const,
  },
  // Sunken Vault
  {
    id: "a3000000-0000-0000-0000-000000000073",
    scenarioId: "a2000000-0000-0000-0000-000000000019", // Sunken Vault
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000074",
    scenarioId: "a2000000-0000-0000-0000-000000000019", // Sunken Vault
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000075",
    scenarioId: "a2000000-0000-0000-0000-000000000019", // Sunken Vault
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000076",
    scenarioId: "a2000000-0000-0000-0000-000000000019", // Sunken Vault
    rowType: "tank" as const,
  },
  // Titan's Wake
  {
    id: "a3000000-0000-0000-0000-000000000077",
    scenarioId: "a2000000-0000-0000-0000-000000000020", // Titan's Wake
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000078",
    scenarioId: "a2000000-0000-0000-0000-000000000020", // Titan's Wake
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000079",
    scenarioId: "a2000000-0000-0000-0000-000000000020", // Titan's Wake
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000080",
    scenarioId: "a2000000-0000-0000-0000-000000000020", // Titan's Wake
    rowType: "tank" as const,
  },
  // Zorath Keep
  {
    id: "a3000000-0000-0000-0000-000000000081",
    scenarioId: "a2000000-0000-0000-0000-000000000021", // Zorath Keep
    rowType: "ranged" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000082",
    scenarioId: "a2000000-0000-0000-0000-000000000021", // Zorath Keep
    rowType: "support" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000083",
    scenarioId: "a2000000-0000-0000-0000-000000000021", // Zorath Keep
    rowType: "melee" as const,
  },
  {
    id: "a3000000-0000-0000-0000-000000000084",
    scenarioId: "a2000000-0000-0000-0000-000000000021", // Zorath Keep
    rowType: "tank" as const,
  },
];

export const scenariosRowsUnitsSeedData: (typeof scenariosRowsUnits.$inferInsert)[] = [
  {
    id: "a4000000-0000-0000-0000-000000000001",
    rowId: "a3000000-0000-0000-0000-000000000002", // melee row
    unitId: "f0000000-0000-0000-0000-000000000001", // Barbarian
    slot: 1,
  },
  {
    id: "a4000000-0000-0000-0000-000000000002",
    rowId: "a3000000-0000-0000-0000-000000000003", // ranged row
    unitId: "f0000000-0000-0000-0000-000000000002", // Mage
    slot: 1,
  },
  {
    id: "a4000000-0000-0000-0000-000000000003",
    rowId: "a3000000-0000-0000-0000-000000000004", // support row
    unitId: "f0000000-0000-0000-0000-000000000003", // Ranger
    slot: 1,
  },
];
