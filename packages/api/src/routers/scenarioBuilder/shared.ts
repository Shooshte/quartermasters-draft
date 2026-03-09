import { z } from "zod";

export const listInput = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(500).default(100),
}).default({});
