import { validateRunRecords, type RunRecord } from "../replay";
import type {
  AgreementKind,
  CodeRabbitReview,
  GateCall,
  GateResult,
  SandboxTestResult,
  TestVerdict,
} from "../types";

const CAPTURED_AT = "2026-07-24T18:00:00.000Z";

function sandboxResult(
  id: string,
  name: string,
  hypothesis: string,
  verdict: TestVerdict,
  stdout: string,
): SandboxTestResult {
  const outcomes: Record<
    TestVerdict,
    Pick<SandboxTestResult, "before" | "after">
  > = {
    claim_upheld: { before: "fail", after: "pass" },
    claim_broken: { before: "fail", after: "fail" },
    test_inconclusive: { before: "pass", after: "pass" },
    test_errored: { before: "error", after: "error" },
  };
  return {
    testId: id,
    testName: name,
    hypothesis,
    ...outcomes[verdict],
    verdict,
    stdout,
    stderr: verdict === "test_errored" ? "Recorded harness error" : "",
    durationMs: 840,
  };
}

function fixtureReview(
  verdict: CodeRabbitReview["verdict"],
  finding?: {
    title: string;
    body: string;
    line: number;
  },
): CodeRabbitReview {
  return {
    source: "fixture",
    verdict,
    findings: finding
      ? [
          {
            severity: "critical",
            file: "target.js",
            line: finding.line,
            title: finding.title,
            body: finding.body,
          },
        ]
      : [],
  };
}

function recordedRun(options: {
  prId: string;
  label: string;
  claim: string;
  targetBehavior: string;
  testName: string;
  hypothesis: string;
  testCode: string;
  verdict: TestVerdict;
  stdout: string;
  review: CodeRabbitReview;
  agreementKind: AgreementKind;
  agreementSummary: string;
  call: GateCall;
  rationale: string;
}): RunRecord {
  const resultRow = sandboxResult(
    "t1",
    options.testName,
    options.hypothesis,
    options.verdict,
    options.stdout,
  );
  const result: GateResult = {
    runId: `fixture-${options.prId}-v1`,
    prId: options.prId,
    startedAt: "2026-07-24T17:59:45.000Z",
    finishedAt: CAPTURED_AT,
    claim: {
      statement: options.claim,
      targetBehavior: options.targetBehavior,
      impliedInputs: [],
      confidence: 0.94,
    },
    tests: [
      {
        id: "t1",
        name: options.testName,
        hypothesis: options.hypothesis,
        code: options.testCode,
      },
    ],
    sandbox: {
      sandboxId: null,
      results: [resultRow],
      claimBroken: options.verdict === "claim_broken",
      totalDurationMs: 840,
    },
    codeRabbit: options.review,
    agreement: {
      agree:
        options.agreementKind === "both_caught" ||
        options.agreementKind === "both_clear",
      kind: options.agreementKind,
      summary: options.agreementSummary,
    },
    decision: {
      call: options.call,
      rationale: options.rationale,
      requiresHuman: true,
    },
  };

  return {
    id: `recorded_fixture:${result.runId}`,
    label: options.label,
    capturedAt: CAPTURED_AT,
    origin: "recorded_fixture",
    provenance: {
      fireworks: "recorded_fixture",
      daytona: "recorded_fixture",
      braintrust: "not_run",
    },
    result,
  };
}

export const RECORDED_RUNS = validateRunRecords([
  recordedRun({
    prId: "pr-101",
    label: "Evidence only",
    claim: "An empty or missing cart totals to zero instead of throwing.",
    targetBehavior: "cartTotal returns 0 for a null cart.",
    testName: "Null cart from a new session",
    hypothesis: "The new guard reads items.length before checking whether items is null.",
    testCode:
      "const { cartTotal } = require('./target.js');\nif (cartTotal(null) !== 0) throw new Error('expected zero');",
    verdict: "claim_broken",
    stdout: "TypeError: Cannot read properties of null (reading 'length')",
    review: fixtureReview("approve"),
    agreementKind: "evidence_only",
    agreementSummary:
      "The recorded execution fixture breaks the claim while the staged review placeholder approves it.",
    call: "block",
    rationale: "The null-cart counterexample still throws after the change.",
  }),
  recordedRun({
    prId: "pr-102",
    label: "Both clear",
    claim: "Pagination returns the full requested page without dropping the final item.",
    targetBehavior: "paginate returns exactly size items when enough items remain.",
    testName: "Full page boundary",
    hypothesis: "The exclusive slice bound may still drop the final item.",
    testCode:
      "const { paginate } = require('./target.js');\nif (paginate([1,2,3,4], 0, 4).length !== 4) throw new Error('short page');",
    verdict: "claim_upheld",
    stdout: "Observed four items on the corrected page.",
    review: fixtureReview("approve"),
    agreementKind: "both_clear",
    agreementSummary:
      "The recorded execution fixture supports the claim and the staged review placeholder raises no critical issue.",
    call: "merge",
    rationale: "The boundary test fails before and passes after the pagination fix.",
  }),
  recordedRun({
    prId: "pr-103",
    label: "Opinion only",
    claim: "Nested configuration objects merge recursively.",
    targetBehavior: "deepMerge preserves existing nested keys while applying overrides.",
    testName: "Nested key preservation",
    hypothesis: "The recursive branch may replace defaults instead of preserving them.",
    testCode:
      "const { deepMerge } = require('./target.js');\nconst out = deepMerge({a:{x:1}}, {a:{y:2}});\nif (out.a.x !== 1 || out.a.y !== 2) throw new Error('bad merge');",
    verdict: "claim_upheld",
    stdout: "Observed both nested keys after the merge.",
    review: fixtureReview("block", {
      title: "Prototype pollution in recursive merge",
      body: "Dangerous object keys are not filtered before recursive assignment.",
      line: 4,
    }),
    agreementKind: "opinion_only",
    agreementSummary:
      "The recorded execution fixture supports the stated merge claim, while the staged review placeholder flags a separate critical risk.",
    call: "block",
    rationale: "A critical static-review finding needs human inspection outside the claim.",
  }),
  recordedRun({
    prId: "pr-104",
    label: "Both caught",
    claim: "Transient upload failures are retried up to the requested attempt count.",
    targetBehavior: "retry invokes a failing operation more than once.",
    testName: "Second attempt succeeds",
    hypothesis: "The implementation may still stop after the first failure.",
    testCode:
      "const { retry } = require('./target.js');\nlet calls = 0;\nconst value = retry(() => { calls += 1; if (calls === 1) throw new Error('transient'); return 'ok'; }, 2);\nif (value !== 'ok') throw new Error('did not retry');",
    verdict: "claim_broken",
    stdout: "Error: transient",
    review: fixtureReview("block", {
      title: "Retry loop ignores attempts",
      body: "The loop bound is hardcoded to one.",
      line: 3,
    }),
    agreementKind: "both_caught",
    agreementSummary:
      "The recorded execution fixture and staged review placeholder both catch the hardcoded retry bound.",
    call: "block",
    rationale: "The operation is still attempted only once.",
  }),
]);

export function getRecordedRun(prId: string): RunRecord | undefined {
  return RECORDED_RUNS.find((record) => record.result.prId === prId);
}
