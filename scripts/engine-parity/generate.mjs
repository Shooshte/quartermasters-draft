import { writeFileSync } from "node:fs";
import { createSeededRandom } from "../../reference/engine/src/rng.ts";
import { directedCases, randomCase, trace } from "./cases.mjs";

const cases = [...directedCases(), ...Array.from({ length: 24 }, (_, i) => randomCase(i))];
writeFileSync(
  new URL("../../fixtures/engine-parity/battles.jsonl", import.meta.url),
  cases.map((c) => JSON.stringify({ ...c, expected: trace(c.input, c.options) })).join("\n") + "\n",
);
const seeds = [0, 42, -1, 9007199254740991, " 42 ", "⚔️battle🛡️", "\uFEFF seed \uFEFF", 1e21, 1e-7];
writeFileSync(
  new URL("../../fixtures/engine-parity/rng.json", import.meta.url),
  JSON.stringify(
    seeds.map((seed) => {
      const rng = createSeededRandom(seed);
      return { seed, values: Array.from({ length: 20 }, rng) };
    }),
  ) + "\n",
);
console.log(`Generated ${cases.length} complete battle traces and ${seeds.length} RNG vectors.`);
