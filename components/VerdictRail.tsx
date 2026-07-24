"use client";

/**
 * The signature element.
 *
 * Two halves: what running the code proved, and what reading the code
 * suggested. They sit flush against each other when they agree. When they
 * disagree the rail physically splits at a blue seam, and the explanation
 * lives in the gap. The split is the product.
 */

import type { AgreementAnalysis, CodeRabbitReview, SandboxReport } from "@/lib/types";

const KIND_LABEL: Record<AgreementAnalysis["kind"], string> = {
  both_caught: "Agreement — both caught it",
  both_clear: "Agreement — both clear",
  evidence_only: "Disagreement — evidence only",
  opinion_only: "Disagreement — opinion only",
  no_evidence: "No comparison — evidence unavailable",
  no_opinion: "No comparison — opinion unavailable",
};

export default function VerdictRail({
  sandbox,
  review,
  agreement,
}: {
  sandbox: SandboxReport | null;
  review: CodeRabbitReview | null;
  agreement: AgreementAnalysis | null;
}) {
  const evidenceState =
    !sandbox || !agreement
      ? "idle"
      : agreement.kind === "no_evidence"
        ? "unavailable"
        : sandbox.claimBroken
          ? "bad"
          : "ok";
  const opinionState =
    !review
      ? "idle"
      : review.source === "fixture"
        ? "unavailable"
        : review.verdict === "block"
          ? "bad"
          : "ok";
  const split = agreement ? !agreement.agree : false;

  const brokenCount = sandbox?.results.filter((r) => r.verdict === "claim_broken").length ?? 0;
  const criticalCount = review?.findings.filter((f) => f.severity === "critical").length ?? 0;

  return (
    <div className={`rail${split ? " split" : ""}`}>
      <div className="rail-track">
        <div className={`rail-half ${evidenceState}`}>
          <small>Execution evidence</small>
          <span>
            {!sandbox
              ? "not run"
              : !agreement
                ? "evaluating"
                : agreement.kind === "no_evidence"
                  ? "unavailable"
                : sandbox.claimBroken
                  ? `claim broken by ${brokenCount} ${brokenCount === 1 ? "test" : "tests"}`
                  : "claim held"}
          </span>
        </div>

        <div className="rail-seam" aria-hidden="true" />

        <div className={`rail-half right ${opinionState}`}>
          <small>CodeRabbit opinion</small>
          <span className="rail-source">
            {review?.source === "fixture"
              ? "Fixture placeholder"
              : review?.source ?? "Not loaded"}
          </span>
          <span>
            {!review
              ? "not run"
              : agreement?.kind === "no_opinion"
                ? "opinion unavailable"
                : review.verdict === "block"
                  ? `${criticalCount} critical`
                  : review.verdict === "concerns"
                    ? "concerns raised"
                    : "approved"}
          </span>
        </div>
      </div>

      {agreement && (
        <div className="rail-caption">
          <span className="rail-kind">{KIND_LABEL[agreement.kind]}</span>
          {agreement.summary}
        </div>
      )}
    </div>
  );
}
