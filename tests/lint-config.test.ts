import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(
  readFileSync(new URL("package.json", root), "utf8"),
) as { scripts?: Record<string, string> };
const lintConfig = new URL("eslint.config.mjs", root);

test("defines strict linting with a checked-in configuration", () => {
  assert.equal(existsSync(lintConfig), true);
  assert.equal(packageJson.scripts?.lint, "eslint . --max-warnings=0");
  const source = readFileSync(lintConfig, "utf8");
  assert.match(source, /next\/core-web-vitals/);
  assert.match(source, /next\/typescript/);
});
