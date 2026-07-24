import type {
  AdversarialTest,
  AgreementAnalysis,
  CodeRabbitReview,
  ExtractedClaim,
  GateDecision,
  SandboxTestResult,
} from "./types";

interface EvidenceReportInput {
  runId: string;
  claim: ExtractedClaim;
  tests: AdversarialTest[];
  results: SandboxTestResult[];
  review: CodeRabbitReview;
  agreement: AgreementAnalysis;
  decision: GateDecision;
}

export function formatEvidenceReport(input: EvidenceReportInput): string {
  const resultById = new Map(
    input.results.map((result) => [result.testId, result]),
  );
  return [
    `Popper evidence report`,
    `Run: ${input.runId}`,
    `Claim: ${input.claim.statement}`,
    "",
    "Adversarial execution:",
    ...input.tests.map((test) => {
      const result = resultById.get(test.id);
      return result
        ? `- ${test.name}: before=${result.before}, after=${result.after}, verdict=${result.verdict}`
        : `- ${test.name}: no execution result`;
    }),
    "",
    `CodeRabbit: ${input.review.verdict} (${input.review.source})`,
    `Comparison: ${input.agreement.kind} — ${input.agreement.summary}`,
    `Recommendation: ${input.decision.call.toUpperCase()} — ${input.decision.rationale}`,
    "Human decision required: yes",
  ].join("\n");
}
