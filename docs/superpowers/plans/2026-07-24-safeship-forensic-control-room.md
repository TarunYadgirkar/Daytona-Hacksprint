# SafeShip Forensic Control Room Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use $subagent-driven-development (recommended) or $executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a judge-facing forensic control room that preserves SafeShip's protected live pipeline, recorded fallback, hardened trust boundaries, and human-owned decision model.

**Architecture:** Merge the protected-demo work from `origin/main` into the hardened integration branch first. Keep `PipelineView` as the sole owner of SSE-derived state, extract focused presentational components around that state, and validate behavior through recorded-mode Playwright tests before each UI change. Agreement and gate decisions continue to arrive precomputed from `lib/pipeline.ts`.

**Tech Stack:** Next.js 15 App Router, React 19, strict TypeScript, plain CSS, `next/font`, SSE, CopilotKit v2, Playwright 1.61.1, `@axe-core/playwright` 4.12.1, Node 20.20.x, npm 10.8.2.

## Global Constraints

- Work on `integration/github-main-lane-c`; merge `origin/main` before editing the frontend.
- Preserve every hardening commit through `edd1a29` and every protected-demo commit through `b26914d`.
- TypeScript remains strict; do not add `any`.
- Components render pipeline decisions; they never calculate agreement or gate calls.
- SafeShip never merges automatically; `GateDecision.requiresHuman` remains the literal `true`.
- Infrastructure failure is unavailable evidence, never a failed test or positive signal.
- Selecting a PR never starts `/api/gate`; a separate explicit action starts paid work.
- `CODERABBIT_MODE=cache` remains the Preview and Production setting.
- Recorded runs call no sponsor API, sandbox, review command, or Braintrust write.
- Use plain CSS and `next/font`; add no UI framework, animation runtime, or charting dependency.
- Use sentence case, active voice, and no “AI-powered” interface copy.
- Preserve the production access boundary, constant-time code comparison, signed cookie, and run quota.
- Meet WCAG 2.2 AA contrast, keyboard, status-announcement, table, and reduced-motion requirements.
- Keep files focused, normally 200–400 lines and never over 800 lines.
- Follow red-green-refactor for every behavior change.
- Commit and push after every task using short conventional commit subjects.

---

## File map

### Create

- `components/MissionHeader.tsx` — product statement and sponsor-method trace.
- `components/CaseSelector.tsx` — staged case selection, diff preview, and explicit run action.
- `components/RunStatus.tsx` — connection, provenance, notices, timers, and recovery controls.
- `components/EvidenceWorkspace.tsx` — claim, verdict rail, stages, tests, and CodeRabbit findings.
- `components/DecisionPanel.tsx` — evidence-report copy and human override composition.
- `e2e/accessibility.spec.ts` — axe, keyboard, reduced-motion, and locked-screen checks.
- `tests/deployment-docs.test.ts` — deploy-variable and secret-surface contract checks.
- `docs/VERCEL_HANDOFF.md` — exact Vercel variable names, scopes, and safe transfer procedure.

### Modify

- `.env.example` — authoritative deployment variable template.
- `.github/workflows/ci.yml` — combined hardened CI plus committed Playwright dependencies.
- `app/globals.css` — forensic visual system and responsive behavior.
- `app/layout.tsx` — self-hosted `next/font` variables.
- `app/page.tsx` — mission header and protected pipeline composition.
- `components/AccessBoundary.tsx` — forensic locked-state presentation.
- `components/PipelineView.tsx` — state orchestrator using extracted presentation components.
- `components/RunGallery.tsx` — interruptible fallback and case metadata.
- `components/StageList.tsx` — visible and announced text states.
- `components/TestTable.tsx` — evidence semantics and responsive disclosures.
- `components/VerdictRail.tsx` — explicit method labels and signature split treatment.
- `components/OverrideBar.tsx` — semantic success status.
- `e2e/safeship.spec.ts` — narrative, fallback, provenance, and responsive regression coverage.
- `lib/replay.ts` and `lib/replay.test.ts` — merge run-library behavior with trust-hardening schema.
- `package.json` and `package-lock.json` — unified scripts and pinned browser-test dependencies.
- `playwright.config.ts` — deterministic recorded-mode browser configuration.
- `docs/DECISIONS.md` and `docs/PROGRESS.md` — reconciled branch history and completed frontend record.

---

### Task 1: Merge the protected-demo baseline into the hardened branch

**Files:**

- Modify: `.github/workflows/ci.yml`
- Modify: `docs/DECISIONS.md`
- Modify: `docs/PROGRESS.md`
- Modify: `lib/replay.ts`
- Modify: `lib/replay.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Accept from `origin/main`: `app/api/access/route.ts`
- Accept from `origin/main`: `components/AccessBoundary.tsx`
- Accept from `origin/main`: `components/RunGallery.tsx`
- Accept from `origin/main`: `e2e/safeship.spec.ts`
- Accept from `origin/main`: `lib/access.ts`
- Accept from `origin/main`: `lib/access.test.ts`
- Accept from `origin/main`: `lib/fixtures/recorded-runs.ts`
- Accept from `origin/main`: `lib/recorded-stream.ts`
- Accept from `origin/main`: `lib/recorded-stream.test.ts`
- Accept from `origin/main`: `playwright.config.ts`

**Interfaces:**

- Consumes: `GateResult`, `AgreementAnalysis["kind"]`, and hardened CodeRabbit provenance from `lib/types.ts`.
- Produces: `RunRecord`, `createRunRecord`, `parseRunLibrary`, `serializeRunLibrary`, and `mergeRunRecords` with support for `no_opinion` and content-bound cached reviews.

- [ ] **Step 1: Confirm the branch and fetch the current remote**

```bash
git status --short --branch
git fetch origin --prune
git rev-list --left-right --count HEAD...origin/main
```

Expected: the current branch is `integration/github-main-lane-c`; the worktree is clean before the merge.

- [ ] **Step 2: Start a non-fast-forward merge without committing**

```bash
git merge --no-ff --no-commit origin/main
git status --short
```

Expected: conflicts are limited to files independently changed by the hardening and protected-demo lanes, including CI, replay, project scripts, and progress records.

- [ ] **Step 3: Resolve the replay schema by preserving both run-library and trust constraints**

Keep the v2 run library from `origin/main`, then use this exact review and agreement schema inside `gateResultSchema`:

```ts
codeRabbit: z.discriminatedUnion("source", [
  z.object({
    ...reviewBase,
    source: z.literal("cli"),
    recordedAt: z.string().datetime(),
  }),
  z.object({
    ...reviewBase,
    source: z.literal("cache"),
    recordedAt: z.string().datetime(),
    prDigest: z.string().regex(/^[a-f0-9]{64}$/),
  }),
  z.object({
    ...reviewBase,
    source: z.literal("fixture"),
    recordedAt: z.undefined().optional(),
    prDigest: z.undefined().optional(),
  }),
]),
agreement: z.object({
  agree: z.boolean(),
  kind: z.enum([
    "both_caught",
    "both_clear",
    "evidence_only",
    "opinion_only",
    "no_evidence",
    "no_opinion",
  ]),
  summary: z.string().min(1),
}),
```

Keep these public exports unchanged:

```ts
export const REPLAY_STORAGE_KEY = "safeship:run-library:v2";
export const LEGACY_REPLAY_STORAGE_KEY = "safeship:last-completed-run:v1";
export type RunOrigin = "live" | "recorded_fixture";
export type BraintrustProvenance = "configured" | "not_configured" | "not_run";
```

- [ ] **Step 4: Resolve `package.json` to retain every verification surface**

Use this scripts and runtime block:

```json
{
  "packageManager": "npm@10.8.2",
  "engines": {
    "node": ">=20.20.0 <21"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "test": "tsx --test tests/*.test.ts lib/access.test.ts lib/adapters/*.test.ts lib/*.test.ts",
    "test:e2e": "playwright test",
    "lint": "eslint . --max-warnings=0",
    "verify": "npm run lint && npm run typecheck && npm test && npm run build",
    "typecheck": "tsc --noEmit",
    "record:coderabbit": "tsx scripts/record-coderabbit.ts",
    "check:env": "tsx scripts/check-env.ts",
    "smoke": "tsx scripts/smoke.ts"
  }
}
```

Preserve all dependencies and devDependencies from the integration branch. Browser-test dependencies are added in Task 2.

- [ ] **Step 5: Resolve CI and documentation conflicts**

The merged CI must retain:

```yaml
permissions:
  contents: read

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true
```

It must use `.nvmrc`, `npm ci`, and run lint, typecheck, unit tests, build, and recorded-mode Playwright. Until Task 2 commits Playwright, retain the existing temporary `npm install --no-save --package-lock=false @playwright/test@1.61.1` CI step.

For `docs/DECISIONS.md`, retain every unique numbered decision from both sides in ascending order. For `docs/PROGRESS.md`, replace stale lane ownership with one current-state section that names the merged protected-demo and hardening work without claiming live post-merge verification.

- [ ] **Step 6: Reconcile the lockfile and install tree**

```bash
nvm use
npm install --package-lock-only
npm ci
```

Expected: Node satisfies `>=20.20.0 <21`; installation completes from the merged lockfile.

- [ ] **Step 7: Run the merged deterministic baseline**

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: all four commands exit 0. Do not run live smoke until the final task.

- [ ] **Step 8: Commit and push the integration baseline**

```bash
git add .env.example .github .gitignore README.md app components docs e2e lib package.json package-lock.json playwright.config.ts scripts tsconfig.json
git diff --cached --check
git commit -m "chore: integrate protected demo baseline"
git push origin integration/github-main-lane-c
```

---

### Task 2: Make recorded fallback interrupt an active live run

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `components/RunGallery.tsx`
- Modify: `components/PipelineView.tsx`
- Modify: `e2e/safeship.spec.ts`

**Interfaces:**

- Consumes: `RunRecord`, `PipelineView.showCompletedResult(record)`, and the browser `EventSource`.
- Produces: a gallery action labelled `Abort live run and load` while `running === true`; invoking it closes the active source and renders the selected record.

- [ ] **Step 1: Commit browser-test dependencies instead of installing them ad hoc in CI**

```bash
npm install --save-dev @playwright/test@1.61.1 @axe-core/playwright@4.12.1
```

Then remove the temporary `npm install --no-save` step from CI. Keep:

```yaml
- run: npx playwright install --with-deps chromium
- run: npm run test:e2e
  env:
    SAFESHIP_GATE_MODE: recorded
    SAFESHIP_RECORDED_DELAY_MS: "5"
