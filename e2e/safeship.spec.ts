import { expect, test, type Page } from "@playwright/test";

async function selectPR(page: Page, prId: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^${prId}\\b`) }).click();
}

async function runRecordedGate(page: Page, prId = "pr-101"): Promise<void> {
  await selectPR(page, prId);
  await page.getByRole("button", { name: "Run adversarial gate" }).click();
  await expect(page.locator(".connection")).toHaveText("complete");
}

async function loadBundledRun(page: Page, prId: string): Promise<void> {
  const card = page.locator(".run-card").filter({ hasText: prId }).first();
  await card.getByRole("button", { name: "Load recorded run" }).click();
  await expect(page.locator(".replay-banner")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Recorded-runs gallery")).toBeVisible();
});

test("selecting a PR previews it without starting a run", async ({ page }) => {
  let gateRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/gate") gateRequests += 1;
  });

  await selectPR(page, "pr-101");
  await expect(page.getByText("Diff under test")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run adversarial gate" })).toBeVisible();
  await expect(page.locator(".connection")).toHaveText("idle");
  await expect(page.getByText(/Ready\. Start the gate/)).toBeVisible();
  await page.waitForTimeout(150);
  expect(gateRequests).toBe(0);
});

test("completed evidence-only fixture blocks and labels opinion provenance", async ({
  page,
}) => {
  await runRecordedGate(page);

  await expect(page.locator(".rail-kind")).toHaveText("Disagreement — evidence only");
  await expect(page.locator(".call.block")).toHaveText("Block");
  await expect(
    page.getByText(/Staged placeholder—not CodeRabbit output/),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy evidence report" })).toBeVisible();
});

test("unavailable evidence is never rendered as green", async ({ page }) => {
  const result = {
    runId: "fixture-no-evidence-v1",
    prId: "pr-102",
    startedAt: "2026-07-24T19:00:00.000Z",
    finishedAt: "2026-07-24T19:00:01.000Z",
    claim: {
      statement: "Pagination returns a full page.",
      targetBehavior: "Return the requested item count.",
      impliedInputs: ["page boundary"],
      confidence: 0.9,
    },
    tests: [
      {
        id: "t1",
        name: "Full page",
        hypothesis: "The sandbox may be unavailable.",
        code: "const target = require('./target.js');",
      },
    ],
    sandbox: {
      sandboxId: null,
      results: [],
      claimBroken: false,
      totalDurationMs: 0,
      infraError: "Recorded Daytona outage",
    },
    codeRabbit: {
      source: "fixture",
      verdict: "approve",
      findings: [],
    },
    agreement: {
      agree: false,
      kind: "no_evidence",
      summary: "The sandbox did not run, so there is no execution evidence to compare.",
    },
    decision: {
      call: "block",
      rationale: "Evidence is unavailable.",
      requiresHuman: true,
    },
  } as const;
  const events = [
    { type: "run_start", runId: result.runId, prId: result.prId, at: result.startedAt },
    { type: "claim_ready", claim: result.claim },
    { type: "test_generated", test: result.tests[0] },
    { type: "sandbox_ready", report: result.sandbox },
    { type: "coderabbit_ready", review: result.codeRabbit },
    { type: "agreement_ready", agreement: result.agreement },
    { type: "decision_ready", decision: result.decision },
    { type: "run_complete", result },
  ];
  const body = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");

  await page.route("**/api/gate?pr=pr-102", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: { "cache-control": "no-cache" },
      body,
    });
  });

  await selectPR(page, "pr-102");
  await page.getByRole("button", { name: "Run adversarial gate" }).click();
  await expect(page.locator(".connection")).toHaveText("complete");
  const evidence = page.locator(".rail-half").first();
  await expect(evidence).toHaveClass(/unavailable/);
  await expect(evidence).not.toHaveClass(/ok/);
  await expect(evidence).toContainText("unavailable");
  await expect(page.locator(".call.block")).toHaveText("Block");
  await expect(page.getByRole("alert")).toContainText("Sandbox evidence unavailable");
});

test("a completed recorded run remains loadable after reload", async ({ page }) => {
  await runRecordedGate(page);
  const saved = await page.evaluate(() =>
    window.localStorage.getItem("safeship:run-library:v2"),
  );
  expect(saved).toContain("fixture-pr-101-v1");

  await page.reload();
  await expect(page.getByText("Recorded-runs gallery")).toBeVisible();
  await loadBundledRun(page, "pr-101");
  await expect(page.locator(".replay-banner")).toContainText(
    "No model, sandbox, review command, or Braintrust write ran again.",
  );
  await expect(page.locator(".call.block")).toHaveText("Block");
});

test("failed override never displays a recorded success", async ({ page }) => {
  await loadBundledRun(page, "pr-101");
  await page.getByLabel("Reason for the record").fill("Fixture integrity check");
  await page.locator(".override").getByRole("button", { name: "Block", exact: true }).click();

  await expect(page.locator(".override-error")).toContainText(
    "Recorded fixture decisions are not written to Braintrust",
  );
  await expect(page.locator(".override-done")).toHaveCount(0);
});

for (const viewport of [
  { name: "390px", width: 390, height: 844 },
  { name: "768px", width: 768, height: 900 },
  { name: "desktop", width: 1280, height: 900 },
]) {
  test(`recorded evidence remains usable at ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.reload();
    await loadBundledRun(page, "pr-101");

    await expect(page.locator(".tests-scroll")).toBeVisible();
    await page.getByText("View generated test code").click();
    await expect(page.locator(".test-detail pre")).toBeVisible();
    const hasPageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(hasPageOverflow).toBe(false);
  });
}
