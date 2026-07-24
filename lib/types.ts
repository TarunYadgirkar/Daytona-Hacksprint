/**
 * Shared vocabulary for the Popper gate.
 *
 * The whole product rests on one distinction, so it is worth naming it here:
 *   - EVIDENCE is a test that actually ran against real code (Daytona).
 *   - OPINION is a model reading a diff and forming a judgement (CodeRabbit).
 * Every type below is on one side of that line. Keep it that way.
 */

export type StageName =
  | "claim"
  | "tests"
  | "sandbox"
  | "coderabbit"
  | "compare"
  | "decision";

export const STAGE_ORDER: StageName[] = [
  "claim",
  "tests",
  "sandbox",
  "coderabbit",
  "compare",
  "decision",
];

/** A staged, AI-agent-authored PR. See lib/fixtures/prs.ts. */
export interface StagedPR {
  id: string;
  title: string;
  /** What the PR description says it does. This is the text we extract a claim from. */
  description: string;
  author: string;
  language: "javascript";
  /** Module under test, before the PR. */
  before: string;
  /** Module under test, after the PR. */
  after: string;
  /** Filename the module is written to inside the sandbox. */
  entryFile: string;
  /** Narrative note for the demo operator. Never shown to the model. */
  demoNote?: string;
  /** Public source when the case was imported from GitHub. */
  sourceUrl?: string;
}

/** Stage 1 output: the specific behavioural promise the PR is making. */
export interface ExtractedClaim {
  /** One sentence, falsifiable. "Returns 0 for an empty cart instead of throwing." */
  statement: string;
  /** The observable behaviour a test could target. */
  targetBehavior: string;
  /** Inputs or conditions the claim implicitly covers. */
  impliedInputs: string[];
  /** 0-1. Low confidence means the PR description was vague. */
  confidence: number;
}

/** Stage 2 output: a test written to FALSIFY the claim, not to confirm it. */
export interface AdversarialTest {
  id: string;
  name: string;
  /** Why this test might break the claim. The adversarial intent, stated. */
  hypothesis: string;
  /**
   * Self-contained Node script. Requires ./target.js, exits 0 on pass,
   * non-zero on fail. No test framework, no npm install, no network.
   */
  code: string;
}

export type RunOutcome = "pass" | "fail" | "error";

/**
 * The core inference. A PR claiming "fixes X" should produce a test that
 * FAILS on `before` and PASSES on `after`. Anything else is interesting.
 */
export type TestVerdict =
  /** Failed before, passes after. The claim survived the attack. */
  | "claim_upheld"
  /** Still fails after. The claim is false. This is the money signal. */
  | "claim_broken"
  /** Passed before too, so it never exercised the bug. Weak test, not evidence. */
  | "test_inconclusive"
  /** Harness or syntax problem. Not a verdict about the code. */
  | "test_errored";

export interface SandboxTestResult {
  testId: string;
  testName: string;
  hypothesis: string;
  before: RunOutcome;
  after: RunOutcome;
  verdict: TestVerdict;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export interface SandboxReport {
  sandboxId: string | null;
  results: SandboxTestResult[];
  /** True if any test came back claim_broken. */
  claimBroken: boolean;
  totalDurationMs: number;
  /** Set when the sandbox itself failed, as distinct from tests failing. */
  infraError?: string;
}

export type CodeRabbitVerdict = "approve" | "concerns" | "block";

export interface CodeRabbitFinding {
  severity: "critical" | "major" | "minor" | "info";
  file?: string;
  line?: number;
  title: string;
  body?: string;
}

interface CodeRabbitReviewBase {
  verdict: CodeRabbitVerdict;
  findings: CodeRabbitFinding[];
  raw?: string;
}

/**
 * Provenance matters on stage. A fixture is useful for local UI development,
 * but it is not CodeRabbit's opinion and must never be presented as one.
 */
export type CodeRabbitReview =
  | (CodeRabbitReviewBase & {
      source: "cli";
      recordedAt: string;
    })
  | (CodeRabbitReviewBase & {
      source: "cache";
      recordedAt: string;
      /** SHA-256 of the exact staged repository content reviewed. */
      prDigest: string;
    })
  | (CodeRabbitReviewBase & {
      source: "fixture";
      recordedAt?: never;
      prDigest?: never;
    });

/**
 * Stage 5. The disagreement taxonomy is the actual product, so these names
 * are load-bearing. They appear verbatim in the UI and in Braintrust.
 */
export type AgreementKind =
  /** Sandbox broke the claim AND CodeRabbit flagged it. Boring, correct. */
  | "both_caught"
  /** Neither found anything. Boring, probably fine. */
  | "both_clear"
  /** Tests prove the claim is false, CodeRabbit approved. Evidence beats opinion. */
  | "evidence_only"
  /** CodeRabbit blocked, tests found nothing. Opinion worth a human look. */
  | "opinion_only"
  /** The sandbox failed, so there is no evidence to compare against. Not agreement. */
  | "no_evidence"
  /** Fixture provenance is not an independent review, so there is no opinion to compare. */
  | "no_opinion";

export interface AgreementAnalysis {
  agree: boolean;
  kind: AgreementKind;
  /** Plain-language explanation, written for the person about to click merge. */
  summary: string;
}

export type GateCall = "merge" | "block";

export interface GateDecision {
  call: GateCall;
  rationale: string;
  /** Always true. Popper never merges on its own. See docs/DECISIONS.md D-001. */
  requiresHuman: true;
}

/** Everything the gate produced, assembled. Logged to Braintrust as one trace. */
export interface GateResult {
  runId: string;
  prId: string;
  startedAt: string;
  finishedAt: string;
  claim: ExtractedClaim;
  tests: AdversarialTest[];
  sandbox: SandboxReport;
  codeRabbit: CodeRabbitReview;
  agreement: AgreementAnalysis;
  decision: GateDecision;
}

/** Recorded by a human clicking override. Logged as Braintrust feedback. */
export interface HumanOverride {
  runId: string;
  call: GateCall;
  reason: string;
  at: string;
}
