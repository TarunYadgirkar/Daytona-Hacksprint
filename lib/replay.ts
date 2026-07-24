import { z } from "zod";
import type { GateResult } from "./types";

export const REPLAY_STORAGE_KEY = "safeship:last-completed-run:v1";

const testSchema = z.object({
  id: z.string(),
  name: z.string(),
  hypothesis: z.string(),
  code: z.string(),
});

const sandboxResultSchema = z.object({
  testId: z.string(),
  testName: z.string(),
  hypothesis: z.string(),
  before: z.enum(["pass", "fail", "error"]),
  after: z.enum(["pass", "fail", "error"]),
  verdict: z.enum(["claim_upheld", "claim_broken", "test_inconclusive", "test_errored"]),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number(),
});

const reviewBase = {
  verdict: z.enum(["approve", "concerns", "block"]),
  findings: z.array(
    z.object({
      severity: z.enum(["critical", "major", "minor", "info"]),
      file: z.string().optional(),
      line: z.number().optional(),
      title: z.string(),
      body: z.string().optional(),
    }),
  ),
  raw: z.string().optional(),
};

const gateResultSchema: z.ZodType<GateResult> = z.object({
  runId: z.string(),
  prId: z.string(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  claim: z.object({
    statement: z.string(),
    targetBehavior: z.string(),
    impliedInputs: z.array(z.string()),
    confidence: z.number().min(0).max(1),
  }),
  tests: z.array(testSchema),
  sandbox: z.object({
    sandboxId: z.string().nullable(),
    results: z.array(sandboxResultSchema),
    claimBroken: z.boolean(),
    totalDurationMs: z.number().nonnegative(),
    infraError: z.string().optional(),
  }),
  codeRabbit: z.discriminatedUnion("source", [
    z.object({
      ...reviewBase,
      source: z.literal("cli"),
      recordedAt: z.string().datetime(),
    }),
    z.object({
      ...reviewBase,
      source: z.literal("cache"),
      recordedAt: z.string().datetime(),
      prDigest: z.string().regex(/^[a-f0-9]{64}$/),
    }),
    z.object({
      ...reviewBase,
      source: z.literal("fixture"),
      recordedAt: z.undefined().optional(),
      prDigest: z.undefined().optional(),
    }),
  ]),
  agreement: z.object({
    agree: z.boolean(),
    kind: z.enum([
      "both_caught",
      "both_clear",
      "evidence_only",
      "opinion_only",
      "no_evidence",
      "no_opinion",
    ]),
    summary: z.string(),
  }),
  decision: z.object({
    call: z.enum(["merge", "block"]),
    rationale: z.string(),
    requiresHuman: z.literal(true),
  }),
});

const savedReplaySchema = z.object({
  version: z.literal(1),
  savedAt: z.string().datetime(),
  result: gateResultSchema,
});

export interface SavedReplay {
  savedAt: string;
  result: GateResult;
}

export function serializeReplay(result: GateResult, savedAt = new Date().toISOString()): string {
  return JSON.stringify({ version: 1, savedAt, result });
}

export function parseReplay(raw: string | null): SavedReplay | null {
  if (!raw) return null;
  try {
    const parsed = savedReplaySchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? { savedAt: parsed.data.savedAt, result: parsed.data.result } : null;
  } catch {
    return null;
  }
}
