import { z } from "zod";

export const listInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(500).default(100),
});

export const listInput = listInputSchema.default({});

type DbErrorLike = {
  code?: string;
  constraint?: string;
  cause?: unknown;
};

export function findDbError(error: unknown): DbErrorLike | null {
  const seen = new Set<object>();
  let current: unknown = error;

  while (typeof current === "object" && current !== null && !seen.has(current)) {
    seen.add(current);

    const candidate = current as DbErrorLike;
    if (typeof candidate.code === "string") {
      return {
        code: candidate.code,
        constraint: typeof candidate.constraint === "string" ? candidate.constraint : undefined,
      };
    }

    current = candidate.cause;
  }

  return null;
}
