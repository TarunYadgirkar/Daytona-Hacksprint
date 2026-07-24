import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(
  readFileSync(new URL("package.json", root), "utf8"),
) as {
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};
const config = new URL("eslint.config.mjs", root);

test("pins the Next.js lint toolchain", () => {
  assert.equal(packageJson.devDependencies?.eslint, "9.39.5");
  assert.equal(packageJson.devDependencies?.["eslint-config-next"], "15.5.21");
  assert.equal(packageJson.devDependencies?.["@eslint/eslintrc"], "3.3.6");
});

test("defines strict project linting", () => {
  assert.equal(existsSync(config), true, "eslint.config.mjs must exist");
  assert.equal(packageJson.scripts?.lint, "eslint . --max-warnings=0");
});
