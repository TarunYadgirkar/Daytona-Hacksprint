import assert from "node:assert/strict";
import test from "node:test";
import { formatEvidenceReport } from "./evidence-report";

test("formatEvidenceReport preserves the copyable evidence summary", () => {
  const report = formatEvidenceReport({
    runId: "run-123",
    claim: {
      statement: "Null carts return zero.",
      targetBehavior: "Return zero without throwing.",
      impliedInputs: ["null"],
      confidence: 0.95,
    },
    tests: [
      {
        id: "test-1",
        name: "Null cart",
        hypothesis: "The guard may dereference null.",
        code: "process.exit(0);",
      },
      {
        id: "test-2",
        name: "Empty cart",
        hypothesis: "The empty path may be unchanged.",
        code: "process.exit(0);",
      },
    ],
    results: [
      {
        testId: "test-1",
        testName: "Null cart",
        hypothesis: "The guard may dereference null.",
        before: "fail",
        after: "pass",
        verdict: "claim_upheld",
        stdout: "",
        stderr: "",
        durationMs: 10,
      },
    ],
    review: {
      source: "fixture",
      verdict: "concerns",
      findings: [],
    },
    agreement: {
      agree: false,
      kind: "evidence_only",
      summary: "Execution found a regression.",
    },
    decision: {
      call: "block",
      rationale: "A human must inspect the evidence.",
      requiresHuman: true,
    },
  });

  assert.equal(
    report,
    [
      "Popper evidence report",
      "Run: run-123",
      "Claim: Null carts return zero.",
      "",
      "Adversarial execution:",
      "- Null cart: before=fail, after=pass, verdict=claim_upheld",
      "- Empty cart: no execution result",
      "",
      "CodeRabbit: concerns (fixture)",
      "Comparison: evidence_only — Execution found a regression.",
      "Recommendation: BLOCK — A human must inspect the evidence.",
      "Human decision required: yes",
    ].join("\n"),
  );
});
