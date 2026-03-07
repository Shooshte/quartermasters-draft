import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";

import * as schema from "./schema";
import { buildSeedData, effectTemplateSeedData } from "./seed-data";

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle({ client, schema });

try {
  const hashedPassword = await hashPassword("password123");
  const { users, accounts } = buildSeedData(hashedPassword);

  for (const user of users) {
    await db.insert(schema.user).values(user).onConflictDoNothing();
  }
  for (const account of accounts) {
    await db.insert(schema.account).values(account).onConflictDoNothing();
  }
  for (const template of effectTemplateSeedData) {
    await db.insert(schema.effectTemplates).values(template).onConflictDoNothing();
  }

  console.log("Seeded test GM and Player users with account records");
  await client.end();
  process.exit(0);
} catch (error) {
  console.error("Seed failed:", error);
  await client.end();
  process.exit(1);
}
