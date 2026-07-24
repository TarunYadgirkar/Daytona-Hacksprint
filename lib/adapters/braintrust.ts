/**
 * Braintrust adapter: the audit trail for every gate decision.
 *
 * One run = one root span, with a child span per pipeline stage. The trace is
 * the thing you open on stage when a judge asks "how do you know?", so the span
 * names below are chosen to read well in the Braintrust UI, in pipeline order.
 *
 * SERVERLESS GOTCHA: Braintrust batches log writes in the background. A Next.js
 * route handler can return and be frozen before that batch flushes, and the
 * trace silently never appears. Always `await flushLogger()` before returning.
 * This has bitten every team that has ever demoed this integration.
 */

import { initLogger, type Logger } from "braintrust";
import type { GateResult, HumanOverride } from "../types";

let logger: Logger<true> | null = null;

export function getLogger(): Logger<true> | null {
  if (!process.env.BRAINTRUST_API_KEY) return null; // no key, no-op, never throws
  if (!logger) {
    logger = initLogger({
      projectName: process.env.BRAINTRUST_PROJECT ?? "safeship",
      apiKey: process.env.BRAINTRUST_API_KEY,
    }) as Logger<true>;
  }
  return logger;
}

/**
 * Wrap a pipeline stage in a child span. Returns the callback's value
 * untouched, and never converts a logging failure into a pipeline failure.
 */
export async function tracedStage<T>(
  name: string,
  input: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  const log = getLogger();
  if (!log) return fn();

  return log.traced(
    async (span) => {
      span.log({ input });
      const output = await fn();
      span.log({ output });
      return output;
    },
    { name },
  );
}

/**
 * Log the assembled result. The scores are what make runs comparable across a
 * demo: you can sort by disagreement and find the interesting cases instantly.
 */
export async function logGateRun(result: GateResult): Promise<void> {
  const log = getLogger();
  if (!log) return;

  log.log({
    input: { prId: result.prId, runId: result.runId },
    output: {
      claim: result.claim.statement,
      decision: result.decision.call,
      rationale: result.decision.rationale,
      agreement: result.agreement.kind,
    },
    metadata: {
      runId: result.runId,
      prId: result.prId,
      claimConfidence: result.claim.confidence,
      testCount: result.tests.length,
      codeRabbitVerdict: result.codeRabbit.verdict,
      codeRabbitSource: result.codeRabbit.source,
      sandboxId: result.sandbox.sandboxId,
      infraError: result.sandbox.infraError ?? null,
      verdicts: result.sandbox.results.map((r) => `${r.testId}:${r.verdict}`),
    },
    scores: {
      // 1 when the two methods reached the same conclusion. Sort ascending to
      // surface the disagreements, which is the whole point of the product.
      methods_agree: result.agreement.agree ? 1 : 0,
      claim_survived: result.sandbox.claimBroken ? 0 : 1,
      evidence_available: result.sandbox.infraError ? 0 : 1,
    },
  });
}

/** A human clicking override is feedback on the gate, so log it as feedback. */
export async function logHumanOverride(override: HumanOverride): Promise<void> {
  const log = getLogger();
  if (!log) return;
  log.log({
    input: { runId: override.runId, action: "human_override" },
    output: { call: override.call, reason: override.reason },
    metadata: { runId: override.runId, at: override.at, source: "human" },
    scores: { human_overrode_gate: 1 },
  });
  await flushLogger();
}

/** Call before any serverless handler returns. Swallows its own errors. */
export async function flushLogger(): Promise<void> {
  try {
    await getLogger()?.flush();
  } catch (err) {
    console.error("[braintrust] flush failed:", err);
  }
}
