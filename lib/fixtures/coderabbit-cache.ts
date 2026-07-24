/**
 * Pre-recorded CodeRabbit verdicts, keyed by staged PR id.
 *
 * REGENERATE THESE BEFORE THE DEMO:
 *     npm run record:coderabbit
 *
 * The placeholder entries below are the SHAPE, not real CodeRabbit output. They
 * exist so the pipeline runs end-to-end before you have the CLI authenticated.
 * The recorder script overwrites this file with genuine verdicts and stamps
 * `recordedAt`. If you present a run where recordedAt is missing, you are
 * showing placeholder data — say so, or re-record. Do not narrate placeholder
 * findings as CodeRabbit's opinion.
 */

import type { CodeRabbitReview } from "../types";

export const CODERABBIT_CACHE: Record<string, CodeRabbitReview> = {
  "pr-101": {
    verdict: "approve",
    findings: [
      {
        severity: "info",
        file: "target.js",
        line: 2,
        title: "Guard clause added for empty collection",
        body: "Early return for the zero-length case reads correctly and avoids the reduce on an empty array.",
      },
    ],
    source: "fixture",
  },

  "pr-102": {
    verdict: "approve",
    findings: [],
    source: "fixture",
  },

  "pr-103": {
    verdict: "block",
    findings: [
      {
        severity: "critical",
        file: "target.js",
        line: 4,
        title: "Prototype pollution in recursive merge",
        body: "Object.keys(source) is not filtered, so a __proto__ or constructor key in untrusted config will walk up the prototype chain and mutate Object.prototype. Reject those keys explicitly or build the accumulator with Object.create(null).",
      },
    ],
    source: "fixture",
  },

  "pr-104": {
    verdict: "block",
    findings: [
      {
        severity: "critical",
        file: "target.js",
        line: 3,
        title: "Retry loop bound is hardcoded and ignores the attempts argument",
        body: "The loop condition uses a literal 1 instead of the attempts parameter, so the operation is only ever tried once. The function's name and signature promise behaviour it does not implement.",
      },
    ],
    source: "fixture",
  },
};
