import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(
  readFileSync(new URL("package.json", root), "utf8"),
) as {
  engines?: { node?: string };
  packageManager?: string;
  scripts?: Record<string, string>;
};

test("pins the supported Node and npm toolchain", () => {
  assert.equal(
    readFileSync(new URL(".nvmrc", root), "utf8").trim(),
    "20.20.0",
  );
  assert.equal(packageJson.engines?.node, ">=20.20.0 <21");
  assert.equal(packageJson.packageManager, "npm@10.8.2");
});

test("the unit runner discovers repository test files", () => {
  assert.equal(
    packageJson.scripts?.test,
    "tsx --test tests/*.test.ts lib/adapters/*.test.ts lib/*.test.ts",
  );
});
