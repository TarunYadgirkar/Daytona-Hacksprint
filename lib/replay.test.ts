import assert from "node:assert/strict";
import test from "node:test";
import { parseReplay, serializeReplay } from "./replay";
import type { GateResult } from "./types";

const result: GateResult = {
  runId: "run-1",
  prId: "pr-101",
  startedAt: "2026-07-24T10:00:00.000Z",
  finishedAt: "2026-07-24T10:00:02.000Z",
  claim: {
    statement: "A null cart returns zero.",
    targetBehavior: "Return zero without throwing.",
    impliedInputs: ["null"],
    confidence: 0.95,
  },
  tests: [
    {
      id: "t1",
      name: "Null cart",
      hypothesis: "The guard dereferences null.",
      code: "const target = require('./target.js');",
    },
  ],
  sandbox: {
    sandboxId: "sandbox-1",
    results: [
      {
        testId: "t1",
        testName: "Null cart",
        hypothesis: "The guard dereferences null.",
        before: "fail",
        after: "fail",
        verdict: "claim_broken",
        stdout: "",
        stderr: "",
        durationMs: 10,
      },
    ],
    claimBroken: true,
    totalDurationMs: 10,
  },
  codeRabbit: {
    source: "fixture",
    verdict: "approve",
    findings: [],
  },
  agreement: {
    agree: false,
    kind: "evidence_only",
    summary: "Execution broke the claim.",
  },
  decision: {
    call: "block",
    rationale: "The claim failed under test.",
    requiresHuman: true,
  },
};

test("serializeReplay round-trips a completed gate result", () => {
  const savedAt = "2026-07-24T10:01:00.000Z";
  assert.deepEqual(parseReplay(serializeReplay(result, savedAt)), { savedAt, result });
});

test("parseReplay rejects malformed or incomplete state", () => {
  assert.equal(parseReplay(null), null);
  assert.equal(parseReplay("not json"), null);
  assert.equal(parseReplay(JSON.stringify({ version: 1, result: { runId: "partial" } })), null);
});
