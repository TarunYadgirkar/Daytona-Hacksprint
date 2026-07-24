"use client";

/**
 * Live gate view.
 *
 * Holds every piece of state derived from the SSE stream. This component
 * RENDERS verdicts, it never COMPUTES them: agreement and decision arrive
 * pre-computed from lib/pipeline.ts so the screen and the Braintrust trace
 * can never tell different stories.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { CopilotSidebar } from "@copilotkit/react-core/v2";
import { decodeSSE } from "@/lib/events";
import type {
  AdversarialTest,
  AgreementAnalysis,
  CodeRabbitReview,
  ExtractedClaim,
  GateCall,
  GateDecision,
  SandboxReport,
  SandboxTestResult,
  StageName,
  StagedPR,
} from "@/lib/types";
import { STAGE_ORDER } from "@/lib/types";
import StageList, { type StageState } from "./StageList";
import TestTable from "./TestTable";
import VerdictRail from "./VerdictRail";
import OverrideBar from "./OverrideBar";
import CopilotTools, { type GateSnapshot } from "./CopilotTools";

const emptyStages = () =>
  Object.fromEntries(STAGE_ORDER.map((s) => [s, "pending"])) as Record<StageName, StageState>;

export default function PipelineView({ prs }: { prs: StagedPR[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const [runId, setRunId] = useState<string | null>(null);
  const [claim, setClaim] = useState<ExtractedClaim | null>(null);
  const [tests, setTests] = useState<AdversarialTest[]>([]);
  const [results, setResults] = useState<SandboxTestResult[]>([]);
  const [sandbox, setSandbox] = useState<SandboxReport | null>(null);
  const [review, setReview] = useState<CodeRabbitReview | null>(null);
  const [agreement, setAgreement] = useState<AgreementAnalysis | null>(null);
  const [decision, setDecision] = useState<GateDecision | null>(null);

  const [stages, setStages] = useState<Record<StageName, StageState>>(emptyStages);
  const [timings, setTimings] = useState<Partial<Record<StageName, number>>>({});
  const [logs, setLogs] = useState<Array<{ stage: StageName; message: string }>>([]);

  const startedAt = useRef<Partial<Record<StageName, number>>>({});
  const sourceRef = useRef<EventSource | null>(null);

  const reset = () => {
    setRunId(null);
    setClaim(null);
    setTests([]);
    setResults([]);
    setSandbox(null);
    setReview(null);
    setAgreement(null);
    setDecision(null);
    setStages(emptyStages());
    setTimings({});
    setLogs([]);
    startedAt.current = {};
  };

  const run = useCallback((prId: string) => {
    sourceRef.current?.close();
    reset();
    setSelected(prId);
    setRunning(true);

    const source = new EventSource(`/api/gate?pr=${encodeURIComponent(prId)}`);
    sourceRef.current = source;

    source.onmessage = (message) => {
      const event = decodeSSE(message.data);
      if (!event) return;

      switch (event.type) {
        case "run_start":
          setRunId(event.runId);
          break;
        case "stage_start":
          startedAt.current[event.stage] = Date.now();
          setStages((s) => ({ ...s, [event.stage]: "running" }));
          break;
        case "stage_done":
          setStages((s) => ({ ...s, [event.stage]: s[event.stage] === "error" ? "error" : "done" }));
          setTimings((t) => ({
            ...t,
            [event.stage]: Date.now() - (startedAt.current[event.stage] ?? Date.now()),
          }));
          break;
        case "stage_error":
          setStages((s) => ({ ...s, [event.stage]: "error" }));
          setLogs((l) => [...l, { stage: event.stage, message: `Error: ${event.message}` }]);
          break;
        case "log":
          setLogs((l) => [...l, { stage: event.stage, message: event.message }]);
          break;
        case "claim_ready":
          setClaim(event.claim);
          break;
        case "test_generated":
          setTests((t) => [...t, event.test]);
          break;
        case "test_result":
          setResults((r) => [...r, event.result]);
          break;
        case "sandbox_ready":
          setSandbox(event.report);
          break;
        case "coderabbit_ready":
          setReview(event.review);
          break;
        case "agreement_ready":
          setAgreement(event.agreement);
          break;
        case "decision_ready":
          setDecision(event.decision);
          break;
        case "run_complete":
          setRunning(false);
          source.close();
          break;
      }
    };

    source.onerror = () => {
      setRunning(false);
      source.close();
    };
  }, []);

  const snapshot = useMemo<() => GateSnapshot>(
    () => () => ({
      runId,
      prId: selected,
      claim: claim?.statement ?? null,
      tests: tests.map((t) => ({ id: t.id, name: t.name, hypothesis: t.hypothesis })),
      results: results.map((r) => ({
        testId: r.testId,
        before: r.before,
        after: r.after,
        verdict: r.verdict,
      })),
      codeRabbit: review
        ? {
            verdict: review.verdict,
            source: review.source,
            findings: review.findings.map((f) => `${f.severity}: ${f.title}`),
          }
        : null,
      agreement: agreement
        ? { agree: agreement.agree, kind: agreement.kind, summary: agreement.summary }
        : null,
      decision: decision ? { call: decision.call, rationale: decision.rationale } : null,
    }),
    [runId, selected, claim, tests, results, review, agreement, decision],
  );

  const submitOverride = useCallback(
    async (call: GateCall, reason: string) => {
      if (!runId) return;
      await fetch("/api/override", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId, call, reason }),
      });
    },
    [runId],
  );

  const activePR = prs.find((p) => p.id === selected);

  return (
    <>
      <CopilotTools getSnapshot={snapshot} onOverride={submitOverride} />

      <div className="shell">
        <aside>
          <section className="panel">
            <span className="label">Queued PRs · agent-authored</span>
            {prs.map((pr) => (
              <button
                key={pr.id}
                className="pr-card"
                aria-pressed={selected === pr.id}
                disabled={running}
                onClick={() => run(pr.id)}
              >
                <span className="id">{pr.id} · {pr.author}</span>
                <span className="title">{pr.title}</span>
              </button>
            ))}
            {running && <p className="empty">Gate running. Buttons unlock when it finishes.</p>}
          </section>

          {activePR && (
            <section className="panel">
              <span className="label">Diff under test</span>
              <span className="label" style={{ letterSpacing: "0.1em" }}>before</span>
              <pre style={{ fontSize: 11, overflowX: "auto", margin: "4px 0 12px" }}>{activePR.before}</pre>
              <span className="label" style={{ letterSpacing: "0.1em" }}>after</span>
              <pre style={{ fontSize: 11, overflowX: "auto", margin: "4px 0 0" }}>{activePR.after}</pre>
            </section>
          )}
        </aside>

        <main>
          {!selected && (
            <section className="panel">
              <p className="empty">Pick a pull request to run the gate against it.</p>
            </section>
          )}

          {selected && (
            <>
              <section className="panel">
                <span className="label">The claim this PR is making</span>
                {claim ? (
                  <>
                    <p className="claim">{claim.statement}</p>
                    <p className="claim-meta">
                      Target behaviour: {claim.targetBehavior || "—"}
                      {claim.impliedInputs.length > 0 && ` · Implied inputs: ${claim.impliedInputs.join(", ")}`}
                      {" · "}confidence {claim.confidence.toFixed(2)}
                      {claim.confidence < 0.5 && " (low — the description was vague)"}
                    </p>
                  </>
                ) : (
                  <p className="empty">Reading the pull request…</p>
                )}
              </section>

              <section className="panel">
                <span className="label">Evidence vs opinion</span>
                <VerdictRail sandbox={sandbox} review={review} agreement={agreement} />
              </section>

              <section className="panel">
                <span className="label">Pipeline</span>
                <StageList states={stages} timings={timings} logs={logs} />
              </section>

              <section className="panel">
                <span className="label">Adversarial tests · run against both revisions</span>
                <TestTable tests={tests} results={results} />
                {sandbox?.infraError && (
                  <p className="provenance" style={{ marginTop: 12 }}>
                    Sandbox error: {sandbox.infraError}. No evidence was produced, so the gate blocks
                    rather than assuming the claim holds.
                  </p>
                )}
              </section>

              {review && (
                <section className="panel">
                  <span className="label">CodeRabbit · independent static review</span>
                  <p className="provenance">
                    {review.source === "cache"
                      ? `Recorded verdict${review.recordedAt ? ` from ${new Date(review.recordedAt).toLocaleString()}` : " (placeholder — not yet recorded)"}. CodeRabbit reviews take minutes, so they are captured ahead of time.`
                      : "Live CodeRabbit CLI review, run just now."}
                  </p>
                  {review.findings.length === 0 ? (
                    <p className="empty">No findings.</p>
                  ) : (
                    review.findings.map((f, i) => (
                      <div className={`finding ${f.severity}`} key={i}>
                        <span className="sev">{f.severity}</span>
                        {f.file && <span className="where"> · {f.file}{f.line ? `:${f.line}` : ""}</span>}
                        <div>{f.title}</div>
                        {f.body && <p>{f.body}</p>}
                      </div>
                    ))
                  )}
                </section>
              )}

              {decision && runId && (
                <section className="panel">
                  <OverrideBar runId={runId} decision={decision} />
                </section>
              )}
            </>
          )}
        </main>
      </div>

      <CopilotSidebar />
    </>
  );
}
