import { db } from "@qd/db";
import * as schema from "@qd/db/schema";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { authConfig } from "./auth-config";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  ...authConfig,
});

export type Session = typeof auth.$Infer.Session;
