import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle({ client, schema });

const now = new Date();

const testGm = {
  id: "seed-gm-001",
  name: "Test GM",
  email: "gm@example.com",
  emailVerified: false,
  role: "gm" as const,
  createdAt: now,
  updatedAt: now,
};

const testPlayer = {
  id: "seed-player-001",
  name: "Test Player",
  email: "player@example.com",
  emailVerified: false,
  role: "player" as const,
  createdAt: now,
  updatedAt: now,
};

try {
  await db.insert(schema.user).values(testGm).onConflictDoNothing();
  await db.insert(schema.user).values(testPlayer).onConflictDoNothing();
  console.log("Seeded test GM and Player users");
  await client.end();
  process.exit(0);
} catch (error) {
  console.error("Seed failed:", error);
  await client.end();
  process.exit(1);
}
