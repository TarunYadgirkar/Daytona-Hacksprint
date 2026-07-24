import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function seriousViolations(page: Page, root: string) {
  const result = await new AxeBuilder({ page })
    .include(root)
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  return result.violations.filter(
    (violation) =>
      violation.impact === "serious" || violation.impact === "critical",
  );
}

async function selectPR(page: Page, prId: string): Promise<void> {
  await page
    .getByRole("button", { name: new RegExp(`^${prId}\\b`) })
    .click();
}

test("the idle control room has no serious axe violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Agent-authored pull requests")).toBeVisible({
    timeout: 45_000,
  });
  expect(await seriousViolations(page, ".shell")).toEqual([]);
});

test("an active control room has no serious axe violations", async ({
  page,
}) => {
  await page.addInitScript(() => {
    class HangingEventSource {
      onopen: ((event: Event) => void) | null = null;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: Event) => void) | null = null;

      constructor() {
        window.setTimeout(() => this.onopen?.(new Event("open")), 0);
      }

      close() {}
    }
    Object.defineProperty(window, "EventSource", {
      configurable: true,
      value: HangingEventSource,
    });
  });
  await page.goto("/");
  await expect(page.getByText("Agent-authored pull requests")).toBeVisible({
    timeout: 45_000,
  });
  await selectPR(page, "pr-101");
  await page.getByRole("button", { name: "Run adversarial gate" }).click();
  await expect(page.locator(".connection")).toHaveText(/connecting|connected/);
  expect(await seriousViolations(page, ".shell")).toEqual([]);
});

test("a completed case has no serious axe violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Recorded-runs gallery")).toBeVisible({
    timeout: 45_000,
  });
  const card = page.locator(".run-card").filter({ hasText: "pr-101" }).first();
  await card.getByRole("button", { name: "Load recorded run" }).click();
  await expect(page.locator(".call.block")).toBeVisible();
  expect(await seriousViolations(page, ".shell")).toEqual([]);
});

test("an error state has no serious axe violations", async ({ page }) => {
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
  await page.goto("/");
  await expect(page.getByText("Agent-authored pull requests")).toBeVisible({
    timeout: 45_000,
  });
  await selectPR(page, "pr-101");
  await page.getByRole("button", { name: "Run adversarial gate" }).click();
  await expect(page.locator(".run-alert[role='alert']")).toContainText(
    "Pipeline connection closed",
  );
  expect(await seriousViolations(page, ".shell")).toEqual([]);
});

test("keyboard focus follows case selection before the paid run action", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Agent-authored pull requests")).toBeVisible({
    timeout: 45_000,
  });
  const firstCase = page.getByRole("button", { name: /^pr-101\b/ });
  await firstCase.focus();
  await expect(firstCase).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Run adversarial gate" }),
  ).toBeVisible();
});

test("reduced motion removes the verdict split animation", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByText("Recorded-runs gallery")).toBeVisible({
    timeout: 45_000,
  });
  const card = page.locator(".run-card").filter({ hasText: "pr-101" }).first();
  await card.getByRole("button", { name: "Load recorded run" }).click();
  const duration = await page
    .locator(".rail-seam")
    .evaluate((element) => getComputedStyle(element).animationDuration);
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.00001);
});
