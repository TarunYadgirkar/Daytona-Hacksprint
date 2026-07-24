import { z } from "zod";
import type { GateResult } from "./types";

export const REPLAY_STORAGE_KEY = "safeship:run-library:v2";
export const LEGACY_REPLAY_STORAGE_KEY = "safeship:last-completed-run:v1";

export type RunOrigin = "live" | "recorded_fixture";
export type BraintrustProvenance = "configured" | "not_configured" | "not_run";

export interface RunRecord {
  id: string;
  label: string;
  capturedAt: string;
  origin: RunOrigin;
  provenance: {
    fireworks: RunOrigin;
    daytona: RunOrigin;
    braintrust: BraintrustProvenance;
  };
  result: GateResult;
}

const testSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  hypothesis: z.string().min(1),
  code: z.string().min(1),
});

const sandboxResultSchema = z.object({
  testId: z.string().min(1),
  testName: z.string().min(1),
  hypothesis: z.string().min(1),
  before: z.enum(["pass", "fail", "error"]),
  after: z.enum(["pass", "fail", "error"]),
  verdict: z.enum(["claim_upheld", "claim_broken", "test_inconclusive", "test_errored"]),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number().nonnegative(),
});

const reviewBase = {
  verdict: z.enum(["approve", "concerns", "block"]),
  findings: z.array(
    z.object({
      severity: z.enum(["critical", "major", "minor", "info"]),
      file: z.string().optional(),
      line: z.number().optional(),
      title: z.string().min(1),
      body: z.string().optional(),
    }),
  ),
  raw: z.string().optional(),
};

export const gateResultSchema: z.ZodType<GateResult> = z.object({
  runId: z.string().min(1),
  prId: z.string().min(1),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  claim: z.object({
    statement: z.string().min(1),
    targetBehavior: z.string(),
    impliedInputs: z.array(z.string()),
    confidence: z.number().min(0).max(1),
  }),
  tests: z.array(testSchema).min(1),
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
    summary: z.string().min(1),
  }),
  decision: z.object({
    call: z.enum(["merge", "block"]),
    rationale: z.string().min(1),
    requiresHuman: z.literal(true),
  }),
});

const runRecordSchema: z.ZodType<RunRecord> = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  capturedAt: z.string().datetime(),
  origin: z.enum(["live", "recorded_fixture"]),
  provenance: z.object({
    fireworks: z.enum(["live", "recorded_fixture"]),
    daytona: z.enum(["live", "recorded_fixture"]),
    braintrust: z.enum(["configured", "not_configured", "not_run"]),
  }),
  result: gateResultSchema,
});

const runLibrarySchema = z.object({
  version: z.literal(2),
  runs: z.array(runRecordSchema),
});

const legacyReplaySchema = z.object({
  version: z.literal(1),
  savedAt: z.string().datetime(),
  result: gateResultSchema,
});

export function createRunRecord(
  result: GateResult,
  options: {
    capturedAt?: string;
    label?: string;
    origin: RunOrigin;
    braintrust: BraintrustProvenance;
  },
): RunRecord {
  const capturedAt = options.capturedAt ?? new Date().toISOString();
  return runRecordSchema.parse({
    // A recorded-mode run uses the fixture's original run ID. Include the
    // capture time so the newly streamed copy does not hide the bundled seed
    // when both are present in the gallery.
    id: `${options.origin}:${result.runId}:${capturedAt}`,
    label: options.label ?? result.agreement.kind.replaceAll("_", " "),
    capturedAt,
    origin: options.origin,
    provenance: {
      fireworks: options.origin,
      daytona: options.origin,
      braintrust: options.braintrust,
    },
    result,
  });
}

export function validateRunRecords(input: unknown): RunRecord[] {
  return z.array(runRecordSchema).parse(input);
}

export function serializeRunLibrary(runs: RunRecord[]): string {
  return JSON.stringify(runLibrarySchema.parse({ version: 2, runs }));
}

export function parseRunLibrary(raw: string | null): RunRecord[] {
  if (!raw) return [];
  try {
    const input = JSON.parse(raw) as unknown;
    const current = runLibrarySchema.safeParse(input);
    if (current.success) return current.data.runs;

    const legacy = legacyReplaySchema.safeParse(input);
    if (!legacy.success) return [];
    return [
      createRunRecord(legacy.data.result, {
        capturedAt: legacy.data.savedAt,
        label: "Migrated saved run",
        origin: "live",
        braintrust: "not_configured",
      }),
    ];
  } catch {
    return [];
  }
}

export function mergeRunRecords(
  preferred: RunRecord[],
  fallback: RunRecord[],
  limit = 12,
): RunRecord[] {
  const merged: RunRecord[] = [];
  const seen = new Set<string>();
  for (const record of [...preferred, ...fallback]) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    merged.push(record);
    if (merged.length >= limit) break;
  }
  return merged;
}
