import { router } from "../../trpc";
import { effectsRouter } from "./effects";
import { itemsRouter } from "./items";
import { scenariosRouter } from "./scenarios";
import { unitsRouter } from "./units";

export const scenarioBuilderRouter = router({
  effects: effectsRouter,
  items: itemsRouter,
  units: unitsRouter,
  scenarios: scenariosRouter,
});
