import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(
  readFileSync(new URL("package.json", root), "utf8"),
) as {
  engines?: { node?: string };
  packageManager?: string;
  scripts?: Record<string, string>;
};
const nvmrc = new URL(".nvmrc", root);

test("pins the supported Node and npm versions", () => {
  assert.equal(existsSync(nvmrc), true, ".nvmrc must exist");
  assert.equal(readFileSync(nvmrc, "utf8").trim(), "22");
  assert.equal(packageJson.engines?.node, "22.x");
  assert.equal(packageJson.packageManager, "npm@10.8.2");
});

test("runs infrastructure and product tests deterministically", () => {
  assert.equal(
    packageJson.scripts?.test,
    "tsx --test tests/*.test.ts lib/access.test.ts lib/adapters/*.test.ts lib/*.test.ts",
  );
  assert.equal(packageJson.scripts?.["test:e2e"], "playwright test");
});
