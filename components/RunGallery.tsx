"use client";

import type { RunRecord } from "@/lib/replay";

function originLabel(record: RunRecord): string {
  return record.origin === "live" ? "Live capture" : "Recorded fixture";
}

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
                  <dt>Run ID</dt>
                  <dd>{record.result.runId}</dd>
                </div>
              </dl>
              <button
                type="button"
                className="act ghost"
                disabled={running}
                onClick={() => onLoad(record)}
              >
                Load recorded run
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
