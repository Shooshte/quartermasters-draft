import { battleLabRouter } from "./routers/battleLab";
import { healthRouter } from "./routers/health";
import { scenarioBuilderRouter } from "./routers/scenarioBuilder";
import { createCallerFactory, router } from "./trpc";

export const appRouter = router({
  health: healthRouter,
  scenarioBuilder: scenarioBuilderRouter,
  battleLab: battleLabRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
