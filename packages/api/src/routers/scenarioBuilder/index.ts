import { router } from "../../trpc";
import { effectsRouter } from "./effects";
import { spellsRouter } from "./spells";
import { itemsRouter } from "./items";
import { unitsRouter } from "./units";
import { scenariosRouter } from "./scenarios";

export const scenarioBuilderRouter = router({
  effects: effectsRouter,
  spells: spellsRouter,
  items: itemsRouter,
  units: unitsRouter,
  scenarios: scenariosRouter,
});
