import assert from "node:assert/strict";
import test from "node:test";
import {
  createRunRecord,
  mergeRunRecords,
  parseRunLibrary,
  serializeRunLibrary,
} from "./replay";
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

test("run library round-trips a validated completed gate result", () => {
  const savedAt = "2026-07-24T10:01:00.000Z";
  const record = createRunRecord(result, {
    capturedAt: savedAt,
    label: "Evidence only",
    origin: "live",
    braintrust: "configured",
  });
  assert.deepEqual(parseRunLibrary(serializeRunLibrary([record])), [record]);
});

test("parseRunLibrary rejects malformed or incomplete state", () => {
  assert.deepEqual(parseRunLibrary(null), []);
  assert.deepEqual(parseRunLibrary("not json"), []);
  assert.deepEqual(
    parseRunLibrary(JSON.stringify({ version: 2, runs: [{ id: "partial" }] })),
    [],
  );
});

test("parseRunLibrary migrates the version-one last-run snapshot", () => {
  const savedAt = "2026-07-24T10:01:00.000Z";
  const [record] = parseRunLibrary(
    JSON.stringify({ version: 1, savedAt, result }),
  );

  assert.equal(record?.capturedAt, savedAt);
  assert.equal(record?.result.runId, result.runId);
  assert.equal(record?.origin, "live");
});

test("mergeRunRecords prefers the newest copy and removes duplicate ids", () => {
  const record = createRunRecord(result, {
    origin: "live",
    braintrust: "configured",
  });
  assert.deepEqual(mergeRunRecords([record], [record]), [record]);
});