```

- [ ] **Step 2: Write the failing active-run fallback test**

Add this test to `e2e/safeship.spec.ts`:

```ts
test("a recorded case can interrupt an active live run", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as Window & { __safeShipSourceClosed?: boolean };
    state.__safeShipSourceClosed = false;

    class HangingEventSource {
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor(_url: string | URL) {
        window.setTimeout(() => this.onopen?.(new Event("open")), 0);
      }

      close() {
        state.__safeShipSourceClosed = true;
      }
    }

    Object.defineProperty(window, "EventSource", {
      configurable: true,
      value: HangingEventSource,
    });
  });

  await page.goto("/");
  await selectPR(page, "pr-101");
  await page.getByRole("button", { name: "Run adversarial gate" }).click();
  await expect(page.locator(".connection")).toHaveText("connected");

  const record = page.locator(".run-card").filter({ hasText: "pr-101" }).first();
  await record.getByRole("button", { name: "Abort live run and load" }).click();

  await expect(page.locator(".connection")).toHaveText("recorded");
  await expect(page.locator(".replay-banner")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as Window & { __safeShipSourceClosed?: boolean }).__safeShipSourceClosed,
      ),
    )
    .toBe(true);
});
```

- [ ] **Step 3: Run the test and verify the expected failure**

```bash
npx playwright test e2e/safeship.spec.ts --grep "interrupt an active"
```

Expected: FAIL because recorded-run buttons are disabled and do not expose the interrupt label.

- [ ] **Step 4: Implement the minimal interruptible gallery action**

In `RunGallery.tsx`, replace the button with:

```tsx
<button
  type="button"
  className="act ghost"
  onClick={() => onLoad(record)}
>
  {running ? "Abort live run and load" : "Load recorded run"}
</button>
```

In the run-alert fallback button in `PipelineView.tsx`, remove `disabled={running}` and use:

```tsx
{running ? "Abort and load recorded run" : "Load recorded run"}
```

Do not add new cancellation state. `showCompletedResult` already closes `sourceRef`, clears timers, sets `running` false, and restores the validated completed result.

- [ ] **Step 5: Run the focused and full browser tests**

```bash
npx playwright test e2e/safeship.spec.ts --grep "interrupt an active"
npm run test:e2e
```

Expected: the focused test passes; the full recorded-mode suite has zero failures.

- [ ] **Step 6: Commit and push**

```bash
git add package.json package-lock.json .github/workflows/ci.yml components/RunGallery.tsx components/PipelineView.tsx e2e/safeship.spec.ts
git commit -m "fix: keep recorded fallback interruptible"
git push origin integration/github-main-lane-c
```

---

### Task 3: Build the mission header and forensic font foundation

**Files:**

- Create: `components/MissionHeader.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `e2e/safeship.spec.ts`

**Interfaces:**

- Consumes: no application state.
- Produces: `MissionHeader(): JSX.Element`, one page `h1`, and the five-role integration trace.

- [ ] **Step 1: Write the failing narrative-shell test**

Add:

```ts
test("the first viewport explains the method and sponsor roles", async ({ page }) => {
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Do not trust the diff. Test the claim.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Fireworks: attack generation")).toBeVisible();
  await expect(page.getByText("Daytona: execution")).toBeVisible();
  await expect(page.getByText("CodeRabbit: opinion")).toBeVisible();
  await expect(page.getByText("Braintrust: trace")).toBeVisible();
  await expect(page.getByText("CopilotKit: interrogation")).toBeVisible();
});
```

- [ ] **Step 2: Verify it fails for the old masthead**

```bash
npx playwright test e2e/safeship.spec.ts --grep "first viewport"
```

Expected: FAIL because the current `h1` is only `SafeShip` and the method trace does not exist.

- [ ] **Step 3: Create `MissionHeader`**

```tsx
const METHODS = [
  ["Fireworks", "attack generation"],
  ["Daytona", "execution"],
  ["CodeRabbit", "opinion"],
  ["Braintrust", "trace"],
  ["CopilotKit", "interrogation"],
] as const;

export default function MissionHeader() {
  return (
    <header className="mission-header">
      <div className="mission-brand">
        <span className="wordmark">SafeShip</span>
        <span className="mission-index">Adversarial verification / 01</span>
      </div>
      <div className="mission-copy">
        <p className="eyebrow">Evidence before confidence</p>
        <h1>
          Do not trust the diff.
          <span>Test the claim.</span>
        </h1>
        <p className="mission-deck">
          Extract the promise. Generate attacks. Execute both revisions.
          Compare proof with review. Leave the call to a human.
        </p>
      </div>
      <ol className="method-trace" aria-label="SafeShip integration trace">
        {METHODS.map(([name, role], index) => (
          <li key={name}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <strong>{name}:</strong> {role}
          </li>
        ))}
      </ol>
    </header>
  );
}
```

