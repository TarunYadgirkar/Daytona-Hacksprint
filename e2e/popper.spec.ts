import { expect, test, type Page } from "@playwright/test";

async function selectPR(page: Page, prId: string): Promise<void> {
  await page.getByRole("button", { name: new RegExp(`^${prId}\\b`) }).click();
}

async function runRecordedGate(page: Page, prId = "pr-101"): Promise<void> {
  await selectPR(page, prId);
  await page.getByRole("button", { name: "Run adversarial gate" }).click();
  await expect(page.locator(".connection")).toHaveText("complete", {
    timeout: 30_000,
  });
}

async function loadBundledRun(page: Page, prId: string): Promise<void> {
  const card = page.locator(".run-card").filter({ hasText: prId }).first();
  await card.getByRole("button", { name: "Load recorded run" }).click();
  await expect(page.locator(".replay-banner")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Recorded-runs gallery")).toBeVisible({
    timeout: 45_000,
  });
});

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

test("selecting a PR previews it without starting a run", async ({ page }) => {
  let gateRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/gate") gateRequests += 1;
  });

  await selectPR(page, "pr-101");
  await expect(page.getByRole("heading", { name: "Case file pr-101" })).toBeVisible();
  await expect(page.getByText("Diff under test")).toBeVisible();
  await expect(page.getByText("Nothing runs until you start the gate.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Run adversarial gate" })).toBeVisible();
  await expect(page.locator(".connection")).toHaveText("idle");
  await expect(page.getByText(/Ready\. Start the gate/)).toBeVisible();
  await page.waitForTimeout(150);
  expect(gateRequests).toBe(0);
});

test("a recorded case can interrupt an active live run", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as Window & { __popperSourceClosed?: boolean };
    state.__popperSourceClosed = false;

    class HangingEventSource {
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor() {
        window.setTimeout(() => this.onopen?.(new Event("open")), 0);
      }

      close() {
        state.__popperSourceClosed = true;
      }
    }

    Object.defineProperty(window, "EventSource", {
      configurable: true,
      value: HangingEventSource,
    });
  });

  await page.reload();
  await expect(page.getByText("Recorded-runs gallery")).toBeVisible();
  await selectPR(page, "pr-101");
  await page.getByRole("button", { name: "Run adversarial gate" }).click();
  await expect(page.locator(".connection")).toHaveText(/connecting|connected/);

  const record = page.locator(".run-card").filter({ hasText: "pr-101" }).first();
  await record.getByRole("button", { name: "Abort live run and load" }).click();

  await expect(page.locator(".connection")).toHaveText("recorded");
  await expect(page.locator(".replay-banner")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { __popperSourceClosed?: boolean })
            .__popperSourceClosed,
      ),
    )
    .toBe(true);
});

test("CopilotKit runtime advertises the default Popper agent", async ({
  page,
}) => {
  const response = await page.request.get("/api/copilotkit/info");
  expect(response.status()).toBe(200);
  const info = (await response.json()) as {
    agents?: Record<string, { className?: string }>;
  };
  expect(info.agents?.default?.className).toBe("BuiltInAgent");

  await page.getByRole("button", { name: "Open chat" }).click();
  await expect(
    page.getByRole("complementary", { name: "Copilot chat sidebar" }),
  ).toBeVisible();
  await expect(page.getByText(/Runtime info request failed/)).toHaveCount(0);
});

