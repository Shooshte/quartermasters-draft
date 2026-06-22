import type { UserRole } from "@qd/shared";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

export type Context = {
  userId: string | null;
  userRole: UserRole | null;
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { userId: ctx.userId, userRole: ctx.userRole } });
});

export const gmProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.userRole !== "game_master") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Game Master role required" });
  }
  return next({ ctx });
});