- [ ] **Step 4: Load self-hosted fonts through `next/font`**

Use this layout setup:

```tsx
import type { Metadata } from "next";
import { Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import CopilotProvider from "@/components/CopilotProvider";
import "@copilotkit/react-core/v2/styles.css";
import "./globals.css";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
});
```

Set:

```tsx
<body className={`${display.variable} ${mono.variable}`}>
  <CopilotProvider>{children}</CopilotProvider>
</body>
```

- [ ] **Step 5: Replace the old masthead in `app/page.tsx`**

```tsx
import MissionHeader from "@/components/MissionHeader";

export default function Page() {
  return (
    <>
      <MissionHeader />
      <AccessBoundary>
        <PipelineView
          prs={STAGED_PRS}
          gateMode={
            process.env.SAFESHIP_GATE_MODE === "recorded"
              ? "recorded_fixture"
              : "live"
          }
          braintrustConfigured={Boolean(process.env.BRAINTRUST_API_KEY)}
        />
      </AccessBoundary>
    </>
  );
}
```

- [ ] **Step 6: Add the exact foundation tokens and header styles**

Replace the root type and color tokens with:

```css
:root {
  --ground: #071016;
  --surface: #0d1820;
  --surface-raised: #13232d;
  --surface-sunk: #081219;
  --paper: #f2eee5;
  --ink: #f6f3eb;
  --ink-dark: #101820;
  --muted: #a9bac4;
  --muted-dark: #536773;
  --rule: #29414e;
  --signal: #42e397;
  --danger: #ff6565;
  --seam: #5b91ff;
  --warning: #ffc06a;
  --display: var(--font-display), "Arial Narrow", sans-serif;
  --mono: var(--font-mono), monospace;
  --gap: clamp(14px, 2vw, 24px);
  --bench: var(--ground);
  --panel: var(--surface);
  --panel-sunk: var(--surface-sunk);
  --evidence: var(--signal);
  --break: var(--danger);
  --warn: var(--warning);
  --sans: var(--display);
}
```

The compatibility aliases keep the existing component styles valid until the
complete rewrite in Task 7.

Add:

```css
.mission-header {
  border-bottom: 1px solid var(--rule);
  display: grid;
  gap: clamp(24px, 4vw, 64px);
  grid-template-columns: minmax(160px, 0.35fr) minmax(320px, 1fr);
  padding: clamp(24px, 5vw, 72px);
  position: relative;
}

.mission-brand {
  align-content: space-between;
  display: grid;
}

.wordmark,
.mission-copy h1 {
  font-family: var(--display);
  text-transform: uppercase;
}

.wordmark {
  color: var(--signal);
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.mission-index,
.eyebrow {
  color: var(--muted);
  font-size: 0.68rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.mission-copy h1 {
  font-size: clamp(3.5rem, 9vw, 8.75rem);
  font-weight: 700;
  letter-spacing: -0.045em;
  line-height: 0.78;
  margin: 12px 0 24px;
}

.mission-copy h1 span {
  color: var(--seam);
  display: block;
}

.mission-deck {
  color: var(--muted);
  max-width: 62ch;
}

.method-trace {
  border-top: 1px solid var(--rule);
  display: grid;
  gap: 0;
  grid-column: 1 / -1;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
}

.method-trace li {
  border-right: 1px solid var(--rule);
  color: var(--muted);
  padding: 14px;
}

.method-trace li:last-child {
  border-right: 0;
}

.method-trace li > span {
  color: var(--seam);
  display: block;
  font-size: 0.65rem;
}

.method-trace strong {
  color: var(--ink);
  font-weight: 600;
}
```

- [ ] **Step 7: Verify, commit, and push**

```bash
npx playwright test e2e/safeship.spec.ts --grep "first viewport"
npm run lint
npm run typecheck
git add app components/MissionHeader.tsx e2e/safeship.spec.ts
git commit -m "feat: add forensic mission header"
git push origin integration/github-main-lane-c
```

---

### Task 4: Extract the staged PR case selector

**Files:**

- Create: `components/CaseSelector.tsx`
- Modify: `components/PipelineView.tsx`
- Modify: `app/globals.css`
- Modify: `e2e/safeship.spec.ts`

**Interfaces:**

- Consumes:

```ts
interface CaseSelectorProps {
  prs: StagedPR[];
  selectedId: string | null;
  running: boolean;
  gateMode: RunOrigin;
  onSelect: (prId: string) => void;
  onRun: (prId: string) => void;
}
```

- Produces: an explicit case preview and run action; no network request occurs from `onSelect`.

- [ ] **Step 1: Extend the existing no-accidental-run test**

Add these assertions after selecting `pr-101`:

```ts
await expect(page.getByRole("heading", { name: "Case file pr-101" })).toBeVisible();
await expect(page.getByText("Diff under test")).toBeVisible();
await expect(page.getByText("Nothing runs until you start the gate.")).toBeVisible();
```

- [ ] **Step 2: Verify the new case-file assertion fails**

```bash
npx playwright test e2e/safeship.spec.ts --grep "previews it without starting"
```

Expected: FAIL because the extracted case-file heading and safety copy do not exist.

- [ ] **Step 3: Create `CaseSelector.tsx`**

```tsx
"use client";

import type { RunOrigin } from "@/lib/replay";
import type { StagedPR } from "@/lib/types";

export default function CaseSelector({
  prs,
  selectedId,
  running,
  gateMode,
  onSelect,
  onRun,
}: {
  prs: StagedPR[];
  selectedId: string | null;
  running: boolean;
  gateMode: RunOrigin;
  onSelect: (prId: string) => void;
  onRun: (prId: string) => void;
}) {
  const active = prs.find((pr) => pr.id === selectedId);

  return (
    <div className="case-selector">
      <section className="panel case-queue" aria-labelledby="case-queue-title">
        <div className="section-heading">
          <span className="label">Queued cases</span>
          <h2 id="case-queue-title">Agent-authored pull requests</h2>
        </div>
        <div className="case-list">
          {prs.map((pr) => (
            <button
              key={pr.id}
              type="button"
              className="case-card"
              aria-pressed={selectedId === pr.id}
              disabled={running}
              onClick={() => onSelect(pr.id)}
            >
              <span className="case-number">{pr.id}</span>
              <span className="case-title">{pr.title}</span>
              <span className="case-author">{pr.author}</span>
            </button>
          ))}
        </div>
      </section>

      {active && (
        <section className="panel case-preview" aria-labelledby="case-preview-title">
          <div className="section-heading">
            <span className="label">Selected evidence target</span>
            <h2 id="case-preview-title">Case file {active.id}</h2>
          </div>
          <p className="case-safety">Nothing runs until you start the gate.</p>
          <button
            type="button"
            className="act primary"
            disabled={running}
            onClick={() => onRun(active.id)}
          >
            {running ? "Gate running…" : "Run adversarial gate"}
          </button>
          <span className="run-estimate">
            {gateMode === "recorded_fixture"
              ? "Recorded test mode · no sponsor APIs"
              : "Estimated 30–120 seconds · Fireworks plus one Daytona sandbox"}
          </span>
          <details className="case-diff">
            <summary>Diff under test</summary>
            <span className="label diff-label">Before</span>
            <pre className="diff-code">{active.before}</pre>
            <span className="label diff-label">After</span>
            <pre className="diff-code">{active.after}</pre>
          </details>
        </section>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Replace the queue, run control, and diff markup in `PipelineView`**

Import:

```ts
import CaseSelector from "./CaseSelector";
```

Render:

```tsx
<CaseSelector
  prs={prs}
  selectedId={selected}
  running={running}
  gateMode={gateMode}
  onSelect={selectPR}
  onRun={startRun}
