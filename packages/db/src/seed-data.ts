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

export const effectTemplateSeedData = [
  {
    name: "Barbarian Roar",
    effectType: "buff" as const,
    timingType: "instant" as const,
    durationMs: 5000,
    meleeDmg: 20.5
  },
  {
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
    name: "Mend",
    effectType: "healing" as const,
    timingType: "instant" as const,
    directHealing: 10.25
  },
  {
    name: "Bandage",
    effectType: "healing" as const,
    timingType: "interval" as const,
    intervalMs: 5000,
    triggerCount: 5,
    health: 10.0,
  },
  {
    name: "Arcane Damage",
    effectType: "damage" as const,
    timingType: "instant" as const,
    directSpellDmg: 8.5,
  },
  {
    name: "Sizzling Flesh",
    effectType: "damage" as const,
    timingType: "interval" as const,
    intervalMs: 1000,
    triggerCount: 2,
    directSpellDmg: 12.5,
  }
];
