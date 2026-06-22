import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { DEFAULT_WORKERS } from "../constants";

const E2E_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const RUNNER_SCRIPT = path.join(E2E_DIR, "scripts", "run-e2e.sh");
const REPO_DEFAULT_WORKERS = 4;

test("uses the fixed repo default for e2e workers", () => {
  assert.equal(DEFAULT_WORKERS, REPO_DEFAULT_WORKERS);
});

test("run-e2e.sh defaults to the same repo worker count", async () => {
  const script = await readFile(RUNNER_SCRIPT, "utf8");
  const fallback = script.match(/WORKERS="\$\{E2E_WORKERS:-(\d+)\}"/);

  assert.ok(fallback, "expected run-e2e.sh to define an E2E_WORKERS fallback");
  assert.equal(Number(fallback[1]), DEFAULT_WORKERS);
});