/>
```

Remove the old PR buttons, `run-control`, and separate diff panel. Keep `activePR` only if another existing branch needs it; otherwise remove the unused lookup.

- [ ] **Step 5: Add the case-file layout**

```css
.case-selector {
  display: grid;
  gap: var(--gap);
}

.section-heading h2 {
  font-family: var(--display);
  font-size: 1.55rem;
  letter-spacing: 0.01em;
  margin: 3px 0 14px;
  text-transform: uppercase;
}

.case-list {
  display: grid;
  gap: 8px;
}

.case-card {
  align-items: center;
  background: var(--surface-sunk);
  border: 1px solid var(--rule);
  color: var(--ink);
  cursor: pointer;
  display: grid;
  font: inherit;
  gap: 4px 12px;
  grid-template-columns: 68px 1fr;
  padding: 13px;
  text-align: left;
}

.case-card[aria-pressed="true"] {
  border-color: var(--seam);
  box-shadow: inset 3px 0 0 var(--seam);
}

.case-number,
.case-author,
.case-safety,
.run-estimate {
  color: var(--muted);
  font-size: 0.72rem;
}

.case-title {
  font-weight: 600;
}

.case-author {
  grid-column: 2;
}

.case-preview .act {
  margin-top: 12px;
  width: 100%;
}

.run-estimate {
  display: block;
  margin-top: 8px;
}

.case-diff {
  border-top: 1px solid var(--rule);
  margin-top: 18px;
  padding-top: 12px;
}
```

- [ ] **Step 6: Verify, commit, and push**

```bash
npx playwright test e2e/safeship.spec.ts --grep "previews it without starting"
npm run lint
npm run typecheck
git add components/CaseSelector.tsx components/PipelineView.tsx app/globals.css e2e/safeship.spec.ts
git commit -m "refactor: extract staged case selector"
git push origin integration/github-main-lane-c
```

---

### Task 5: Extract run status and expose accessible stage states

**Files:**

- Create: `components/RunStatus.tsx`
- Modify: `components/PipelineView.tsx`
- Modify: `components/StageList.tsx`
- Modify: `app/globals.css`
- Modify: `e2e/safeship.spec.ts`

**Interfaces:**

- Produces:

```ts
export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "complete"
  | "disconnected"
  | "recorded";

export interface RunNotice {
  severity: "warning" | "error";
  title: string;
  message: string;
}
```

- `RunStatus` accepts the current origin, review, Braintrust provenance, active record, retry and fallback callbacks, and run-ID copy callback.

- [ ] **Step 1: Write the failing stage-state accessibility assertion**

After starting a recorded run, add:

```ts
const stages = page.locator(".stage");
await expect(stages.first().getByText(/Pending|Running|Complete|Error/)).toBeVisible();
await expect(page.getByRole("status", { name: "Pipeline status updates" })).toBeAttached();
```

- [ ] **Step 2: Verify the assertion fails**

```bash
npx playwright test e2e/safeship.spec.ts --grep "completed evidence-only"
```

Expected: FAIL because stage state is currently represented only by an `aria-hidden` symbol and `data-state`.

- [ ] **Step 3: Export status types and create `RunStatus`**

Use this file:

```tsx
"use client";

import type {
  BraintrustProvenance,
  RunOrigin,
  RunRecord,
} from "@/lib/replay";
import type { CodeRabbitReview } from "@/lib/types";

export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "complete"
  | "disconnected"
  | "recorded";

export interface RunNotice {
  severity: "warning" | "error";
  title: string;
  message: string;
}

function executionProvenance(origin: RunOrigin | null): string {
  if (origin === "live") return "live call";
  if (origin === "recorded_fixture") return "recorded fixture";
  return "not run";
}

function reviewProvenance(review: CodeRabbitReview | null): string {
  if (!review) return "not loaded";
  if (review.source === "cache") return "recorded cache";
  if (review.source === "cli") return "live CLI";
  return "fixture placeholder";
}

function braintrustProvenance(value: BraintrustProvenance | null): string {
  if (value === "configured") return "logging configured";
  if (value === "not_configured") return "not configured";
  return "not run";
}

