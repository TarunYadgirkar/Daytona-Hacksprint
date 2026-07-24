# Lane C Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use $subagent-driven-development (recommended) or $executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reproducible Node tooling, deterministic tests, strict linting, and CI without editing Lane A or Lane B production files.

**Architecture:** Lane C works on an isolated branch and owns only runtime metadata, package tooling, lint configuration, tests, CI, and its own documentation. Contract tests describe the behavior Lane A must provide, while the CI build gate verifies Lane B without modifying its files.

**Tech Stack:** Node 20.20.0, npm 10.8.2, TypeScript 5.9, `node:test` through `tsx`, ESLint 9.39.5, `eslint-config-next` 15.5.21, GitHub Actions.

## Global Constraints

- Work only on `lane-c/infrastructure` in `.worktrees/lane-c-infrastructure`.
- Do not edit `app/**`, `components/**`, `lib/adapters/**`, `lib/pipeline.ts`, `scripts/**`, `lib/types.ts`, or `lib/events.ts`.
- Do not call sponsor APIs during routine tasks.
- Use npm because `package-lock.json` is canonical.
- Merge `master` into Lane C; never rebase the shared branch.
- Recheck Lane C and `master` before every patch and commit.
- Do not merge Lane C while lint, typecheck, tests, or build are failing.
- Do not run `npm audit fix --force`.

---

## File Map

- `.nvmrc` — canonical local and CI Node version.
- `package.json` — Node/npm metadata and `test`, `lint`, and `verify` scripts.
- `package-lock.json` — exact lint dependency graph and root package metadata.
- `eslint.config.mjs` — Next.js, React, Core Web Vitals, and TypeScript lint policy.
- `tests/runtime-config.test.ts` — executable runtime and package-script contract.
- `tests/lint-config.test.ts` — executable lint dependency and configuration contract.
- `tests/ci-config.test.ts` — executable CI workflow contract.
- `tests/pipeline.test.ts` — pure verdict safety contract consumed from Lane A.
- `.github/workflows/ci.yml` — clean-install verification on pushes and pull requests.
- `docs/PROGRESS.md` — final integrated status only.

### Task 1: Pin the runtime and bootstrap the test runner

**Files:**
- Create: `.nvmrc`
- Create: `tests/runtime-config.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: existing `tsx` dev dependency.
- Produces: `npm test`, Node `20.20.0`, npm `10.8.2`, and the test directory convention used by later tasks.

- [ ] **Step 1: Write the failing runtime contract**

```typescript
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
  assert.equal(readFileSync(nvmrc, "utf8").trim(), "20.20.0");
  assert.equal(packageJson.engines?.node, ">=20.20.0 <21");
  assert.equal(packageJson.packageManager, "npm@10.8.2");
});

