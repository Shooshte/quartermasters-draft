import { getTableColumns } from "drizzle-orm";
import { expect, it } from "vitest";
import { session } from "./schema";

it("stores a non-null server-owned remember choice defaulting to false", () => {
  const columns = getTableColumns(session);
  expect(columns).toHaveProperty("rememberMe");
  const column = columns.rememberMe;
  expect(column.name).toBe("remember_me");
  expect(column.notNull).toBe(true);
  expect(column.default).toBe(false);
});
