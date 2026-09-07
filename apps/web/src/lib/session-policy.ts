import type { BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { deleteSessionCookie, expireCookie, setSessionCookie } from "better-auth/cookies";
import { parseSessionOutput } from "better-auth/db";

import { SESSION_POLICY_REJECTED } from "./auth-session";

export const SHORT_SESSION_SECONDS = 60 * 60;
export const REMEMBERED_SESSION_SECONDS = 30 * 24 * 60 * 60;

export function sessionPolicy() {
  return {
    session: {
      expiresIn: REMEMBERED_SESSION_SECONDS,
      disableSessionRefresh: true,
      cookieCache: { enabled: false },
      additionalFields: {
        rememberMe: { type: "boolean", defaultValue: false, input: false },
      },
    },
    databaseHooks: {
      session: {
        create: {
          before: async (session, ctx) => {
            const rememberMe = ctx?.body?.rememberMe === true;
            const now = new Date();
            return {
              data: {
                ...session,
                rememberMe,
                updatedAt: now,
                expiresAt: new Date(
                  +now + (rememberMe ? REMEMBERED_SESSION_SECONDS : SHORT_SESSION_SECONDS) * 1000,
                ),
              },
            };
          },
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-in/email" || ctx.path === "/sign-up/email") {
          return { context: { body: { ...ctx.body, rememberMe: ctx.body?.rememberMe === true } } };
        }
      }),
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/get-session") return;
        // The core keeps context.session even when it returns null for an expired session.
        const returned = ctx.context.returned;
        if (
          !returned ||
          typeof returned !== "object" ||
          !("session" in returned) ||
          !("user" in returned)
        )
          return;
        const current = ctx.context.session;
        if (!current) return;
        const now = new Date();
        if (+current.session.expiresAt <= +now) {
          deleteSessionCookie(ctx);
          throw new APIError("UNAUTHORIZED", {
            code: SESSION_POLICY_REJECTED,
            message: "Session expired or revoked",
          });
        }
        if (ctx.query?.disableRefresh) return;
        const rememberMe = current.session.rememberMe === true;
        const seconds = rememberMe ? REMEMBERED_SESSION_SECONDS : SHORT_SESSION_SECONDS;
        const updated = await ctx.context.internalAdapter.updateSession(current.session.token, {
          updatedAt: now,
          expiresAt: new Date(+now + seconds * 1000),
        });
        // updateSession does not insert: a concurrent logout must never recreate the token.
        if (!updated) {
          deleteSessionCookie(ctx);
          throw new APIError("UNAUTHORIZED", {
            code: SESSION_POLICY_REJECTED,
            message: "Session expired or revoked",
          });
        }
        if (rememberMe) expireCookie(ctx, ctx.context.authCookies.dontRememberToken);
        await setSessionCookie(ctx, { session: updated, user: current.user }, !rememberMe, {
          maxAge: rememberMe ? seconds : undefined,
        });
        return ctx.json({
          session: parseSessionOutput(ctx.context.options, updated),
          user: returned.user,
        });
      }),
    },
  } satisfies BetterAuthOptions;
}
