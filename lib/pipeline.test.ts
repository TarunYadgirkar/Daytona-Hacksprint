import assert from "node:assert/strict";
import test from "node:test";
import { compare, decide } from "./pipeline";
import type {
  CodeRabbitReview,
  SandboxReport,
  SandboxTestResult,
  TestVerdict,
} from "./types";

const approvingReview: CodeRabbitReview = {
  verdict: "approve",
  findings: [],
  source: "cli",
  recordedAt: "2026-07-24T10:00:00.000Z",
};

function result(verdict: TestVerdict, id: string): SandboxTestResult {
  const outcomes: Record<TestVerdict, Pick<SandboxTestResult, "before" | "after">> = {
    claim_upheld: { before: "fail", after: "pass" },
    claim_broken: { before: "fail", after: "fail" },
    test_inconclusive: { before: "pass", after: "pass" },
    test_errored: { before: "error", after: "error" },
  };

  return {
    testId: id,
    testName: id,
    hypothesis: `Exercise ${verdict}`,
    ...outcomes[verdict],
    verdict,
    stdout: "",
    stderr: "",
    durationMs: 1,
  };
}

function report(verdicts: TestVerdict[]): SandboxReport {
  const results = verdicts.map((verdict, index) => result(verdict, `t${index + 1}`));
  return {
    sandboxId: "sandbox-1",
    results,
    claimBroken: results.some((item) => item.verdict === "claim_broken"),
    totalDurationMs: results.length,
  };
}

test("all-inconclusive execution is no evidence and blocks", () => {
  const sandbox = report(["test_inconclusive", "test_inconclusive"]);
  const agreement = compare(sandbox, approvingReview);

  assert.equal(agreement.kind, "no_evidence");
  assert.equal(decide(agreement, sandbox, approvingReview).call, "block");
});

test("all-errored execution is no evidence and blocks", () => {
  const sandbox = report(["test_errored", "test_errored"]);
  const agreement = compare(sandbox, approvingReview);

  assert.equal(agreement.kind, "no_evidence");
  assert.equal(decide(agreement, sandbox, approvingReview).call, "block");
});

test("partial harness errors prevent a positive recommendation", () => {
  const sandbox = report(["claim_upheld", "test_errored"]);
  const agreement = compare(sandbox, approvingReview);

  assert.equal(agreement.kind, "no_evidence");
  assert.equal(decide(agreement, sandbox, approvingReview).call, "block");
});

test("a real counterexample remains decisive when another harness errors", () => {
  const sandbox = report(["claim_broken", "test_errored"]);
  const agreement = compare(sandbox, approvingReview);

  assert.equal(agreement.kind, "evidence_only");
  assert.equal(decide(agreement, sandbox, approvingReview).call, "block");
});

test("conclusive support can recommend merge while naming inconclusive tests", () => {
  const sandbox = report(["claim_upheld", "test_inconclusive"]);
  const agreement = compare(sandbox, approvingReview);
  const decision = decide(agreement, sandbox, approvingReview);

  assert.equal(agreement.kind, "both_clear");
  assert.equal(decision.call, "merge");
  assert.match(decision.rationale, /1 conclusive adversarial test/);
  assert.match(decision.rationale, /proved nothing/);
  assert.equal(decision.requiresHuman, true);
});

test("an approving fixture is an unavailable opinion and blocks", () => {
  const sandbox = report(["claim_upheld"]);
  const fixture: CodeRabbitReview = {
    verdict: "approve",
    findings: [],
    source: "fixture",
  };
  const agreement = compare(sandbox, fixture);

  assert.equal(agreement.kind, "no_opinion");
  assert.equal(agreement.agree, false);
  assert.match(agreement.summary, /opinion is unavailable/i);
  assert.equal(decide(agreement, sandbox, fixture).call, "block");
});

test("a blocking fixture is still an unavailable opinion and blocks", () => {
  const sandbox = report(["claim_upheld"]);
  const fixture: CodeRabbitReview = {
    verdict: "block",
    findings: [{ severity: "critical", title: "Placeholder finding" }],
    source: "fixture",
  };
  const agreement = compare(sandbox, fixture);

  assert.equal(agreement.kind, "no_opinion");
  assert.equal(agreement.agree, false);
  assert.equal(decide(agreement, sandbox, fixture).call, "block");
});

test("unavailable evidence takes precedence over fixture provenance", () => {
  const sandbox = report(["test_inconclusive"]);
  const fixture: CodeRabbitReview = {
    verdict: "approve",
    findings: [],
    source: "fixture",
  };

  assert.equal(compare(sandbox, fixture).kind, "no_evidence");
});
