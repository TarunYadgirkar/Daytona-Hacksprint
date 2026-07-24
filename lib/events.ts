/**
 * The SSE contract between /api/gate and the UI.
 *
 * Rule: the pipeline emits, the UI renders. The UI never computes a verdict.
 * If you find yourself deriving a decision in a component, move it into
 * lib/pipeline.ts so Braintrust logs the same thing the audience sees.
 */

import type {
  AdversarialTest,
  AgreementAnalysis,
  CodeRabbitReview,
  ExtractedClaim,
  GateDecision,
  GateResult,
  SandboxReport,
  SandboxTestResult,
  StageName,
} from "./types";

export type GateEvent =
  | { type: "run_start"; runId: string; prId: string; at: string }
  | { type: "stage_start"; stage: StageName; at: string }
  | { type: "log"; stage: StageName; message: string }
  | { type: "claim_ready"; claim: ExtractedClaim }
  | { type: "test_generated"; test: AdversarialTest }
  | { type: "test_result"; result: SandboxTestResult }
  | { type: "sandbox_ready"; report: SandboxReport }
  | { type: "coderabbit_ready"; review: CodeRabbitReview }
  | { type: "agreement_ready"; agreement: AgreementAnalysis }
  | { type: "decision_ready"; decision: GateDecision }
  | { type: "stage_done"; stage: StageName; at: string }
  | { type: "stage_error"; stage: StageName; message: string }
  | { type: "run_complete"; result: GateResult };

export type EventSink = (event: GateEvent) => void;

/** Encode one event as an SSE frame. */
export function encodeSSE(event: GateEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Parse one SSE payload back into an event. Returns null on malformed input. */
export function decodeSSE(data: string): GateEvent | null {
  try {
    return JSON.parse(data) as GateEvent;
  } catch {
    return null;
  }
}
