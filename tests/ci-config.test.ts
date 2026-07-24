import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../", import.meta.url);
const packageJson = JSON.parse(
  readFileSync(new URL("package.json", root), "utf8"),
) as { scripts?: Record<string, string> };
const workflowPath = new URL(".github/workflows/ci.yml", root);

test("defines the local verification command", () => {
  assert.equal(
    packageJson.scripts?.verify,
    "npm run lint && npm run typecheck && npm test && npm run build",
  );
});

test("runs every verification gate in CI", () => {
  assert.equal(existsSync(workflowPath), true, "CI workflow must exist");
  const workflow = readFileSync(workflowPath, "utf8");
  for (const fragment of [
    "node-version-file: .nvmrc",
    "run: npm ci",
    "run: npm run lint",
    "run: npm run typecheck",
    "run: npm test",
    "run: npm run build",
  ]) {
    assert.match(
      workflow,
      new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
});
