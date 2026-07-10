import { expect, it, vi } from "vitest";
import type { Context } from "../../trpc";

export const gmCtx: Context = { userId: "gm-1", userRole: "game_master" };
export const playerCtx: Context = { userId: "player-1", userRole: "player" };
export const anonCtx: Context = { userId: null, userRole: null };

export function chainable(data: unknown) {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.orderBy = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.offset = vi.fn().mockResolvedValue(data);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.values = vi.fn().mockReturnValue(chain);
  chain.set = vi.fn().mockReturnValue(chain);
  chain.innerJoin = vi.fn().mockReturnValue(chain);
  chain.returning = vi.fn().mockResolvedValue(data);
  // biome-ignore lint/suspicious/noThenProperty: Drizzle query test doubles must be thenable.
  chain.then = (resolve: (v: unknown) => void) => resolve(data);
  return chain;
}

export type ChainableQuery = ReturnType<typeof chainable> & {
  where: ReturnType<typeof vi.fn>;
};

export function describeAuthGuard(callFn: (ctx: Context) => Promise<unknown>) {
  it("throws UNAUTHORIZED for unauthenticated user", async () => {
    await expect(callFn(anonCtx)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("throws FORBIDDEN for player role", async () => {
    await expect(callFn(playerCtx)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
}
