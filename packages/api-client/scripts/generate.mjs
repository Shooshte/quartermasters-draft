import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const schema = execFileSync(
  "cargo",
  ["run", "--quiet", "-p", "qd-api-types", "--example", "openapi"],
  { cwd: root, encoding: "utf8" },
);
const types = `// Generated from qd-api-types OpenAPI. Do not edit.\n${astToString(await openapiTS(JSON.parse(schema)))}`;
for (const [relative, content] of [
  ["../openapi.json", schema],
  ["../src/generated.ts", types],
]) {
  const path = new URL(relative, import.meta.url);
  if (process.argv.includes("--check")) {
    if (readFileSync(path, "utf8") !== content)
      throw new Error(
        `Generated contract drift: ${path.pathname}. Run pnpm --filter @qd/api-client generate.`,
      );
  } else writeFileSync(path, content);
}
