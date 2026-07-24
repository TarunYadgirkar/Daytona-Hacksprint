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
    verdict: "block",
    findings: [
      {
        severity: "major",
        file: "target.js",
        line: 3,
        title: "Guard null carts as well as empty arrays",
        body: "The stated objective includes null responses, but items.length still throws for null. Guard null before accessing length or calling reduce.",
      },
    ],
    raw: "Recorded from CodeRabbit Pro Plus review 9c2963e7-c135-445a-88cd-cce7dc21e111 on TarunYadgirkar/popper-demo-cart#1.",
    source: "cache",
    recordedAt: "2026-07-24T21:34:02.000Z",
    prDigest: "7ffc26d7f445ed7aa0bd45105d587d4a83e1eb0a82352db146f4b29607fef290",
  },

  "github:TarunYadgirkar/popper-demo-cart#1": {
    verdict: "block",
    findings: [
      {
        severity: "major",
        file: "cart.js",
        line: 3,
        title: "Guard null carts as well as empty arrays",
        body: "The stated objective includes null responses, but items.length still throws for null. Guard null before accessing length or calling reduce.",
      },
    ],
    raw: "Recorded from CodeRabbit Pro Plus review 9c2963e7-c135-445a-88cd-cce7dc21e111 on TarunYadgirkar/popper-demo-cart#1.",
    source: "cache",
    recordedAt: "2026-07-24T21:34:02.000Z",
    prDigest: "ec31c5bfdabef98a59b913ed4dda9a36d8d51547e8832808a68e1ffa6cc3e0ad",
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
