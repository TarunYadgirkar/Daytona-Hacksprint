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
