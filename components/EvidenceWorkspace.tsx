"use client";

import type {
  AdversarialTest,
  AgreementAnalysis,
  CodeRabbitReview,
  ExtractedClaim,
  SandboxReport,
  SandboxTestResult,
  StageName,
} from "@/lib/types";
import StageList, { type StageState } from "./StageList";
import TestTable from "./TestTable";
import VerdictRail from "./VerdictRail";

type Props = {
  running: boolean;
  claim: ExtractedClaim | null;
  tests: AdversarialTest[];
  results: SandboxTestResult[];
  sandbox: SandboxReport | null;
  review: CodeRabbitReview | null;
  agreement: AgreementAnalysis | null;
  stages: Record<StageName, StageState>;
  timings: Partial<Record<StageName, number>>;
  logs: Array<{ stage: StageName; message: string }>;
};

export default function EvidenceWorkspace({
  running,
  claim,
  tests,
  results,
  sandbox,
  review,
  agreement,
  stages,
  timings,
  logs,
}: Props) {
  return (
    <div className="evidence-workspace">
      <section className="panel">
        <span className="label">The claim</span>
        {claim ? (
          <>
            <p className="claim">{claim.statement}</p>
            <p className="claim-meta">
              Target behaviour: {claim.targetBehavior || "—"}
              {claim.impliedInputs.length > 0 &&
                ` · Implied inputs: ${claim.impliedInputs.join(", ")}`}
              {" · "}confidence {claim.confidence.toFixed(2)}
              {claim.confidence < 0.5 &&
                " (low — the description was vague)"}
            </p>
          </>
        ) : (
          <p className="empty">
            {running
              ? "Reading the pull request…"
              : "Ready. Start the gate to extract a falsifiable claim, or load a recorded run."}
          </p>
        )}
      </section>

      <section className="panel">
        <span className="label">
          Execution evidence vs review opinion
        </span>
        <VerdictRail
          sandbox={sandbox}
          review={review}
          agreement={agreement}
        />
      </section>

      <section className="panel">
        <span className="label">Pipeline</span>
        <StageList states={stages} timings={timings} logs={logs} />
      </section>

      <section className="panel">
        <span className="label">Adversarial execution</span>
        <TestTable tests={tests} results={results} />
        {sandbox?.infraError && (
          <p className="provenance evidence-error">
            Sandbox error: {sandbox.infraError}. No evidence was produced, so
            the gate blocks rather than assuming the claim holds.
          </p>
        )}
      </section>

      <section className="panel">
        <span className="label">CodeRabbit opinion</span>
        {!review ? (
          <p className="empty">No review loaded.</p>
        ) : (
          <>
            <p className="provenance">
              {review.source === "cache"
                ? `Recorded verdict from ${new Date(review.recordedAt).toLocaleString()}.`
                : review.source === "fixture"
                  ? "Staged placeholder—not CodeRabbit output. Authenticate and run the recorder before presenting it as an independent review."
                  : "Live CodeRabbit CLI review, run just now."}
            </p>
            {review.findings.length === 0 ? (
              <p className="empty">No findings.</p>
            ) : (
              review.findings.map((finding, index) => (
                <div
                  className={`finding ${finding.severity}`}
                  key={`${finding.title}-${index}`}
                >
                  <span className="sev">{finding.severity}</span>
                  {finding.file && (
                    <span className="where">
                      {" "}
                      · {finding.file}
                      {finding.line ? `:${finding.line}` : ""}
                    </span>
                  )}
                  <div>{finding.title}</div>
                  {finding.body && <p>{finding.body}</p>}
                </div>
              ))
            )}
          </>
        )}
      </section>
    </div>
  );
}
