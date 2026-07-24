import type { EventSink } from "./events";
import type { RunRecord } from "./replay";
import type { StageName } from "./types";

const now = () => new Date().toISOString();

async function pause(): Promise<void> {
  const delay = Number(process.env.POPPER_RECORDED_DELAY_MS ?? "20");
  if (!Number.isFinite(delay) || delay <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 1000)));
}

async function stage(
  name: StageName,
  emit: EventSink,
  body: () => void,
): Promise<void> {
  emit({ type: "stage_start", stage: name, at: now() });
  await pause();
  body();
  emit({ type: "stage_done", stage: name, at: now() });
}

export async function streamRecordedRun(
  record: RunRecord,
  emit: EventSink,
): Promise<void> {
  const { result } = record;
  emit({
    type: "run_start",
    runId: result.runId,
    prId: result.prId,
    at: result.startedAt,
  });
  emit({
    type: "log",
    stage: "claim",
    message: "Recorded fixture mode: no sponsor API is being called.",
  });

  await stage("claim", emit, () => emit({ type: "claim_ready", claim: result.claim }));
  await stage("tests", emit, () => {
    for (const test of result.tests) emit({ type: "test_generated", test });
  });
  await stage("sandbox", emit, () => {
    for (const testResult of result.sandbox.results) {
      emit({ type: "test_result", result: testResult });
    }
    emit({ type: "sandbox_ready", report: result.sandbox });
  });
  await stage("coderabbit", emit, () =>
    emit({ type: "coderabbit_ready", review: result.codeRabbit }),
  );
  await stage("compare", emit, () =>
    emit({ type: "agreement_ready", agreement: result.agreement }),
  );
  await stage("decision", emit, () =>
    emit({ type: "decision_ready", decision: result.decision }),
  );
  emit({ type: "run_complete", result });
}
