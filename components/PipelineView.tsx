"use client";

/**
 * Live gate view.
 *
 * Holds every piece of state derived from the SSE stream. This component
 * renders verdicts; agreement and decision always arrive pre-computed from
 * lib/pipeline.ts or a validated completed-run fixture.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CopilotSidebar } from "@copilotkit/react-core/v2";
import { formatEvidenceReport } from "@/lib/evidence-report";
import { decodeSSE } from "@/lib/events";
import { RECORDED_RUNS } from "@/lib/fixtures/recorded-runs";
import {
  createRunRecord,
  LEGACY_REPLAY_STORAGE_KEY,
  mergeRunRecords,
  parseRunLibrary,
  REPLAY_STORAGE_KEY,
  serializeRunLibrary,
  type RunOrigin,
  type RunRecord,
} from "@/lib/replay";
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
import CaseSelector from "./CaseSelector";
import CopilotTools, { type GateSnapshot } from "./CopilotTools";
import DecisionPanel from "./DecisionPanel";
import EvidenceWorkspace from "./EvidenceWorkspace";
import RunGallery from "./RunGallery";
import RunStatus, {
  type ConnectionState,
  type RunNotice,
} from "./RunStatus";
import type { StageState } from "./StageList";

const STAGE_TIMEOUT_MS: Record<StageName, number> = {
  claim: 45_000,
  tests: 90_000,
  sandbox: 180_000,
  coderabbit: 30_000,
  compare: 15_000,
  decision: 15_000,
};

const emptyStages = () =>
  Object.fromEntries(STAGE_ORDER.map((stage) => [stage, "pending"])) as Record<
    StageName,
    StageState
  >;

const completedStages = () =>
  Object.fromEntries(STAGE_ORDER.map((stage) => [stage, "done"])) as Record<
    StageName,
    StageState
  >;

export default function PipelineView({
  prs,
  gateMode,
  braintrustConfigured,
}: {
  prs: StagedPR[];
  gateMode: RunOrigin;
  braintrustConfigured: boolean;
}) {
  const [availablePRs, setAvailablePRs] = useState(prs);
  const [selected, setSelected] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [storedRecords, setStoredRecords] = useState<RunRecord[]>([]);
  const [activeRecord, setActiveRecord] = useState<RunRecord | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("idle");
  const [runNotice, setRunNotice] = useState<RunNotice | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [copyNotice, setCopyNotice] = useState<string | null>(null);

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
  const stageTimers = useRef<Partial<Record<StageName, number>>>({});
  const sourceRef = useRef<EventSource | null>(null);

  const galleryRecords = useMemo(
    () => mergeRunRecords(storedRecords, RECORDED_RUNS),
    [storedRecords],
  );

  const clearStageTimer = useCallback((stage: StageName) => {
    const timer = stageTimers.current[stage];
    if (timer !== undefined) window.clearTimeout(timer);
    delete stageTimers.current[stage];
  }, []);

  const clearAllStageTimers = useCallback(() => {
    for (const timer of Object.values(stageTimers.current)) {
      if (timer !== undefined) window.clearTimeout(timer);
    }
    stageTimers.current = {};
  }, []);

  const resetRunState = useCallback(() => {
    clearAllStageTimers();
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
    setActiveRecord(null);
    setRunNotice(null);
    setCopyNotice(null);
    setConnection("idle");
    startedAt.current = {};
  }, [clearAllStageTimers]);

  useEffect(() => {
    try {
      const current = parseRunLibrary(window.localStorage.getItem(REPLAY_STORAGE_KEY));
      const legacy =
        current.length === 0
          ? parseRunLibrary(window.localStorage.getItem(LEGACY_REPLAY_STORAGE_KEY))
          : [];
      setStoredRecords(mergeRunRecords(current, legacy));
    } catch {
      // Storage can be disabled by browser policy; bundled recorded runs remain available.
    }
  }, []);

  useEffect(
    () => () => {
      sourceRef.current?.close();
      clearAllStageTimers();
    },
    [clearAllStageTimers],
  );

  const rememberRecord = useCallback((record: RunRecord) => {
    setStoredRecords((current) => {
      const next = mergeRunRecords([record], current, 8);
      try {
        window.localStorage.setItem(REPLAY_STORAGE_KEY, serializeRunLibrary(next));
      } catch {
        // Keep the completed run in memory if browser storage is unavailable.
      }
      return next;
    });
  }, []);

  const showCompletedResult = useCallback(
    (record: RunRecord) => {
      sourceRef.current?.close();
      clearAllStageTimers();
      setRunning(false);
      setSelected(record.result.prId);
      setRunId(record.result.runId);
      setClaim(record.result.claim);
      setTests(record.result.tests);
      setResults(record.result.sandbox.results);
      setSandbox(record.result.sandbox);
      setReview(record.result.codeRabbit);
      setAgreement(record.result.agreement);
      setDecision(record.result.decision);
      setStages(completedStages());
      setTimings({});
      setLogs([
        {
          stage: "decision",
          message: `Loaded completed run ${record.result.runId}. No sponsor API or sandbox ran again.`,
        },
      ]);
      setActiveRecord(record);
      setConnection("recorded");
      setRunNotice(null);
      setCopyNotice(null);
      setAnnouncement(`Loaded recorded ${record.label} run for ${record.result.prId}.`);
      startedAt.current = {};
    },
    [clearAllStageTimers],
  );

  const selectPR = useCallback(
    (prId: string) => {
      if (running) return;
      sourceRef.current?.close();
      resetRunState();
      setSelected(prId);
      setAnnouncement(`Selected ${prId}. Review the diff, then run the gate when ready.`);
    },
    [resetRunState, running],
  );

  const startRun = useCallback(
    (prId: string) => {
      sourceRef.current?.close();
      resetRunState();
      setSelected(prId);
      setRunning(true);
      setConnection("connecting");
      setAnnouncement(`Connecting to the gate for ${prId}.`);

      let completed = false;
      let lastStageError: { stage: StageName; message: string } | null = null;
      const source = new EventSource(`/api/gate?pr=${encodeURIComponent(prId)}`);
      sourceRef.current = source;

      source.onopen = () => {
        setConnection("connected");
        setAnnouncement("Connected. The gate is running.");
      };

      source.onmessage = (message) => {
        const event = decodeSSE(message.data);
        if (!event) {
          setRunNotice({
            severity: "error",
            title: "Invalid pipeline event",
            message: "The server sent an event the UI could not read. Retry or load a recorded run.",
          });
          return;
        }

        switch (event.type) {
          case "run_start":
            setRunId(event.runId);
            break;
          case "stage_start": {
            startedAt.current[event.stage] = Date.now();
            setStages((current) => ({ ...current, [event.stage]: "running" }));
            setAnnouncement(`${event.stage} stage started.`);
            clearStageTimer(event.stage);
            const timeout =
              gateMode === "recorded_fixture" ? 2_000 : STAGE_TIMEOUT_MS[event.stage];
            stageTimers.current[event.stage] = window.setTimeout(() => {
              const seconds = Math.round(timeout / 1000);
              const timeoutMessage = `${event.stage} has taken more than ${seconds} seconds. The connection is still open; this usually means an external service is slow.`;
              setRunNotice({
                severity: "warning",
                title: `${event.stage} is taking longer than expected`,
                message: timeoutMessage,
              });
              setLogs((current) => [
                ...current,
                { stage: event.stage, message: `Warning: ${timeoutMessage}` },
              ]);
              setAnnouncement(timeoutMessage);
            }, timeout);
            break;
          }
          case "stage_done":
            clearStageTimer(event.stage);
            setStages((current) => ({
              ...current,
              [event.stage]: current[event.stage] === "error" ? "error" : "done",
            }));
            setTimings((current) => ({
              ...current,
              [event.stage]:
                Date.now() - (startedAt.current[event.stage] ?? Date.now()),
            }));
            setAnnouncement(`${event.stage} stage completed.`);
            break;
          case "stage_error":
            clearStageTimer(event.stage);
            lastStageError = { stage: event.stage, message: event.message };
            setStages((current) => ({ ...current, [event.stage]: "error" }));
            setLogs((current) => [
              ...current,
              { stage: event.stage, message: `Error: ${event.message}` },
            ]);
            setRunNotice({
              severity: "error",
              title: `${event.stage} could not complete`,
              message: event.message,
            });
            setAnnouncement(`${event.stage} failed: ${event.message}`);
            break;
          case "log":
            setLogs((current) => [
              ...current,
              { stage: event.stage, message: event.message },
            ]);
            break;
          case "claim_ready":
            setClaim(event.claim);
            break;
          case "test_generated":
            setTests((current) => [...current, event.test]);
            break;
          case "test_result":
            setResults((current) => [...current, event.result]);
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
          case "run_complete": {
            completed = true;
            clearAllStageTimers();
            const record = createRunRecord(event.result, {
              origin: gateMode,
              braintrust:
                gateMode === "recorded_fixture"
                  ? "not_run"
                  : braintrustConfigured
                    ? "configured"
                    : "not_configured",
            });
            rememberRecord(record);
            setActiveRecord(record);
            setRunning(false);
            setConnection("complete");
            setRunNotice(
              event.result.sandbox.infraError
                ? {
                    severity: "error",
                    title: "Sandbox evidence unavailable",
                    message: event.result.sandbox.infraError,
                  }
                : null,
            );
            setAnnouncement(
              `Gate complete. Recommendation: ${event.result.decision.call}. Human decision required.`,
            );
            source.close();
            break;
          }
        }
      };

      source.onerror = () => {
        if (completed) return;
        clearAllStageTimers();
        setRunning(false);
        setConnection("disconnected");
        setStages((current) =>
          Object.fromEntries(
            Object.entries(current).map(([stage, state]) => [
              stage,
              state === "running" ? "error" : state,
            ]),
          ) as Record<StageName, StageState>,
        );
        const notice: RunNotice = lastStageError
          ? {
              severity: "error",
              title: `Run stopped during ${lastStageError.stage}`,
              message: lastStageError.message,
            }
          : {
              severity: "error",
              title: "Pipeline connection closed",
              message:
                "The live event stream disconnected before a completed result arrived. The request may have been rejected, rate-limited, or interrupted.",
            };
        setRunNotice(notice);
        setAnnouncement(`${notice.title}. ${notice.message}`);
        source.close();
      };
    },
    [
      braintrustConfigured,
      clearAllStageTimers,
      clearStageTimer,
      gateMode,
      rememberRecord,
      resetRunState,
    ],
  );

  const importPR = useCallback(
    async (url: string) => {
      if (running || importing) return;
      setImporting(true);
      setImportError(null);
      try {
        const response = await fetch(
          `/api/github-pr?url=${encodeURIComponent(url)}`,
          { cache: "no-store" },
        );
        const body = (await response.json()) as StagedPR & { error?: unknown };
        if (!response.ok) {
          throw new Error(
            typeof body.error === "string"
              ? body.error
              : `GitHub import failed with status ${response.status}`,
          );
        }
        setAvailablePRs((current) => [
          body,
          ...current.filter((candidate) => candidate.id !== body.id),
        ]);
        selectPR(body.id);
        setAnnouncement(`Imported ${body.id}. Review the diff, then run the gate.`);
      } catch (error) {
        setImportError(
          error instanceof Error ? error.message : "Could not import this GitHub PR",
        );
      } finally {
        setImporting(false);
      }
    },
    [importing, running, selectPR],
  );

  const retryRun = useCallback(() => {
    if (selected && !running) startRun(selected);
  }, [running, selected, startRun]);

  const loadRecordedForSelection = useCallback(() => {
    const record =
      galleryRecords.find((candidate) => candidate.result.prId === selected) ??
      galleryRecords[0];
    if (record) showCompletedResult(record);
  }, [galleryRecords, selected, showCompletedResult]);

  const snapshot = useMemo<() => GateSnapshot>(
    () => () => ({
      runId,
      prId: selected,
      claim: claim?.statement ?? null,
      tests: tests.map((test) => ({
        id: test.id,
        name: test.name,
        hypothesis: test.hypothesis,
      })),
      results: results.map((result) => ({
        testId: result.testId,
        before: result.before,
        after: result.after,
        verdict: result.verdict,
      })),
      codeRabbit: review
        ? {
            verdict: review.verdict,
            source: review.source,
            findings: review.findings.map(
              (finding) => `${finding.severity}: ${finding.title}`,
            ),
          }
        : null,
      agreement: agreement
        ? {
            agree: agreement.agree,
            kind: agreement.kind,
            summary: agreement.summary,
          }
        : null,
      decision: decision
        ? { call: decision.call, rationale: decision.rationale }
        : null,
    }),
    [agreement, claim, decision, results, review, runId, selected, tests],
  );

  const submitOverride = useCallback(
    async (call: GateCall, reason: string) => {
      if (!runId) throw new Error("No completed gate run is selected");
      const response = await fetch("/api/override", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId, call, reason }),
      });

      if (!response.ok) {
        let message = `Override request failed with status ${response.status}`;
        try {
          const body = (await response.json()) as { error?: unknown };
          if (typeof body.error === "string") message = body.error;
        } catch {
          // The status remains actionable if the server did not return JSON.
        }
        throw new Error(message);
      }
    },
    [runId],
  );

  async function copyText(text: string, successMessage: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice(successMessage);
    } catch {
      setCopyNotice("Clipboard access failed. Select and copy the text manually.");
    }
  }

  const report =
    runId && claim && review && agreement && decision
      ? formatEvidenceReport({
          runId,
          claim,
          tests,
          results,
          review,
          agreement,
          decision,
        })
      : null;

  const displayedOrigin =
    activeRecord?.origin ?? (running ? gateMode : null);
  const displayedBraintrust =
    activeRecord?.provenance.braintrust ??
    (running
      ? gateMode === "recorded_fixture"
        ? "not_run"
        : braintrustConfigured
          ? "configured"
          : "not_configured"
      : null);

  return (
    <>
      <CopilotTools getSnapshot={snapshot} onOverride={submitOverride} />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      <div className="shell">
        <aside>
          <CaseSelector
            prs={availablePRs}
            selectedId={selected}
            running={running}
            gateMode={gateMode}
            importing={importing}
            importError={importError}
            onSelect={selectPR}
            onRun={startRun}
            onImport={importPR}
          />

          <RunGallery
            records={galleryRecords}
            running={running}
            activeId={activeRecord?.id ?? null}
            onLoad={showCompletedResult}
          />
        </aside>

        <main>
          {!selected && (
            <section className="panel">
              <p className="empty">
                Select a pull request to inspect its diff. Nothing runs until you press “Run
                adversarial gate.”
              </p>
            </section>
          )}

          {selected && (
            <>
              <RunStatus
                connection={connection}
                runId={runId}
                running={running}
                notice={runNotice}
                activeRecord={activeRecord}
                origin={displayedOrigin}
                braintrust={displayedBraintrust}
                review={review}
                onCopyRunId={() => {
                  if (runId) void copyText(runId, "Run ID copied.");
                }}
                onRetry={retryRun}
                onLoadRecorded={loadRecordedForSelection}
              />

              <EvidenceWorkspace
                running={running}
                claim={claim}
                tests={tests}
                results={results}
                sandbox={sandbox}
                review={review}
                agreement={agreement}
                stages={stages}
                timings={timings}
                logs={logs}
              />

              {decision && runId && (
                <DecisionPanel
                  runId={runId}
                  decision={decision}
                  report={report}
                  copyNotice={copyNotice}
                  onCopyReport={() => {
                    if (report) {
                      void copyText(report, "Evidence report copied.");
                    }
                  }}
                  onOverride={submitOverride}
                />
              )}
            </>
          )}
        </main>
      </div>

      <CopilotSidebar defaultOpen={false} />
    </>
  );
}
