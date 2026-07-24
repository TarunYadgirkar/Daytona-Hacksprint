import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import type { CodeRabbitReview } from "../types";
import { STAGED_PRS } from "../fixtures/prs";
import {
  digestStagedPR,
  getCodeRabbitReview,
  parseAgentOutput,
  readCodeRabbitCache,
  withStagedCodeRabbitRepository,
} from "./coderabbit";

const pr = STAGED_PRS[0]!;

test("parseAgentOutput rejects a skipped review instead of approving it", () => {
  const output = JSON.stringify({
    type: "review_skipped",
    reason: "rate limit reached",
  });

  assert.throws(() => parseAgentOutput(output), /review skipped: rate limit reached/);
});

test("parseAgentOutput rejects heartbeat-only output", () => {
  const output = JSON.stringify({ type: "heartbeat" });

  assert.throws(() => parseAgentOutput(output), /completed review/);
});

test("parseAgentOutput rejects non-JSON-only output", () => {
  assert.throws(
    () => parseAgentOutput("Review finished without structured output"),
    /completed review/,
  );
});

test("parseAgentOutput rejects an unknown terminal event", () => {
  const output = JSON.stringify({ type: "review_finished", findings: [] });

  assert.throws(() => parseAgentOutput(output), /completed review/);
});

test("parseAgentOutput rejects malformed findings", () => {
  const output = JSON.stringify({
    type: "review_completed",
    findings: [{ severity: "critical" }],
  });

  assert.throws(() => parseAgentOutput(output), /malformed finding/);
});

test("parseAgentOutput rejects findings with an unknown severity", () => {
  const output = JSON.stringify({
    type: "review_completed",
    findings: [{ severity: "moderate", title: "Ambiguous issue" }],
  });

  assert.throws(() => parseAgentOutput(output), /unknown severity/);
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

test("withStagedCodeRabbitRepository stages the selected PR and always cleans up", async () => {
  let stagedDir = "";

  await assert.rejects(
    withStagedCodeRabbitRepository(pr, async (dir) => {
      stagedDir = dir;
      const file = join(dir, "src", pr.entryFile);
      const baseline = execFileSync(
        "git",
        ["show", `HEAD:src/${pr.entryFile}`],
        {
          cwd: dir,
          encoding: "utf8",
        },
      );
      const diff = execFileSync(
        "git",
        ["diff", "--", `src/${pr.entryFile}`],
        {
          cwd: dir,
          encoding: "utf8",
        },
      );

      assert.equal(baseline, pr.before);
      assert.equal(readFileSync(file, "utf8"), pr.after);
      assert.match(diff, /items\.length/);
      throw new Error("force cleanup");
    }),
    /force cleanup/,
  );

  assert.equal(existsSync(stagedDir), false);
});

test("getCodeRabbitReview propagates failures in explicit CLI mode", async () => {
  const previousMode = process.env.CODERABBIT_MODE;
  const previousBin = process.env.CODERABBIT_BIN;
  const previousKey = process.env.CODERABBIT_API_KEY;
  process.env.CODERABBIT_MODE = "cli";
  process.env.CODERABBIT_BIN = "/usr/bin/false";
  process.env.CODERABBIT_API_KEY = "test-only";

  try {
    await assert.rejects(getCodeRabbitReview(pr), /exit 1/);
  } finally {
    if (previousMode === undefined) delete process.env.CODERABBIT_MODE;
    else process.env.CODERABBIT_MODE = previousMode;
    if (previousBin === undefined) delete process.env.CODERABBIT_BIN;
    else process.env.CODERABBIT_BIN = previousBin;
    if (previousKey === undefined) delete process.env.CODERABBIT_API_KEY;
    else process.env.CODERABBIT_API_KEY = previousKey;
  }
});

test("readCodeRabbitCache trusts only a review bound to the staged PR content", () => {
  const cache = {
    [pr.id]: {
      verdict: "approve",
      findings: [],
      source: "cache",
      recordedAt: "2026-07-24T10:00:00.000Z",
      prDigest: digestStagedPR(pr),
    },
  } satisfies Record<string, CodeRabbitReview>;

  assert.equal(readCodeRabbitCache(pr, cache).source, "cache");

  const changedPR = { ...pr, after: `${pr.after}\n// changed` };
  assert.equal(readCodeRabbitCache(changedPR, cache).source, "fixture");
});
