import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { trace } from "./cases.mjs";

const dir = mkdtempSync(join(tmpdir(), "qd-engine-reference-")),
  path = join(dir, "inputs.jsonl");
writeFileSync(path, "");
try {
  const result = spawnSync(
    "pnpm",
    [
      "--filter",
      "@qd/engine",
      "exec",
      "vitest",
      "run",
      "--config",
      "../../scripts/engine-parity/reference-tests.config.mjs",
    ],
    { stdio: "inherit", env: { ...process.env, QD_ENGINE_CAPTURE_PATH: path } },
  );
  if (result.status !== 0) throw Error("Reference tests failed");
  const cases = readFileSync(path, "utf8")
    .trim()
    .split("\n")
    .map((line) =>
      JSON.parse(line, (key, value) =>
        key === "id" && typeof value === "string" && /^effect-0\.[0-9]+$/.test(value)
          ? "unnamed-reference-effect"
          : value,
      ),
    );
  cases.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), "en"));
  const seen = new Set();
  const fixtures = [];
  for (const c of cases) {
    const key = JSON.stringify(c);
    if (seen.has(key)) continue;
    seen.add(key);
    fixtures.push({ ...c, expected: trace(c.input, c.options, 8) });
  }
  writeFileSync(
    new URL("../../fixtures/engine-parity/reference-tests.jsonl", import.meta.url),
    fixtures.map((c) => JSON.stringify(c)).join("\n") + "\n",
  );
  console.log(
    `Captured ${fixtures.length} regression-test battle inputs, up to eight batches each.`,
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
