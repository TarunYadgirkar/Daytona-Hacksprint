/**
 * The SafeShip gate.
 *
 *   claim -> tests -> sandbox -> coderabbit -> compare -> decision
 *
 * Everything the UI shows and everything Braintrust records comes from here.
 * Resist the urge to compute anything in a component: if the projector and the
 * audit log disagree, the product's whole argument collapses.
 */

import { randomUUID } from "node:crypto";
import type { EventSink } from "./events";
import type {
  AgreementAnalysis,
  CodeRabbitReview,
  GateDecision,
  GateResult,
  SandboxReport,
  StageName,
  StagedPR,
} from "./types";
import { extractClaim, generateAdversarialTests } from "./adapters/fireworks";
import { runAdversarialSuite } from "./adapters/daytona";
import { getCodeRabbitReview } from "./adapters/coderabbit";
import { flushLogger, logGateRun, tracedStage } from "./adapters/braintrust";

export class GateStageError extends Error {
  readonly stage: StageName;

  constructor(stage: StageName, cause: unknown) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "GateStageError";
    this.stage = stage;
  }
}

async function inStage<T>(stage: StageName, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw error instanceof GateStageError ? error : new GateStageError(stage, error);
  }
}

/**
 * Compare the two signals.
 *
 * The asymmetry here is the thesis of the product, so it is written out rather
 * than collapsed into a truth table: a failing test is a fact about the code,
 * a review verdict is a judgement about the code. When they collide, the fact
 * wins on the merge decision — but the judgement still gets shown, because a
 * reviewer flagging something the tests never targeted is exactly the case
 * where a human should look.
 */
export function compare(sandbox: SandboxReport, review: CodeRabbitReview): AgreementAnalysis {
  // No evidence is not the same as clean evidence. Saying "both clear" here
  // would be exactly the evidence/opinion blur this product exists to name.
  if (sandbox.infraError) {
    return {
      agree: false,
      kind: "no_evidence",
      summary: `The sandbox failed, so no adversarial test actually ran. CodeRabbit ${
        review.verdict === "block" ? "raised a critical finding" : "did not object"
      }, but that is an opinion with nothing to check it against.`,
    };
  }

  const evidenceObjects = sandbox.claimBroken;
  const opinionObjects = review.verdict === "block";

  if (evidenceObjects && opinionObjects) {
    return {
      agree: true,
      kind: "both_caught",
      summary:
        "Adversarial tests broke the claim and CodeRabbit independently flagged a critical issue. Two methods, same conclusion.",
    };
  }

  if (!evidenceObjects && !opinionObjects) {
    return {
      agree: true,
      kind: "both_clear",
      summary:
        "The claim survived every adversarial test, and CodeRabbit raised nothing critical. Nothing to escalate.",
    };
  }

  if (evidenceObjects && !opinionObjects) {
    const broken = sandbox.results.filter((r) => r.verdict === "claim_broken");
    return {
      agree: false,
      kind: "evidence_only",
      summary: `CodeRabbit approved this change, but ${broken.length} adversarial ${
        broken.length === 1 ? "test" : "tests"
      } proved the claim false against the real code. A reading of the diff missed what running it showed.`,
    };
  }

  return {
    agree: false,
    kind: "opinion_only",
    summary:
      "Every adversarial test passed, but CodeRabbit flagged a critical issue. The tests targeted the PR's stated claim; the finding is about something the claim never mentioned. Worth a human read.",
  };
}

/** Turn the comparison into a recommendation. Never an action. */
export function decide(
  agreement: AgreementAnalysis,
  sandbox: SandboxReport,
  review: CodeRabbitReview,
): GateDecision {
  if (sandbox.infraError) {
    return {
      call: "block",
      rationale: `No evidence available: the sandbox failed with "${sandbox.infraError}". SafeShip blocks when it cannot verify rather than assuming the claim holds.`,
      requiresHuman: true,
    };
  }

  if (sandbox.claimBroken) {
    const broken = sandbox.results.find((r) => r.verdict === "claim_broken");
    return {
      call: "block",
      rationale: `The PR's own claim fails under test: "${broken?.testName}". ${broken?.hypothesis}`,
      requiresHuman: true,
    };
  }

  if (review.verdict === "block") {
    return {
      call: "block",
      rationale: `Tests found no counterexample to the claim, but CodeRabbit raised a critical finding outside the claim's scope: "${review.findings.find((f) => f.severity === "critical")?.title}".`,
      requiresHuman: true,
    };
  }

  const inconclusive = sandbox.results.filter((r) => r.verdict === "test_inconclusive").length;
  return {
    call: "merge",
    rationale:
      inconclusive > 0
        ? `The claim held under every adversarial test, though ${inconclusive} passed against the pre-change code too and so proved nothing.`
        : "Every adversarial test failed against the old code and passed against the new code. The claim is supported by evidence, not assertion.",
    requiresHuman: true,
  };
}