test("defines the deterministic TypeScript test command", () => {
  assert.equal(packageJson.scripts?.test, "tsx --test tests/*.test.ts");
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```bash
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH \
  npx tsx --test tests/runtime-config.test.ts
```

Expected: FAIL with `.nvmrc must exist`.

- [ ] **Step 3: Add the runtime pin and package metadata**

Create `.nvmrc`:

```text
20.20.0
```

Add these top-level `package.json` fields and preserve every existing dependency and script:

```json
{
  "packageManager": "npm@10.8.2",
  "engines": {
    "node": ">=20.20.0 <21"
  },
  "scripts": {
    "test": "tsx --test tests/*.test.ts"
  }
}
```

Refresh only lockfile metadata:

```bash
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH \
  npm install --package-lock-only
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH npm test
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH npm run typecheck
```

Expected: two runtime contract tests pass and TypeScript exits `0`.

- [ ] **Step 5: Commit**

```bash
git add .nvmrc package.json package-lock.json tests/runtime-config.test.ts
git commit -m "build: pin Node and add test runner"
```

### Task 2: Add strict Next.js linting

**Files:**
- Create: `eslint.config.mjs`
- Create: `tests/lint-config.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: Node/npm metadata and test runner from Task 1.
- Produces: `npm run lint` and a flat ESLint configuration for CI.

- [ ] **Step 1: Write the failing lint contract**

```typescript
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
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```bash
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH \
  npx tsx --test tests/lint-config.test.ts
```

Expected: FAIL because the lint dependencies, script, and config do not exist.

- [ ] **Step 3: Install exact lint dependencies**

```bash
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH \
  npm install --save-dev --save-exact \
  eslint@9.39.5 eslint-config-next@15.5.21 @eslint/eslintrc@3.3.6
```

Add this script to `package.json`:

```json
{
  "scripts": {
    "lint": "eslint . --max-warnings=0"
  }
}
```

- [ ] **Step 4: Add the flat ESLint configuration**

Create `eslint.config.mjs`:

```javascript
import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: root });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      ".worktrees/**",
      "build/**",
      "node_modules/**",
      "out/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["lib/adapters/daytona.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
```

- [ ] **Step 5: Verify GREEN**

Run:

```bash
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH npm test
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH npm run lint
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH npm run typecheck
```

Expected: lint contracts pass; lint and typecheck exit `0`. If lint identifies an error inside a Lane A/B-owned file, record the exact finding and stop this task without editing that file.

- [ ] **Step 6: Commit**

```bash
git add eslint.config.mjs package.json package-lock.json tests/lint-config.test.ts
git commit -m "build: add strict Next.js linting"
```

### Task 3: Add the CI contract and workflow

**Files:**
- Create: `tests/ci-config.test.ts`
- Create: `.github/workflows/ci.yml`
- Modify: `package.json`

**Interfaces:**
- Consumes: `lint`, `typecheck`, and `test` scripts.
- Produces: `npm run verify` and a GitHub Actions verification gate.

- [ ] **Step 1: Write the failing CI contract**

```typescript
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
    assert.match(workflow, new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run:

```bash
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH \
  npx tsx --test tests/ci-config.test.ts
```

Expected: FAIL because `verify` and `.github/workflows/ci.yml` do not exist.

- [ ] **Step 3: Add the local aggregate command**

Add to `package.json`:

```json
{
  "scripts": {
    "verify": "npm run lint && npm run typecheck && npm test && npm run build"
  }
}
```

- [ ] **Step 4: Add the GitHub Actions workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:

permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

- [ ] **Step 5: Verify the contract**

Run:

```bash
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH npm test
```

Expected: all runtime, lint, and CI contract tests pass.

Run the build separately:

```bash
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH npm run build
```

Expected before Lane B integration: FAIL only with the known CopilotKit client-boundary error. Do not edit Lane B files.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml package.json tests/ci-config.test.ts
git commit -m "ci: add project verification workflow"
```

### Task 4: Add verdict safety contracts and integrate Lane A

**Files:**
- Create: `tests/pipeline.test.ts`

**Interfaces:**
- Consumes: `compare(sandbox, review)` and `decide(agreement, sandbox, review)` from `lib/pipeline.ts`.
- Produces: deterministic proof that merge recommendations require at least one conclusive upheld test.

- [ ] **Step 1: Write the verdict safety tests**

```typescript
import assert from "node:assert/strict";
import test from "node:test";
import { compare, decide } from "../lib/pipeline";
import type {
  CodeRabbitReview,
  RunOutcome,
  SandboxReport,
  SandboxTestResult,
  TestVerdict,
} from "../lib/types";

const review: CodeRabbitReview = {
  verdict: "approve",
  findings: [],
  source: "cache",
};

function result(
  verdict: TestVerdict,
  before: RunOutcome,
  after: RunOutcome,
): SandboxTestResult {
  return {
    testId: verdict,
    testName: verdict,
    hypothesis: verdict,
    before,
    after,
    verdict,
    stdout: "",
    stderr: "",
    durationMs: 1,
  };
}

function analyze(results: SandboxTestResult[]) {
  const sandbox: SandboxReport = {
    sandboxId: "test",
    results,
    claimBroken: results.some((entry) => entry.verdict === "claim_broken"),
    totalDurationMs: 1,
  };
  const agreement = compare(sandbox, review);
  return {
    agreement,
    decision: decide(agreement, sandbox, review),
  };
}

for (const [name, results] of [
  ["zero generated tests", []],
  ["only inconclusive tests", [result("test_inconclusive", "pass", "pass")]],
  ["only errored tests", [result("test_errored", "error", "error")]],
] satisfies Array<[string, SandboxTestResult[]]>) {
  test(`blocks when evidence contains ${name}`, () => {
    const { agreement, decision } = analyze(results);
    assert.equal(agreement.kind, "no_evidence");
    assert.equal(decision.call, "block");
  });
}

test("recommends merge for conclusive upheld evidence", () => {
  const { agreement, decision } = analyze([
    result("claim_upheld", "fail", "pass"),
  ]);
  assert.equal(agreement.kind, "both_clear");
  assert.equal(decision.call, "merge");
});

test("blocks when conclusive evidence breaks the claim", () => {
  const { decision } = analyze([
    result("claim_broken", "fail", "fail"),
  ]);
  assert.equal(decision.call, "block");
});
```

- [ ] **Step 2: Verify RED against the pre-Lane-A baseline**

Run:

```bash
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH \
  npx tsx --test tests/pipeline.test.ts
```

Expected: exactly three failures; zero, inconclusive, and errored evidence return `both_clear` instead of `no_evidence`.

- [ ] **Step 3: Integrate Lane A without editing its files**

Confirm `master` is clean and contains Lane A's completed commit:

```bash
git -C ../.. status --short --branch
git log master --oneline -- lib/pipeline.ts lib/adapters
```

Merge, do not rebase:

```bash
git merge master
```

If the three safety tests still fail, report the exact matrix to Lane A and stop. Do not patch `lib/pipeline.ts` or adapters from Lane C.

- [ ] **Step 4: Verify GREEN**

Run:

```bash
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH npm test
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH npm run lint
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH npm run typecheck
```

Expected: all tests pass with zero lint warnings and TypeScript exits `0`.

- [ ] **Step 5: Commit**

```bash
git add tests/pipeline.test.ts
git commit -m "test: enforce evidence-backed decisions"
```

### Task 5: Integrate Lane B and complete the release gate

**Files:**
- Modify: `docs/PROGRESS.md`

**Interfaces:**
- Consumes: completed Lane A and Lane B commits plus all Lane C gates.
- Produces: a merge-ready Lane C branch and an accurate progress record.

- [ ] **Step 1: Merge the latest shared branch**

Verify both worktrees are clean and no build/dev process is active:

```bash
git status --short --branch
git -C ../.. status --short --branch
ps -axo pid,ppid,etime,command |
  rg "daytona-hackathon|next (dev|build)|tsx|tsc" |
  rg -v "rg " || true
```

Merge the latest `master`:

```bash
git merge master
```

Preserve Lane A/B production files during any conflict. Reapply only Lane C-owned package, test, lint, and CI changes.

- [ ] **Step 2: Run the clean-install local CI gate**

```bash
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH npm ci
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH npm run verify
```

Expected: lint, typecheck, all deterministic tests, and production build pass.

- [ ] **Step 3: Run the required live smoke check once**

Confirm no other smoke process is running, then run:

```bash
ps -axo command | rg "scripts/smoke|npm run smoke" | rg -v "rg " || true
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH \
  npm run smoke -- pr-101
```

Expected:

```text
Agreement : evidence_only
Decision  : BLOCK
```

- [ ] **Step 4: Run security and dependency checks**

```bash
git check-ignore -q .env
rg -l \
  -g '!node_modules/**' \
  -g '!.next/**' \
  -g '!.env' \
  -g '!.env.*' \
  '(sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|gh[pousr]_[A-Za-z0-9_]{20,}|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----)' \
  .
npm audit --omit=dev
```

Expected: `.env` is ignored; secret scan returns no files. Record audit findings without forcing dependency upgrades.

- [ ] **Step 5: Update progress accurately**

Append this completed item under `## Done` in `docs/PROGRESS.md`:

```markdown
- [x] Lane C pinned Node 20.20.0 and npm 10.8.2, added deterministic verdict tests, strict Next.js linting, and CI gates for lint, typecheck, tests, and production build.
```

Update the `Last updated` line only with verification that actually ran in Steps 2–4. Remove contradictory claims about missing keys or untested live adapters only when the current integrated evidence proves them false.

- [ ] **Step 6: Commit the final Lane C status**

```bash
git add docs/PROGRESS.md
git commit -m "docs: record Lane C verification"
```

- [ ] **Step 7: Merge Lane C into the shared branch**

From the main checkout, require a clean tree:

```bash
git -C ../.. status --short --branch
git -C ../.. merge --no-ff lane-c/infrastructure \
  -m "chore: integrate Lane C infrastructure"
```

Do not push because no remote is configured.

- [ ] **Step 8: Verify the merged shared branch**

```bash
cd ../..
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH npm ci
PATH=/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH npm run verify
git status --short --branch
```

Expected: all gates pass and the shared worktree is clean.
