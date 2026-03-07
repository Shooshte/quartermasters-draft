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
    name: "TODO_BUFF_INSTANT",
    effectType: "buff" as const,
    timingType: "instant" as const,
    durationMs: 0, // TODO: real duration
    meleeDmg: 1.0, // TODO: real value
  },
  {
    name: "TODO_BUFF_INTERVAL",
    effectType: "buff" as const,
    timingType: "interval" as const,
    intervalMs: 1000, // TODO: real interval
    triggerCount: 3, // TODO: real count
    meleeDmg: 1.0, // TODO: real value
  },
  {
    name: "TODO_DEBUFF_INSTANT",
    effectType: "debuff" as const,
    timingType: "instant" as const,
    durationMs: 0, // TODO: real duration
    speed: -1.0, // TODO: real value
  },
  {
    name: "TODO_HEALING_INSTANT",
    effectType: "healing" as const,
    timingType: "instant" as const,
    directHealing: 1.0, // TODO: real value
  },
  {
    name: "TODO_HEALING_INTERVAL",
    effectType: "healing" as const,
    timingType: "interval" as const,
    intervalMs: 1000, // TODO: real interval
    triggerCount: 3, // TODO: real count
    health: 1.0, // TODO: real value
  },
  {
    name: "TODO_DAMAGE_INSTANT",
    effectType: "damage" as const,
    timingType: "instant" as const,
    directSpellDmg: 1.0, // TODO: real value
  },
];
