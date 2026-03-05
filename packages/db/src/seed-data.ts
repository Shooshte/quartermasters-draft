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
