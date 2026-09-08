import "dotenv/config";
import { defineConfig } from "drizzle-kit";
import { getRequiredEnv } from "./src/env";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: getRequiredEnv("DATABASE_URL"),
  },
});