export interface RunGateOptions {
  pr: StagedPR;
  emit: EventSink;
  testCount?: number;
}

export async function runGate({ pr, emit, testCount = 4 }: RunGateOptions): Promise<GateResult> {
  const runId = randomUUID();
  const startedAt = new Date().toISOString();
  const now = () => new Date().toISOString();

  emit({ type: "run_start", runId, prId: pr.id, at: startedAt });

  // ---- 1. What is this PR actually promising? --------------------------
  emit({ type: "stage_start", stage: "claim", at: now() });
  const claim = await inStage("claim", () =>
    tracedStage("1. extract claim", { pr: pr.id, title: pr.title }, () => extractClaim(pr)),
  );
  emit({ type: "claim_ready", claim });
  emit({ type: "stage_done", stage: "claim", at: now() });

  // ---- 2. Write code designed to make that promise fail ----------------
  emit({ type: "stage_start", stage: "tests", at: now() });
  emit({ type: "log", stage: "tests", message: `Generating ${testCount} adversarial tests…` });
  const tests = await inStage("tests", () =>
    tracedStage("2. generate adversarial tests", { claim }, () =>
      generateAdversarialTests(pr, claim, testCount),
    ),
  );
  for (const test of tests) emit({ type: "test_generated", test });
  emit({ type: "stage_done", stage: "tests", at: now() });

  // ---- 3. Run them for real, against before and after ------------------
  emit({ type: "stage_start", stage: "sandbox", at: now() });
  const sandbox = await inStage("sandbox", () =>
    tracedStage(
      "3. execute in sandbox",
      { testIds: tests.map((t) => t.id) },
      () =>
        runAdversarialSuite({
          pr,
          tests,
          onResult: (result) => emit({ type: "test_result", result }),
          onLog: (message) => emit({ type: "log", stage: "sandbox", message }),
        }),
    ),
  );
  emit({ type: "sandbox_ready", report: sandbox });
  if (sandbox.infraError) emit({ type: "stage_error", stage: "sandbox", message: sandbox.infraError });
  emit({ type: "stage_done", stage: "sandbox", at: now() });

  // ---- 4. The independent second opinion -------------------------------
  emit({ type: "stage_start", stage: "coderabbit", at: now() });
  const codeRabbit = await inStage("coderabbit", () =>
    tracedStage("4. coderabbit review", { pr: pr.id }, () => getCodeRabbitReview(pr)),
  );
  emit({
    type: "log",
    stage: "coderabbit",
    message:
      codeRabbit.source === "cache"
        ? `Reading recorded verdict${codeRabbit.recordedAt ? ` from ${codeRabbit.recordedAt}` : ""}.`
        : codeRabbit.source === "fixture"
          ? "Using a staged review placeholder. This is not a recorded CodeRabbit verdict."
          : "Live CLI review complete.",
  });
  emit({ type: "coderabbit_ready", review: codeRabbit });
  emit({ type: "stage_done", stage: "coderabbit", at: now() });

  // ---- 5. Where do they disagree? --------------------------------------
  emit({ type: "stage_start", stage: "compare", at: now() });
  const agreement = await inStage("compare", () =>
    tracedStage("5. compare methods", { sandbox, codeRabbit }, async () =>
      compare(sandbox, codeRabbit),
    ),
  );
  emit({ type: "agreement_ready", agreement });
  emit({ type: "stage_done", stage: "compare", at: now() });

  // ---- 6. Recommend. A human still decides. ----------------------------
  emit({ type: "stage_start", stage: "decision", at: now() });
  const decision = await inStage("decision", () =>
    tracedStage("6. gate decision", { agreement }, async () =>
      decide(agreement, sandbox, codeRabbit),
    ),
  );
  emit({ type: "decision_ready", decision });
  emit({ type: "stage_done", stage: "decision", at: now() });

  const result: GateResult = {
    runId,
    prId: pr.id,
    startedAt,
    finishedAt: now(),
    claim,
    tests,
    sandbox,
    codeRabbit,
    agreement,
    decision,
  };

  await logGateRun(result);
  await flushLogger(); // must happen before the route handler returns
  emit({ type: "run_complete", result });

  return result;
}
