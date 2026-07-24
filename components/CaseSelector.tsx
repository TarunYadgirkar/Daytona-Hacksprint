"use client";

import { useState } from "react";
import type { RunOrigin } from "@/lib/replay";
import type { StagedPR } from "@/lib/types";

type Props = {
  prs: StagedPR[];
  selectedId: string | null;
  running: boolean;
  gateMode: RunOrigin;
  importing: boolean;
  importError: string | null;
  onSelect: (prId: string) => void;
  onRun: (prId: string) => void;
  onImport: (url: string) => Promise<void>;
};

export default function CaseSelector({
  prs,
  selectedId,
  running,
  gateMode,
  importing,
  importError,
  onSelect,
  onRun,
  onImport,
}: Props) {
  const [githubUrl, setGitHubUrl] = useState("");
  const active = prs.find((pr) => pr.id === selectedId);

  return (
    <div className="case-selector">
      <section className="panel case-queue" aria-labelledby="case-queue-title">
        <div className="section-heading">
          <span className="label">Queued cases</span>
          <h2 id="case-queue-title">Agent-authored pull requests</h2>
        </div>
        <div className="case-list">
          {prs.map((pr) => (
            <button
              key={pr.id}
              type="button"
              className="case-card"
              aria-pressed={selectedId === pr.id}
              disabled={running}
              onClick={() => onSelect(pr.id)}
            >
              <span className="case-number">{pr.id}</span>
              <span className="case-title">{pr.title}</span>
              <span className="case-author">{pr.author}</span>
            </button>
          ))}
        </div>
        <form
          className="github-import"
          onSubmit={(event) => {
            event.preventDefault();
            void onImport(githubUrl);
          }}
        >
          <label htmlFor="github-pr-url">Import a public GitHub PR</label>
          <input
            id="github-pr-url"
            type="url"
            value={githubUrl}
            disabled={running || importing}
            placeholder="https://github.com/owner/repo/pull/1"
            onChange={(event) => setGitHubUrl(event.target.value)}
          />
          <button type="submit" disabled={running || importing || !githubUrl.trim()}>
            {importing ? "Importing…" : "Import PR"}
          </button>
          {importError && <p role="alert">{importError}</p>}
        </form>
      </section>

      {active && (
        <section
          className="panel case-preview"
          aria-labelledby="case-preview-title"
        >
          <div className="section-heading">
            <span className="label">Selected evidence target</span>
            <h2 id="case-preview-title">Case file {active.id}</h2>
          </div>
          <p className="case-safety">
            Nothing runs until you start the gate.
          </p>
          {active.sourceUrl && (
            <a href={active.sourceUrl} target="_blank" rel="noreferrer">
              View source PR on GitHub
            </a>
          )}
          <button
            type="button"
            className="act primary"
            disabled={running}
            onClick={() => onRun(active.id)}
          >
            {running ? "Gate running…" : "Run adversarial gate"}
          </button>
          <span className="run-estimate">
            {gateMode === "recorded_fixture"
              ? "Recorded test mode · no sponsor APIs"
              : "Estimated 30–120 seconds · Fireworks plus one Daytona sandbox"}
          </span>
          <details className="case-diff">
            <summary>Diff under test</summary>
            <span className="label diff-label">Before</span>
            <pre className="diff-code">{active.before}</pre>
            <span className="label diff-label">After</span>
            <pre className="diff-code">{active.after}</pre>
          </details>
        </section>
      )}
    </div>
  );
}
