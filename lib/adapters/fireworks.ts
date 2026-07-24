/**
 * Fireworks AI adapter.
 *
 * Fireworks exposes an OpenAI-compatible surface at
 * https://api.fireworks.ai/inference/v1, so the stock `openai` SDK works
 * unchanged with a swapped baseURL. Model IDs are fully qualified, e.g.
 * `accounts/fireworks/models/kimi-k2-instruct-0905`.
 *
 * Two jobs, both structured-output:
 *   1. extractClaim  - read the PR, state the falsifiable promise
 *   2. generateAdversarialTests - write code that tries to falsify it
 *
 * Prompting note: the temptation is to ask for "tests for this PR". Don't.
 * That produces confirmatory tests that pass trivially. The prompts below
 * ask for falsification, which is the entire point of the product.
 */

import OpenAI from "openai";
import type { AdversarialTest, ExtractedClaim, StagedPR } from "../types";

function client(): OpenAI {
  const apiKey = process.env.FIREWORKS_API_KEY;
  if (!apiKey) throw new Error("FIREWORKS_API_KEY is not set");
  return new OpenAI({
    apiKey,
    baseURL: process.env.FIREWORKS_BASE_URL ?? "https://api.fireworks.ai/inference/v1",
  });
}

function model(): string {
  return process.env.FIREWORKS_MODEL ?? "accounts/fireworks/models/kimi-k2-instruct-0905";
}

/** Models wrap JSON in prose or fences more often than you'd like. Recover from both. */
function parseJSON<T>(raw: string, what: string): T {
  const cleaned = raw
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.search(/[[{]/);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        /* fall through */
      }
    }
    throw new Error(`Fireworks returned unparseable JSON for ${what}: ${cleaned.slice(0, 400)}`);
  }
}

const CLAIM_SYSTEM = `You read pull requests written by AI coding agents and state, precisely, the single behavioural promise the PR is making.

A claim must be falsifiable. "Improves error handling" is not a claim. "Returns an empty array instead of throwing when the input list is empty" is a claim.

Reply with JSON only, no prose, no markdown fences:
{
  "statement": "one sentence, falsifiable, present tense",
  "targetBehavior": "the observable behaviour a test could assert on",
  "impliedInputs": ["input or condition the claim implicitly covers", "..."],
  "confidence": 0.0
}

confidence is your certainty that the PR description states a specific behavioural change. A vague description gets a low score, and that low score is useful, so do not inflate it.`;

export async function extractClaim(pr: StagedPR): Promise<ExtractedClaim> {
  const res = await client().chat.completions.create({
    model: model(),
    temperature: 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CLAIM_SYSTEM },
      {
        role: "user",
        content: `PR title: ${pr.title}
PR author: ${pr.author}

PR description:
${pr.description}

Diff target, BEFORE:
\`\`\`javascript
${pr.before}
\`\`\`

Diff target, AFTER:
\`\`\`javascript
${pr.after}
\`\`\``,
      },
    ],
  });

  const claim = parseJSON<ExtractedClaim>(res.choices[0]?.message?.content ?? "", "claim extraction");
  return {
    statement: claim.statement ?? "No claim could be extracted.",
    targetBehavior: claim.targetBehavior ?? "",
    impliedInputs: Array.isArray(claim.impliedInputs) ? claim.impliedInputs : [],
    confidence: typeof claim.confidence === "number" ? claim.confidence : 0,
  };
}

const TESTS_SYSTEM = `You are an adversarial test author. You are given a code change and the behavioural claim it makes. Your job is to BREAK that claim, not to confirm it.

Write standalone Node.js scripts. Each script:
- requires the module under test with: const target = require('./target.js')
- exits with code 0 if the claimed behaviour HOLDS
- exits with a non-zero code (or throws) if the claimed behaviour FAILS
- prints a short human-readable line to stdout explaining what it observed
- uses ONLY the Node standard library. No npm packages, no test framework, no network, no filesystem writes.

Aim at the edges the author probably forgot: empty and null inputs, zero and negative numbers, boundary values, type coercion, duplicate or repeated entries, very large values, unicode, mutation of the caller's data, and re-entrancy. A good test is one that a confident but careless agent would not have thought of.

Reply with JSON only, no prose, no markdown fences:
{
  "tests": [
    {
      "name": "short descriptive name",
      "hypothesis": "the specific way this might break the claim",
      "code": "const target = require('./target.js');\\n..."
    }
  ]
}`;

export async function generateAdversarialTests(
  pr: StagedPR,
  claim: ExtractedClaim,
  count = 4,
): Promise<AdversarialTest[]> {
  const res = await client().chat.completions.create({
    model: model(),
    temperature: 0.4, // some variety across attempts; the claim itself stays at 0.1
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: TESTS_SYSTEM },
      {
        role: "user",
        content: `Claim to falsify: ${claim.statement}
Target behaviour: ${claim.targetBehavior}
Implied inputs: ${claim.impliedInputs.join(", ") || "(none stated)"}

The module under test, AFTER the change (this is ./target.js):
\`\`\`javascript
${pr.after}
\`\`\`

For reference, BEFORE the change:
\`\`\`javascript
${pr.before}
\`\`\`

Write exactly ${count} adversarial tests.`,
      },
    ],
  });

  const parsed = parseJSON<{ tests: Array<Omit<AdversarialTest, "id">> }>(
    res.choices[0]?.message?.content ?? "",
    "test generation",
  );

  const tests = Array.isArray(parsed.tests) ? parsed.tests : [];
  return tests
    .filter((t) => typeof t?.code === "string" && t.code.trim().length > 0)
    .slice(0, count)
    .map((t, i) => ({
      id: `t${i + 1}`,
      name: t.name?.trim() || `adversarial test ${i + 1}`,
      hypothesis: t.hypothesis?.trim() || "unstated",
      code: t.code,
    }));
}
