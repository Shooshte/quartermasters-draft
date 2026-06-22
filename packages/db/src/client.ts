import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getRequiredEnv } from "./env";
import * as schema from "./schema";

const client = postgres(getRequiredEnv("DATABASE_URL"));

export const db = drizzle({ client, schema });
