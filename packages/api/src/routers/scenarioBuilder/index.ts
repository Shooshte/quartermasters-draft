import { router } from "../../trpc";
import { effectsRouter } from "./effects";
import { itemsRouter } from "./items";
import { scenariosRouter } from "./scenarios";
import { spellsRouter } from "./spells";
import { unitsRouter } from "./units";

export const scenarioBuilderRouter = router({
  effects: effectsRouter,
  spells: spellsRouter,
  items: itemsRouter,
  units: unitsRouter,
  scenarios: scenariosRouter,
});