export default function RunStatus({
  connection,
  runId,
  running,
  notice,
  activeRecord,
  origin,
  braintrust,
  review,
  onCopyRunId,
  onRetry,
  onLoadRecorded,
}: {
  connection: ConnectionState;
  runId: string | null;
  running: boolean;
  notice: RunNotice | null;
  activeRecord: RunRecord | null;
  origin: RunOrigin | null;
  braintrust: BraintrustProvenance | null;
  review: CodeRabbitReview | null;
  onCopyRunId: () => void;
  onRetry: () => void;
  onLoadRecorded: () => void;
}) {
  return (
    <>
      <section className="run-status panel" aria-label="Run status">
        <div>
          <span className="label">Run status</span>
          <strong className={`connection ${connection}`}>{connection}</strong>
        </div>
        <div className="provenance-grid">
          <span>Fireworks: {executionProvenance(origin)}</span>
          <span>Daytona: {executionProvenance(origin)}</span>
          <span>CodeRabbit: {reviewProvenance(review)}</span>
          <span>Braintrust: {braintrustProvenance(braintrust)}</span>
        </div>
        {runId && (
          <div className="run-id">
            <span title={runId}>Run ID: {runId}</span>
            <button type="button" className="text-button" onClick={onCopyRunId}>
              Copy run ID
            </button>
          </div>
        )}
      </section>

      {activeRecord && connection === "recorded" && (
        <div className="replay-banner" role="status">
          Loaded {activeRecord.origin === "live" ? "a saved live run" : "a recorded fixture"}{" "}
          captured {new Date(activeRecord.capturedAt).toLocaleString()}. No model,
          sandbox, review command, or Braintrust write ran again.
        </div>
      )}

      {notice && (
        <section className={`run-alert ${notice.severity}`} role="alert">
          <strong>{notice.title}</strong>
          <p>{notice.message}</p>
          <div className="run-alert-actions">
            <button
              type="button"
              className="act"
              onClick={onRetry}
              disabled={running}
            >
              Retry run
            </button>
            <button
              type="button"
              className="act ghost"
              onClick={onLoadRecorded}
            >
              {running ? "Abort and load recorded run" : "Load recorded run"}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
```

- [ ] **Step 4: Replace inline run-status and alert markup**

Import the types and component:

```ts
import RunStatus, {
  type ConnectionState,
  type RunNotice,
} from "./RunStatus";
```

Render:

```tsx
<RunStatus
  connection={connection}
  runId={runId}
  running={running}
  notice={runNotice}
  activeRecord={activeRecord}
  origin={displayedOrigin}
  braintrust={displayedBraintrust}
  review={review}
  onCopyRunId={() => {
    if (runId) void copyText(runId, "Run ID copied.");
  }}
  onRetry={retryRun}
  onLoadRecorded={loadRecordedForSelection}
/>
```

- [ ] **Step 5: Render visible text state in `StageList`**

Add:

```ts
const STATE_LABEL: Record<StageState, string> = {
  pending: "Pending",
  running: "Running",
  done: "Complete",
  error: "Error",
};
```

Replace the stage row with:

```tsx
<div className="stage" data-state={states[stage]}>
  <span className="dot" aria-hidden="true">{DOT[states[stage]]}</span>
  <span>{STAGE_LABEL[stage]}</span>
  <span className="stage-state">{STATE_LABEL[states[stage]]}</span>
  <span className="ms">{ms !== undefined ? `${(ms / 1000).toFixed(1)}s` : ""}</span>
</div>
```

Give the wrapper:

```tsx
<div role="status" aria-label="Pipeline status updates">
```

Update the grid:

```css
.stage {
  grid-template-columns: 18px minmax(0, 1fr) auto auto;
}

.stage-state {
  color: var(--muted);
  font-family: var(--display);
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
```

- [ ] **Step 6: Verify, commit, and push**

```bash
npx playwright test e2e/safeship.spec.ts --grep "completed evidence-only"
npx playwright test e2e/safeship.spec.ts --grep "interrupt an active"
npm run lint
npm run typecheck
git add components/RunStatus.tsx components/PipelineView.tsx components/StageList.tsx app/globals.css e2e/safeship.spec.ts
git commit -m "refactor: extract run status instrument"
git push origin integration/github-main-lane-c
```

---

### Task 6: Extract the evidence workspace and human decision panel

**Files:**

- Create: `components/EvidenceWorkspace.tsx`
- Create: `components/DecisionPanel.tsx`
- Modify: `components/PipelineView.tsx`
- Modify: `components/VerdictRail.tsx`
- Modify: `components/TestTable.tsx`
- Modify: `components/OverrideBar.tsx`
- Modify: `app/globals.css`
- Modify: `e2e/safeship.spec.ts`

**Interfaces:**

- `EvidenceWorkspace` consumes already-derived claim, tests, sandbox results, review, agreement, stages, timings, and logs. It produces presentation only.
- `DecisionPanel` consumes `runId`, `decision`, the preformatted report, copy state, and `onOverride`.

- [ ] **Step 1: Write the failing semantic-order test**

Add:

```ts
test("completed evidence follows the claim-to-human-decision story", async ({ page }) => {
  await loadBundledRun(page, "pr-101");
  const labels = await page.locator(".evidence-workspace > section .label").allTextContents();
  expect(labels).toEqual([
    "The claim",
    "Execution evidence vs review opinion",
    "Pipeline",
    "Adversarial execution",
    "CodeRabbit opinion",
  ]);
  await expect(page.getByText("Execution evidence", { exact: true })).toBeVisible();
  await expect(page.getByText("CodeRabbit opinion", { exact: true })).toBeVisible();
});
```

- [ ] **Step 2: Verify the test fails**

```bash
npx playwright test e2e/safeship.spec.ts --grep "claim-to-human-decision"
```

Expected: FAIL because the current sections are inline and use different labels.

- [ ] **Step 3: Create `EvidenceWorkspace` with presentation-only props**

Use this file:

```tsx
"use client";

import type {
  AdversarialTest,
  AgreementAnalysis,
  CodeRabbitReview,
  ExtractedClaim,
  SandboxReport,
  SandboxTestResult,
  StageName,
} from "@/lib/types";
import StageList, { type StageState } from "./StageList";
import TestTable from "./TestTable";
import VerdictRail from "./VerdictRail";

export default function EvidenceWorkspace({
  running,
  claim,
  tests,
  results,
  sandbox,
  review,
  agreement,
  stages,
  timings,
  logs,
}: {
  running: boolean;
  claim: ExtractedClaim | null;
  tests: AdversarialTest[];
  results: SandboxTestResult[];
  sandbox: SandboxReport | null;
  review: CodeRabbitReview | null;
  agreement: AgreementAnalysis | null;
  stages: Record<StageName, StageState>;
  timings: Partial<Record<StageName, number>>;
  logs: Array<{ stage: StageName; message: string }>;
}) {
  return (
    <div className="evidence-workspace">
      <section className="panel">
        <span className="label">The claim</span>
        {claim ? (
          <>
            <p className="claim">{claim.statement}</p>
            <p className="claim-meta">
              Target behaviour: {claim.targetBehavior || "—"}
              {claim.impliedInputs.length > 0 &&
                ` · Implied inputs: ${claim.impliedInputs.join(", ")}`}
              {" · "}confidence {claim.confidence.toFixed(2)}
              {claim.confidence < 0.5 && " (low — the description was vague)"}
            </p>
          </>
        ) : (
          <p className="empty">
            {running
              ? "Reading the pull request…"
              : "Ready. Start the gate to extract a falsifiable claim, or load a recorded run."}
          </p>
        )}
      </section>

      <section className="panel">
        <span className="label">Execution evidence vs review opinion</span>
        <VerdictRail sandbox={sandbox} review={review} agreement={agreement} />
      </section>

      <section className="panel">
        <span className="label">Pipeline</span>
        <StageList states={stages} timings={timings} logs={logs} />
      </section>

      <section className="panel">
        <span className="label">Adversarial execution</span>
        <TestTable tests={tests} results={results} />
        {sandbox?.infraError && (
          <p className="provenance evidence-error">
            Sandbox error: {sandbox.infraError}. No evidence was produced, so the gate
            blocks rather than assuming the claim holds.
          </p>
        )}
      </section>

      <section className="panel">
        <span className="label">CodeRabbit opinion</span>
        {!review ? (
          <p className="empty">No review loaded.</p>
        ) : (
          <>
            <p className="provenance">
              {review.source === "cache"
                ? `Recorded verdict from ${new Date(review.recordedAt).toLocaleString()}.`
                : review.source === "fixture"
                  ? "Staged placeholder—not CodeRabbit output. Authenticate and run the recorder before presenting it as an independent review."
                  : "Live CodeRabbit CLI review, run just now."}
            </p>
            {review.findings.length === 0 ? (
              <p className="empty">No findings.</p>
            ) : (
              review.findings.map((finding, index) => (
                <div
                  className={`finding ${finding.severity}`}
                  key={`${finding.title}-${index}`}
                >
                  <span className="sev">{finding.severity}</span>
                  {finding.file && (
                    <span className="where">
                      {" "}
                      · {finding.file}
                      {finding.line ? `:${finding.line}` : ""}
                    </span>
                  )}
                  <div>{finding.title}</div>
                  {finding.body && <p>{finding.body}</p>}
                </div>
              ))
            )}
          </>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Create `DecisionPanel`**

Use this file:

```tsx
"use client";

import type { GateCall, GateDecision } from "@/lib/types";
import OverrideBar from "./OverrideBar";

export default function DecisionPanel({
  runId,
  decision,
  report,
  copyNotice,
  onCopyReport,
  onOverride,
}: {
  runId: string;
  decision: GateDecision;
  report: string | null;
  copyNotice: string | null;
  onCopyReport: () => void;
  onOverride: (call: GateCall, reason: string) => Promise<void>;
}) {
  return (
    <section className="panel decision-panel">
      <div className="decision-actions">
        <span className="label">Human gate</span>
        {report && (
          <button type="button" className="act ghost" onClick={onCopyReport}>
            Copy evidence report
          </button>
        )}
      </div>
      <OverrideBar
        key={runId}
        runId={runId}
        decision={decision}
        onOverride={onOverride}
      />
      {copyNotice && <p className="copy-notice">{copyNotice}</p>}
    </section>
  );
}
```

Render the existing copy action and `OverrideBar`. Do not derive a recommendation.

- [ ] **Step 5: Make method names and success semantics explicit**

In `VerdictRail.tsx`, use:

```tsx
<small>Execution evidence</small>
```

and:

```tsx
<small>CodeRabbit opinion</small>
```

Preserve the source in a separate visually muted line:

```tsx
<span className="rail-source">
  {review?.source === "fixture" ? "Fixture placeholder" : review?.source ?? "Not loaded"}
</span>
```

In `OverrideBar.tsx`, change the successful record to:

```tsx
<p className="override-done" role="status">
```

In `TestTable.tsx`, retain or add:

```tsx
<caption className="sr-only">
  Adversarial tests executed against the before and after revisions
</caption>
```

and `scope="col"` on every column heading.

- [ ] **Step 6: Compose both components from `PipelineView`**

Render:

```tsx
<EvidenceWorkspace
  running={running}
  claim={claim}
  tests={tests}
  results={results}
  sandbox={sandbox}
  review={review}
  agreement={agreement}
  stages={stages}
  timings={timings}
  logs={logs}
/>
```

and:

```tsx
{decision && runId && (
  <DecisionPanel
    runId={runId}
    decision={decision}
    report={report}
    copyNotice={copyNotice}
    onCopyReport={() => {
      if (report) void copyText(report, "Evidence report copied.");
    }}
    onOverride={submitOverride}
  />
)}
```

Confirm `PipelineView.tsx` is under 800 lines:

```bash
wc -l components/PipelineView.tsx
```

- [ ] **Step 7: Verify, commit, and push**

```bash
npx playwright test e2e/safeship.spec.ts --grep "claim-to-human-decision"
npx playwright test e2e/safeship.spec.ts --grep "failed override"
npm run lint
npm run typecheck
git add components app/globals.css e2e/safeship.spec.ts
git commit -m "refactor: split evidence presentation"
git push origin integration/github-main-lane-c
```

---

### Task 7: Apply the complete forensic control-room visual system

**Files:**

- Modify: `app/globals.css`
- Modify: `components/RunGallery.tsx`
- Modify: `components/VerdictRail.tsx`
- Modify: `e2e/safeship.spec.ts`

**Interfaces:**

- Consumes: the semantic classes created in Tasks 3–6.
- Produces: stable visual tokens, two-column desktop control room, internally scrolling evidence table, signature verdict split, and responsive single-column mobile layout.

- [ ] **Step 1: Write the failing visual-token contract**

Add:

```ts
test("the forensic control room exposes its signature visual tokens", async ({ page }) => {
  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      ground: style.getPropertyValue("--ground").trim(),
      signal: style.getPropertyValue("--signal").trim(),
      danger: style.getPropertyValue("--danger").trim(),
      seam: style.getPropertyValue("--seam").trim(),
      display: style.getPropertyValue("--display").trim(),
    };
  });

  expect(tokens).toEqual({
    ground: "#071016",
    signal: "#42e397",
    danger: "#ff6565",
    seam: "#5b91ff",
    display: 'var(--font-display), "Arial Narrow", sans-serif',
  });
});
```

- [ ] **Step 2: Verify the contract fails before the CSS rewrite**

```bash
npx playwright test e2e/safeship.spec.ts --grep "signature visual tokens"
```

Expected: FAIL until every exact token is active.

- [ ] **Step 3: Replace light-bench shell styles with the forensic ground**

Use:

```css
html,
body {
  margin: 0;
  min-height: 100%;
}

body {
  background:
    linear-gradient(rgba(91, 145, 255, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(91, 145, 255, 0.035) 1px, transparent 1px),
    radial-gradient(circle at 78% 0%, #173244 0, transparent 38rem),
    var(--ground);
  background-size: 48px 48px, 48px 48px, auto, auto;
  color: var(--ink);
  font-family: var(--mono);
  font-size: 14px;
  line-height: 1.55;
}

.shell {
  align-items: start;
  display: grid;
  gap: var(--gap);
  grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
  margin: 0 auto;
  max-width: 1680px;
  padding: var(--gap);
}

.panel {
  background: color-mix(in srgb, var(--surface) 94%, transparent);
  border: 1px solid var(--rule);
  box-shadow: 0 18px 55px rgba(0, 0, 0, 0.18);
  padding: clamp(14px, 2vw, 22px);
}
```

- [ ] **Step 4: Make the verdict split the focal event**

Use:

```css
.rail-track {
  display: flex;
  min-height: 88px;
}

.rail-half {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  padding: 16px;
}

.rail-half.ok {
  background: var(--signal);
  color: var(--ink-dark);
}

.rail-half.bad {
  background: var(--danger);
  color: var(--ink-dark);
}

.rail-half.unavailable {
  background: var(--warning);
  color: var(--ink-dark);
}

.rail-half.idle {
  background: var(--surface-raised);
  color: var(--muted);
}

.rail-seam {
  background: var(--seam);
  box-shadow: 0 0 34px rgba(91, 145, 255, 0.8);
  width: 0;
}

.rail.split .rail-seam {
  animation: split-reveal 420ms cubic-bezier(0.16, 1, 0.3, 1);
  width: 12px;
}

@keyframes split-reveal {
  from {
    opacity: 0;
    transform: scaleY(0);
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}
```

- [ ] **Step 5: Complete responsive and reduced-motion behavior**

Use:

```css
@media (max-width: 900px) {
  .mission-header,
  .shell {
    grid-template-columns: 1fr;
  }

  .method-trace {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .method-trace li {
    border-bottom: 1px solid var(--rule);
  }
}

@media (max-width: 520px) {
  .mission-header {
    padding: 24px 16px;
  }

  .mission-copy h1 {
    font-size: clamp(3.4rem, 18vw, 5.2rem);
  }

  .method-trace {
    grid-template-columns: 1fr;
  }

  .shell {
    padding: 12px;
  }

  .run-alert-actions,
  .decision-actions,
  .override {
    align-items: stretch;
    flex-direction: column;
  }

  .run-alert-actions button,
  .decision-actions button,
  .override button {
    min-height: 44px;
    width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
}
```

Retain the existing `.tests-scroll` internal overflow and `min-width: 760px` table behavior.

- [ ] **Step 6: Verify all viewports and capture review screenshots**

```bash
npx playwright test e2e/safeship.spec.ts --grep "signature visual tokens"
npx playwright test e2e/safeship.spec.ts --grep "recorded evidence remains usable"
npm run test:e2e
```

Capture `/tmp/safeship-mobile.png`, `/tmp/safeship-tablet.png`, and `/tmp/safeship-desktop.png` through Playwright at 390, 768, and 1440 pixels. Inspect all three for clipped text, accidental page overflow, weak hierarchy, and inaccessible evidence.

- [ ] **Step 7: Commit and push**

```bash
git add app/globals.css components/RunGallery.tsx components/VerdictRail.tsx e2e/safeship.spec.ts
git commit -m "feat: apply forensic control room design"
git push origin integration/github-main-lane-c
```

---

### Task 8: Verify locked, idle, completed, and error states with axe

**Files:**

- Create: `e2e/accessibility.spec.ts`
- Modify: `components/AccessBoundary.tsx`
- Modify: `components/RunGallery.tsx`
- Modify: `app/globals.css`
- Modify: `e2e/safeship.spec.ts`

**Interfaces:**

- Consumes: `AxeBuilder`, the protected `/api/access` response contract, and bundled `RunRecord` agreement kinds.
- Produces: zero serious or critical axe violations for the locked boundary and main control-room states.

- [ ] **Step 1: Write the failing locked-screen and app accessibility tests**

Create:

```ts
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function seriousViolations(page: Page, root: string) {
  const result = await new AxeBuilder({ page })
    .include(root)
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  return result.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
}

test("the protected access boundary has no serious axe violations", async ({ page }) => {
  await page.route("**/api/access", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        required: true,
        authorized: false,
        configured: true,
      }),
    });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Enter the SafeShip demo code" })).toBeVisible();
  expect(await seriousViolations(page, ".access-shell")).toEqual([]);
});

test("the idle control room has no serious axe violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Agent-authored pull requests")).toBeVisible();
  expect(await seriousViolations(page, ".shell")).toEqual([]);
});

test("a completed case has no serious axe violations", async ({ page }) => {
  await page.goto("/");
  const card = page.locator(".run-card").filter({ hasText: "pr-101" }).first();
  await card.getByRole("button", { name: "Load recorded run" }).click();
  await expect(page.locator(".call.block")).toBeVisible();
  expect(await seriousViolations(page, ".shell")).toEqual([]);
});

test("an incorrect access code stays locked with an actionable error", async ({ page }) => {
  await page.route("**/api/access", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          required: true,
          authorized: false,
          configured: true,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ error: "Incorrect demo access code" }),
    });
  });
  await page.goto("/");
  await page.getByLabel("Demo access code").fill("incorrect-code");
  await page.getByRole("button", { name: "Unlock SafeShip" }).click();
  await expect(page.getByRole("alert")).toHaveText("Incorrect demo access code");
  await expect(page.getByText("Agent-authored pull requests")).toHaveCount(0);
});

test("a correct access code mounts the control room", async ({ page }) => {
  await page.route("**/api/access", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          required: true,
          authorized: false,
          configured: true,
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ authorized: true }),
    });
  });
  await page.goto("/");
  await page.getByLabel("Demo access code").fill("accepted-code");
  await page.getByRole("button", { name: "Unlock SafeShip" }).click();
  await expect(page.getByText("Agent-authored pull requests")).toBeVisible();
});
```

- [ ] **Step 2: Run the tests and record the exact failures**

```bash
npx playwright test e2e/accessibility.spec.ts
```

Expected: at least one test fails until the locked state and extracted component semantics share the final visual system.

- [ ] **Step 3: Restyle the protected boundary without changing authorization**

Use this structure inside the existing state logic:

```tsx
<main className="access-shell">
  <section className="access-panel" aria-labelledby="access-title">
    <span className="access-index">Protected integration boundary / 00</span>
    <p className="eyebrow">Live sponsor calls are locked</p>
    <h2 id="access-title">Enter the SafeShip demo code</h2>
    <p>
      A live gate generates attacks with Fireworks and creates a Daytona sandbox.
      Unlocking requires one explicit operator code.
    </p>
    {state.status === "checking" && <p className="empty">Checking access…</p>}
    {state.status === "failed" && (
      <p className="run-error-message" role="alert">
        {state.error}
      </p>
    )}
    {state.status === "required" && (
      <form onSubmit={submit} className="access-form">
        <label htmlFor="demo-code">Demo access code</label>
        <input
          id="demo-code"
          name="demo-code"
          type="password"
          autoComplete="current-password"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          disabled={submitting}
        />
        <button
          className="act"
          type="submit"
          disabled={submitting || code.trim().length === 0}
        >
          {submitting ? "Checking…" : "Unlock SafeShip"}
        </button>
        {state.error && (
          <p className="run-error-message" role="alert">
            {state.error}
          </p>
        )}
      </form>
    )}
  </section>
</main>
```

Use:

```css
.access-shell {
  display: grid;
  min-height: 62vh;
  padding: clamp(24px, 7vw, 96px);
  place-items: center;
}

.access-panel {
  background: var(--surface);
  border: 1px solid var(--rule);
  box-shadow: inset 4px 0 0 var(--warning), 0 28px 90px rgba(0, 0, 0, 0.35);
  max-width: 640px;
  padding: clamp(24px, 5vw, 56px);
  width: 100%;
}

.access-panel h2 {
  font-family: var(--display);
  font-size: clamp(2.5rem, 8vw, 5rem);
  line-height: 0.9;
  margin: 12px 0 20px;
  text-transform: uppercase;
}

.access-form input {
  min-height: 44px;
}
```

- [ ] **Step 4: Add recorded-case comparison labels**

In `RunGallery.tsx`, add:

```ts
const COMPARISON_LABEL: Record<RunRecord["result"]["agreement"]["kind"], string> = {
  both_caught: "Both methods caught it",
  both_clear: "Both methods clear",
  evidence_only: "Evidence caught it",
  opinion_only: "Opinion caught it",
  no_evidence: "Evidence unavailable",
  no_opinion: "Opinion unavailable",
};
```

Render:

```tsx
<div>
  <dt>Comparison</dt>
  <dd>{COMPARISON_LABEL[record.result.agreement.kind]}</dd>
</div>
```

This displays the existing pipeline result and does not calculate a new verdict.

- [ ] **Step 5: Add reduced-motion, keyboard, quadrant, and recovery assertions**

Add to `e2e/accessibility.spec.ts`:

```ts
test("keyboard focus follows case selection before the paid run action", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  const firstCase = page.getByRole("button", { name: /^pr-101\b/ });
  await firstCase.focus();
  await expect(firstCase).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Run adversarial gate" })).toBeVisible();
});

test.use({ reducedMotion: "reduce" });
test("reduced motion removes the verdict split animation", async ({ page }) => {
  await page.goto("/");
  const card = page.locator(".run-card").filter({ hasText: "pr-101" }).first();
  await card.getByRole("button", { name: "Load recorded run" }).click();
  const duration = await page.locator(".rail-seam").evaluate(
    (element) => getComputedStyle(element).animationDuration,
  );
expect(duration).toBe("0.00001s");
});
```

Add to `e2e/safeship.spec.ts`:

```ts
for (const expected of [
  { prId: "pr-101", kind: "Disagreement — evidence only", call: "Block" },
  { prId: "pr-102", kind: "Agreement — both clear", call: "Merge" },
  { prId: "pr-103", kind: "Disagreement — opinion only", call: "Block" },
  { prId: "pr-104", kind: "Agreement — both caught it", call: "Block" },
]) {
  test(`recorded ${expected.prId} preserves its comparison and call`, async ({ page }) => {
    await loadBundledRun(page, expected.prId);
    await expect(page.locator(".rail-kind")).toHaveText(expected.kind);
    await expect(page.locator(".call")).toHaveText(expected.call);
  });
}

test("a disconnected live stream exposes recovery without inventing evidence", async ({ page }) => {
  await page.addInitScript(() => {
    class DisconnectedEventSource {
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor(_url: string | URL) {
        window.setTimeout(() => {
          this.onopen?.(new Event("open"));
          this.onerror?.(new Event("error"));
        }, 0);
      }

      close() {}
    }

    Object.defineProperty(window, "EventSource", {
      configurable: true,
      value: DisconnectedEventSource,
    });
  });

  await page.goto("/");
  await selectPR(page, "pr-101");
  await page.getByRole("button", { name: "Run adversarial gate" }).click();
  await expect(page.getByRole("alert")).toContainText("Pipeline connection closed");
  await expect(page.getByRole("button", { name: "Load recorded run" })).toBeEnabled();
  await expect(page.locator(".rail-half").first()).toContainText("not run");
});
```

- [ ] **Step 6: Verify, commit, and push**

```bash
npx playwright test e2e/accessibility.spec.ts
npm run test:e2e
npm run lint
npm run typecheck
git add components/AccessBoundary.tsx components/RunGallery.tsx app/globals.css e2e
git commit -m "test: cover control room accessibility"
git push origin integration/github-main-lane-c
```

---

### Task 9: Create the Vercel handoff contract

**Files:**

- Create: `tests/deployment-docs.test.ts`
- Create: `docs/VERCEL_HANDOFF.md`
- Modify: `.env.example`
- Modify: `docs/DEPLOYMENT.md`
- Modify: `docs/PROGRESS.md`
- Modify: `package.json`

**Interfaces:**

- Consumes: the environment variables read by `scripts/check-env.ts`, `app/page.tsx`, `app/api/access/route.ts`, the Fireworks CopilotKit runtime, and CodeRabbit cache mode.
- Produces: one authoritative Preview/Production variable list with no credential values committed.

- [ ] **Step 1: Write the failing deployment-contract test**

Create:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const required = [
  "FIREWORKS_API_KEY",
  "FIREWORKS_BASE_URL",
  "FIREWORKS_MODEL",
  "DAYTONA_API_KEY",
  "BRAINTRUST_API_KEY",
  "BRAINTRUST_PROJECT",
  "SAFESHIP_DEMO_ACCESS_CODE",
  "CODERABBIT_MODE",
  "COPILOTKIT_MODEL",
] as const;

test("Vercel handoff names every required live variable without secrets", () => {
  const handoff = readFileSync("docs/VERCEL_HANDOFF.md", "utf8");
  for (const name of required) assert.match(handoff, new RegExp(`\\b${name}\\b`));
  assert.doesNotMatch(handoff, /\b(?:fw_|dtn_|cr-|sk-)[A-Za-z0-9_-]{16,}\b/);
  assert.doesNotMatch(handoff, /SAFESHIP_GATE_MODE=recorded/);
});

test("the public Vercel template omits local-only credentials", () => {
  const handoff = readFileSync("docs/VERCEL_HANDOFF.md", "utf8");
  assert.match(handoff, /CodeRabbit API key.*local recorder only/i);
  assert.doesNotMatch(handoff, /NEXT_PUBLIC_COPILOTKIT_API_KEY=/);
  assert.doesNotMatch(handoff, /OPENAI_API_KEY=/);
});
```

- [ ] **Step 2: Verify the test fails because the handoff does not exist**

```bash
npx tsx --test tests/deployment-docs.test.ts
```

Expected: FAIL with `ENOENT` for `docs/VERCEL_HANDOFF.md`.

- [ ] **Step 3: Write the exact Vercel handoff**

The document must contain this table:

```markdown
| Variable | Preview | Production | Value source |
|---|---:|---:|---|
| `FIREWORKS_API_KEY` | Yes | Yes | Local `.env` |
| `FIREWORKS_BASE_URL` | Yes | Yes | `https://api.fireworks.ai/inference/v1` |
| `FIREWORKS_MODEL` | Yes | Yes | `accounts/fireworks/models/kimi-k2p6` |
| `DAYTONA_API_KEY` | Yes | Yes | Local `.env` |
| `BRAINTRUST_API_KEY` | Yes | Yes | Local `.env` |
| `BRAINTRUST_PROJECT` | Yes | Yes | `safeship` |
| `SAFESHIP_DEMO_ACCESS_CODE` | Yes | Yes | Local `.env` |
| `CODERABBIT_MODE` | Yes | Yes | `cache` |
| `COPILOTKIT_MODEL` | Yes | Yes | `accounts/fireworks/models/kimi-k2p6` |
```

State explicitly:

- Do not set `SAFESHIP_GATE_MODE` on Preview or Production.
- Do not set `OPENAI_API_KEY`; CopilotKit uses Fireworks.
- Do not set `NEXT_PUBLIC_COPILOTKIT_API_KEY`; the app uses its server runtime route.
- The CodeRabbit API key is for the local recorder only and is not needed in Vercel cache mode.
- Environment updates require a redeploy.
- Preview additionally enables Vercel Authentication; Production still requires the application access code.

Include this non-echoing local verification command:

```bash
npm run check:env
```

Tell the operator to copy sensitive values directly from the ignored local `.env` into Vercel Project Settings. Do not print those values in a terminal transcript or commit them.

- [ ] **Step 4: Normalize `.env.example`**

Keep the same nine Vercel variables in the template. Keep these local-only optional entries below a separate comment:

```dotenv
# Local recorder only. Do not add this key to Vercel while production uses cache mode.
CODERABBIT_API_KEY=
CODERABBIT_BIN=
```

- [ ] **Step 5: Add the deployment test to the standard test glob**

The existing `tests/*.test.ts` glob already includes the file. Run:

```bash
npx tsx --test tests/deployment-docs.test.ts
npm test
```

Expected: both commands exit 0.

- [ ] **Step 6: Update release documentation and commit**

In `docs/PROGRESS.md`, record the forensic frontend, active-run fallback, accessibility tests, and Vercel handoff as completed only after their checks have passed.

```bash
git add .env.example docs/DEPLOYMENT.md docs/PROGRESS.md docs/VERCEL_HANDOFF.md tests/deployment-docs.test.ts package.json
git diff --cached --check
git commit -m "docs: add Vercel deployment handoff"
git push origin integration/github-main-lane-c
```

---

### Task 10: Run production verification and prepare the deployment handoff

**Files:**

- Modify only if evidence requires correction: `docs/PROGRESS.md`

**Interfaces:**

- Consumes: all completed tasks and the ignored root `.env`.
- Produces: fresh verification evidence, reviewed screenshots, a clean pushed branch, and a Vercel-ready variable checklist.

- [ ] **Step 1: Confirm secrets remain ignored and untracked**

```bash
git check-ignore -q .env
test -z "$(git ls-files .env)"
test "$(stat -f '%Lp' .env)" = "600"
git grep -nE '(fw_|dtn_|cr-|sk-)[A-Za-z0-9_-]{16,}' -- ':!package-lock.json'
```

Expected: `.env` is ignored, untracked, mode 600, and `git grep` prints no credential.

- [ ] **Step 2: Run the complete deterministic gate**

```bash
npm run check:env
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

Expected: every command exits 0 with zero lint warnings, type errors, test failures, build failures, serious axe violations, or browser-test failures.

- [ ] **Step 3: Run the required live sponsor smoke once**

```bash
npm run smoke -- pr-101
```

Expected: the final comparison is `evidence_only` and the gate call is `block`. If Fireworks or Daytona fails, report the external failure accurately; do not convert it into a passing claim.

- [ ] **Step 4: Inspect the final UI at required widths**

Run the app in recorded mode:

```bash
SAFESHIP_GATE_MODE=recorded SAFESHIP_RECORDED_DELAY_MS=5 npm run dev
```

Use Playwright to inspect and capture:

- 390 × 844 locked and completed states.
- 768 × 900 completed evidence.
- 1440 × 1000 idle, active, completed, and error states.

Expected: no page-level horizontal overflow, clipped actions, unreadable projector copy, missing focus indicator, or provenance ambiguity.

- [ ] **Step 5: Check the final branch and push any evidence-only documentation correction**

```bash
git status --short --branch
git log --oneline --decorate -12
git diff --check
git push origin integration/github-main-lane-c
```

Expected: the worktree is clean and the local branch matches its remote.

- [ ] **Step 6: Hand off Vercel configuration**

Give the operator:

- The branch or pull request to deploy.
- The table from `docs/VERCEL_HANDOFF.md`.
- The instruction to paste sensitive values from the ignored local `.env`.
- The exact nonsecret fixed values for base URL, models, project name, and cache mode.
- The reminder to enable Vercel Authentication for Preview.
- The reminder to redeploy after environment-variable changes.

Do not repeat secret values in chat, logs, commits, or screenshots.
