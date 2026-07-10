import { TRPCError } from "@trpc/server";
import { findDbError } from "./shared";

export function throwUniqueNameConflict(error: unknown, entityLabel: string): never {
  if (findDbError(error)?.code === "23505") {
    const article = entityLabel === "unit" || !/^[aeiou]/i.test(entityLabel) ? "A" : "An";
    throw new TRPCError({
      code: "CONFLICT",
      message: `${article} ${entityLabel} with this name already exists.`,
    });
  }

  throw error;
}

export function throwDeleteConflict(
  error: unknown,
  message: string,
  acceptedCodes: readonly string[] = ["23503"],
): never {
  const code = findDbError(error)?.code;
  if (code && acceptedCodes.includes(code)) {
    throw new TRPCError({ code: "CONFLICT", message });
  }

  throw error;
}
