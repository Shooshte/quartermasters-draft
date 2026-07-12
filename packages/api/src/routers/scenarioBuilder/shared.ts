import { z } from "zod";

export const listInputSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(500).default(100),
});

export const listInput = listInputSchema.prefault({});

export function createListInputSchema<
  const TSortValues extends readonly [string, ...string[]],
  TLinkageSchema extends z.ZodDefault,
>(
  sortValues: TSortValues,
  defaults: {
    sortBy: TSortValues[number];
    sortDir?: "asc" | "desc";
    limit?: number;
  },
  linkageSchema: TLinkageSchema,
) {
  const schema = listInputSchema.extend({
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .default(defaults.limit ?? 20),
    sortBy: z.enum(sortValues).default(defaults.sortBy),
    sortDir: z.enum(["asc", "desc"]).default(defaults.sortDir ?? "asc"),
    linkageFilter: linkageSchema,
  });

  return schema.prefault(() => ({}) as z.input<typeof schema>);
}

export const idSchema = z.guid();

export const scenarioListLinkageFilterSchema = z
  .discriminatedUnion("mode", [
    z.object({ mode: z.literal("all") }),
    z.object({ mode: z.literal("linked") }),
    z.object({ mode: z.literal("unlinked") }),
  ])
  .default({ mode: "all" });

export const entityListLinkageFilterSchema = z
  .discriminatedUnion("mode", [
    z.object({ mode: z.literal("all") }),
    z.object({ mode: z.literal("linked") }),
    z.object({ mode: z.literal("unlinked") }),
    z.object({ mode: z.literal("scenario"), scenarioId: idSchema }),
  ])
  .default({ mode: "all" });

export type ScenarioListLinkageFilter = z.infer<typeof scenarioListLinkageFilterSchema>;
export type EntityListLinkageFilter = z.infer<typeof entityListLinkageFilterSchema>;

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
