"use client";

import type {
  BraintrustProvenance,
  RunOrigin,
  RunRecord,
} from "@/lib/replay";
import type { CodeRabbitReview } from "@/lib/types";

export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "complete"
  | "disconnected"
  | "recorded";

export interface RunNotice {
  severity: "warning" | "error";
  title: string;
  message: string;
}

type Props = {
  connection: ConnectionState;
  runId: string | null;
  running: boolean;
  notice: RunNotice | null;
  activeRecord: RunRecord | null;
  origin: RunOrigin | null;
  braintrust: BraintrustProvenance | null;
  review: CodeRabbitReview | null;
  onCopyRunId: () => void;
  onRetry: () => void;
  onLoadRecorded: () => void;
};

function executionProvenance(origin: RunOrigin | null): string {
  if (origin === "live") return "live call";
  if (origin === "recorded_fixture") return "recorded fixture";
  return "not run";
}

function reviewProvenance(review: CodeRabbitReview | null): string {
  if (!review) return "not loaded";
  if (review.source === "cache") return "recorded cache";
  if (review.source === "cli") return "live CLI";
  return "fixture placeholder";
}

function braintrustProvenance(
  value: BraintrustProvenance | null,
): string {
  if (value === "configured") return "logging configured";
  if (value === "not_configured") return "not configured";
  return "not run";
}

export default function RunStatus({
  connection,
  runId,
  running,
  notice,
  activeRecord,
  origin,
  braintrust,
  review,
  onCopyRunId,
  onRetry,
  onLoadRecorded,
}: Props) {
  return (
    <>
      <section className="run-status panel" aria-label="Run status">
        <div>
          <span className="label">Run status</span>
          <strong className={`connection ${connection}`}>{connection}</strong>
        </div>
        <div className="provenance-grid">
          <span>Fireworks: {executionProvenance(origin)}</span>
          <span>Daytona: {executionProvenance(origin)}</span>
          <span>CodeRabbit: {reviewProvenance(review)}</span>
          <span>Braintrust: {braintrustProvenance(braintrust)}</span>
        </div>
        {runId && (
          <div className="run-id">
            <span title={runId}>Run ID: {runId}</span>
            <button
              type="button"
              className="text-button"
              onClick={onCopyRunId}
            >
              Copy run ID
            </button>
          </div>
        )}
      </section>

      {activeRecord && connection === "recorded" && (
        <div className="replay-banner" role="status">
          Loaded{" "}
          {activeRecord.origin === "live"
            ? "a saved live run"
            : "a recorded fixture"}{" "}
          captured {new Date(activeRecord.capturedAt).toLocaleString()}. No
          model, sandbox, review command, or Braintrust write ran again.
        </div>
      )}

      {notice && (
        <section className={`run-alert ${notice.severity}`} role="alert">
          <strong>{notice.title}</strong>
          <p>{notice.message}</p>
          <div className="run-alert-actions">
            <button
              type="button"
              className="act"
              onClick={onRetry}
              disabled={running}
            >
              Retry run
            </button>
            <button
              type="button"
              className="act ghost"
              onClick={onLoadRecorded}
            >
              {running ? "Abort and load recorded run" : "Load recorded run"}
            </button>
          </div>
        </section>
      )}
    </>
  );
}