test("completed evidence-only fixture blocks and labels opinion provenance", async ({
  page,
}) => {
  await runRecordedGate(page);

  const stages = page.locator(".stage");
  await expect(stages.first().getByText(/Pending|Running|Complete|Error/)).toBeVisible();
  await expect(
    page.getByRole("status", { name: "Pipeline status updates" }),
  ).toBeAttached();
  await expect(page.locator(".rail-kind")).toHaveText("Disagreement — evidence only");
  await expect(page.locator(".call.block")).toHaveText("Block");
  await expect(
    page.getByText(/Staged placeholder—not CodeRabbit output/),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy evidence report" })).toBeVisible();
});

test("completed evidence follows the claim-to-human-decision story", async ({
  page,
}) => {
  await loadBundledRun(page, "pr-101");
  const labels = await page
    .locator(".evidence-workspace > section .label")
    .allTextContents();
  expect(labels).toEqual([
    "The claim",
    "Execution evidence vs review opinion",
    "Pipeline",
    "Adversarial execution",
    "CodeRabbit opinion",
  ]);
  await expect(page.getByText("Execution evidence", { exact: true })).toBeVisible();
  await expect(
    page.locator(".rail-half.right").getByText("CodeRabbit opinion", {
      exact: true,
    }),
  ).toBeVisible();
});

test("the forensic control room exposes its signature visual tokens", async ({
  page,
}) => {
  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const bodyStyle = getComputedStyle(document.body);
    const headingStyle = getComputedStyle(document.querySelector("h1")!);
    const panelStyle = getComputedStyle(document.querySelector(".panel")!);
    const cardStyle = getComputedStyle(document.querySelector(".case-card")!);
    return {
      ground: style.getPropertyValue("--ground").trim(),
      signal: style.getPropertyValue("--signal").trim(),
      danger: style.getPropertyValue("--danger").trim(),
      seam: style.getPropertyValue("--seam").trim(),
      display: style.getPropertyValue("--display").trim(),
      sans: style.getPropertyValue("--sans").trim(),
      bodyFont: bodyStyle.fontFamily,
      headingFont: headingStyle.fontFamily,
      panelRadius: panelStyle.borderRadius,
      panelBackdrop: panelStyle.backdropFilter,
      cardRadius: cardStyle.borderRadius,
    };
  });

  expect(tokens).toMatchObject({
    ground: "#020100",
    signal: "#235789",
    danger: "#c1292e",
    seam: "#235789",
  });
  expect(tokens.display).toContain("Newsreader");
  expect(tokens.sans).toContain("Public Sans");
  expect(tokens.bodyFont).toContain("Public Sans");
  expect(tokens.headingFont).toContain("Newsreader");
  expect(tokens.panelRadius).not.toBe("0px");
  expect(tokens.panelBackdrop).toContain("blur");
  expect(tokens.cardRadius).not.toBe("0px");
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
  await expect(page.locator(".run-alert[role='alert']")).toContainText(
    "Sandbox evidence unavailable",
  );
});

test("a completed recorded run remains loadable after reload", async ({ page }) => {
  await runRecordedGate(page);
  const saved = await page.evaluate(() =>
    window.localStorage.getItem("popper:run-library:v2"),
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

for (const expected of [
  { prId: "pr-101", kind: "Disagreement — evidence only", call: "Block" },
  { prId: "pr-102", kind: "Agreement — both clear", call: "Merge" },
  { prId: "pr-103", kind: "Disagreement — opinion only", call: "Block" },
  { prId: "pr-104", kind: "Agreement — both caught it", call: "Block" },
]) {
  test(`recorded ${expected.prId} preserves its comparison and call`, async ({
    page,
  }) => {
    await loadBundledRun(page, expected.prId);
    await expect(page.locator(".rail-kind")).toHaveText(expected.kind);
    await expect(page.locator(".call")).toHaveText(expected.call);
  });
}

test("a disconnected live stream exposes recovery without inventing evidence", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class DisconnectedEventSource {
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor() {
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

  await page.reload();
  await expect(page.getByText("Agent-authored pull requests")).toBeVisible({
    timeout: 45_000,
  });
  await selectPR(page, "pr-101");
  await page.getByRole("button", { name: "Run adversarial gate" }).click();
  await expect(page.locator(".run-alert[role='alert']")).toContainText(
    "Pipeline connection closed",
  );
  await expect(
    page.locator(".run-alert").getByRole("button", {
      name: "Load recorded run",
    }),
  ).toBeEnabled();
  await expect(page.locator(".rail-half").first()).toContainText("not run");
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
    const overflow = await page.evaluate(() => {
      const main = document.querySelector(".shell > main");
      const gallery = document.querySelector(".shell > aside > .panel");
      return {
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
        mainTop: main?.getBoundingClientRect().top,
        galleryTop: gallery?.getBoundingClientRect().top,
        offenders: Array.from(document.body.querySelectorAll<HTMLElement>("*"))
          .filter((element) => {
            const rect = element.getBoundingClientRect();
            return rect.right > document.documentElement.clientWidth + 1;
          })
          .slice(0, 12)
          .map((element) => ({
            className: element.className,
            tagName: element.tagName,
            testId: element.dataset.testid,
            right: Math.round(element.getBoundingClientRect().right),
          })),
      };
    });
    expect(
      overflow.documentWidth,
      `Page overflowed at ${viewport.name}: ${JSON.stringify(overflow.offenders)}`,
    ).toBeLessThanOrEqual(overflow.viewportWidth + 1);
    if (viewport.width <= 768) {
      expect(
        overflow.mainTop,
        "Mobile evidence should appear before the replay library",
      ).toBeLessThan(overflow.galleryTop ?? Number.POSITIVE_INFINITY);
    }
  });
}
