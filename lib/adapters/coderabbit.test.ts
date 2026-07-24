import assert from "node:assert/strict";
import test from "node:test";
import { parseAgentOutput } from "./coderabbit";

test("parseAgentOutput rejects a skipped review instead of approving it", () => {
  const output = JSON.stringify({
    type: "review_skipped",
    reason: "rate limit reached",
  });

  assert.throws(() => parseAgentOutput(output), /review skipped: rate limit reached/);
});

test("parseAgentOutput keeps a completed review with no findings as approve", () => {
  const output = JSON.stringify({ type: "review_completed", findings: [] });
  const review = parseAgentOutput(output);

  assert.equal(review.verdict, "approve");
  assert.deepEqual(review.findings, []);
  assert.equal(review.source, "cli");
});

test("parseAgentOutput derives block from a critical finding", () => {
  const output = JSON.stringify({
    type: "review_completed",
    findings: [
      {
        severity: "critical",
        title: "Null input still throws",
        file: "target.js",
        line: 2,
      },
    ],
  });
  const review = parseAgentOutput(output);

  assert.equal(review.verdict, "block");
  assert.equal(review.findings[0]?.title, "Null input still throws");
});
