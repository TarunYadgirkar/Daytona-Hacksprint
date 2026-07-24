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

test("runs every verification gate and recorded browser suite in CI", () => {
  assert.equal(existsSync(workflowPath), true, "CI workflow must exist");
  const workflow = readFileSync(workflowPath, "utf8");
  for (const fragment of [
    "node-version-file: .nvmrc",
    "run: npm ci",
    "run: npm run lint",
    "run: npm run typecheck",
    "run: npm test",
    "run: npm run build",
    "npm install --no-save --package-lock=false @playwright/test@1.61.1",
    "npx playwright install --with-deps chromium",
    "run: npm run test:e2e",
    "SAFESHIP_GATE_MODE: recorded",
  ]) {
    assert.match(
      workflow,
      new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
});
