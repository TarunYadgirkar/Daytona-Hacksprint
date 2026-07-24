"use client";

import type { RunRecord } from "@/lib/replay";

function originLabel(record: RunRecord): string {
  return record.origin === "live" ? "Live capture" : "Recorded fixture";
}

const COMPARISON_LABEL: Record<
  RunRecord["result"]["agreement"]["kind"],
  string
> = {
  both_caught: "Both methods caught it",
  both_clear: "Both methods clear",
  evidence_only: "Evidence caught it",
  opinion_only: "Opinion caught it",
  no_evidence: "Evidence unavailable",
  no_opinion: "Opinion unavailable",
};

export default function RunGallery({
  records,
  running,
  activeId,
  onLoad,
}: {
  records: RunRecord[];
  running: boolean;
  activeId: string | null;
  onLoad: (record: RunRecord) => void;
}) {
  return (
    <section className="panel">
      <span className="label">Recorded-runs gallery</span>
      <p className="gallery-intro">
        Explore deterministic completed runs without calling Fireworks or Daytona.
      </p>
      <div className="run-gallery">
        {records.map((record) => {
          const evidenceAvailable = record.result.agreement.kind !== "no_evidence";
          return (
            <article
              className={`run-card${activeId === record.id ? " active" : ""}`}
              key={record.id}
            >
              <div className="run-card-head">
                <strong>{record.label}</strong>
                <span className={`origin-badge ${record.origin}`}>{originLabel(record)}</span>
              </div>
              <span>{record.result.prId}</span>
              <dl>
                <div>
                  <dt>Captured</dt>
                  <dd>{new Date(record.capturedAt).toLocaleString()}</dd>
                </div>
                <div>
                  <dt>CodeRabbit</dt>
                  <dd>{record.result.codeRabbit.source}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>{evidenceAvailable ? "available" : "unavailable"}</dd>
                </div>
                <div>
                  <dt>Comparison</dt>
                  <dd>{COMPARISON_LABEL[record.result.agreement.kind]}</dd>
                </div>
                <div>
                  <dt>Run ID</dt>
                  <dd>{record.result.runId}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="act ghost"
                onClick={() => onLoad(record)}
              >
                {running ? "Abort live run and load" : "Load recorded run"}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
