/**
 * Fireworks AI adapter.
 *
 * Fireworks exposes an OpenAI-compatible surface at
 * https://api.fireworks.ai/inference/v1, so the stock `openai` SDK works
 * unchanged with a swapped baseURL. Model IDs are fully qualified, e.g.
 * `accounts/fireworks/models/kimi-k2p6`. They drift — verify against the live
 * /models catalog if you get a 404 Model not found.
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
import { z } from "zod";
import type { AdversarialTest, ExtractedClaim, StagedPR } from "../types";

const MAX_TEST_COUNT = 12;
const MAX_GENERATION_ATTEMPTS = 3;

function client(): OpenAI {
  const apiKey = process.env.FIREWORKS_API_KEY;
  if (!apiKey) throw new Error("FIREWORKS_API_KEY is not set");
  return new OpenAI({
    apiKey,
    baseURL: process.env.FIREWORKS_BASE_URL ?? "https://api.fireworks.ai/inference/v1",
  });
}

function model(): string {
  return process.env.FIREWORKS_MODEL ?? "accounts/fireworks/models/kimi-k2p6";
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

export interface GeneratedTestDraft {
  name: string;
  hypothesis: string;
  code: string;
}

const generatedTestDraftSchema = z.object({
  name: z.string().trim().min(1),
  hypothesis: z.string().trim().min(1),
  code: z
    .string()
    .trim()
    .min(1)
    .refine(
      (code) => /require\(\s*(['"])\.\/target\.js\1\s*\)/.test(code),
      "test must require ./target.js",
    ),
});

function normalizedName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizedCode(value: string): string {
  // JavaScript string literals are case-sensitive, so only whitespace is
  // normalized when deciding whether two attacks execute the same code.
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Accept only runnable, distinct drafts. A repeated model answer does not
 * become a second adversarial test merely because it arrived in another call.
 */
export function collectUniqueTestDrafts(
  existing: GeneratedTestDraft[],
  candidates: unknown[],
  limit: number,
): GeneratedTestDraft[] {
  const collected = [...existing];
  const names = new Set(collected.map((test) => normalizedName(test.name)));
  const code = new Set(collected.map((test) => normalizedCode(test.code)));

  for (const candidate of candidates) {
    if (collected.length >= limit) break;
    const parsed = generatedTestDraftSchema.safeParse(candidate);
    if (!parsed.success) continue;

    const nameKey = normalizedName(parsed.data.name);
    const codeKey = normalizedCode(parsed.data.code);
    if (names.has(nameKey) || code.has(codeKey)) continue;

    names.add(nameKey);
    code.add(codeKey);
    collected.push(parsed.data);
  }

  return collected;
}

async function requestTestDrafts(
  pr: StagedPR,
  claim: ExtractedClaim,
  missing: number,
  accepted: GeneratedTestDraft[],
  attempt: number,
): Promise<unknown[]> {
  const avoidRepeating =
    accepted.length === 0
      ? ""
      : `\nAlready accepted attacks — do not repeat these:\n${accepted
          .map((test) => `- ${test.name}: ${test.hypothesis}`)
          .join("\n")}\n`;

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
${avoidRepeating}
Generation attempt ${attempt} of ${MAX_GENERATION_ATTEMPTS}. Write exactly ${missing} additional, distinct adversarial ${missing === 1 ? "test" : "tests"}.`,
      },
    ],
  });

  const parsed = parseJSON<{ tests?: unknown }>(
    res.choices[0]?.message?.content ?? "",
    `test generation attempt ${attempt}`,
  );
  return Array.isArray(parsed.tests) ? parsed.tests : [];
}

export async function generateAdversarialTests(
  pr: StagedPR,
  claim: ExtractedClaim,
  count = 4,
): Promise<AdversarialTest[]> {
  if (!Number.isInteger(count) || count < 1 || count > MAX_TEST_COUNT) {
    throw new Error(`Adversarial test count must be an integer from 1 to ${MAX_TEST_COUNT}`);
  }

  let drafts: GeneratedTestDraft[] = [];
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS && drafts.length < count; attempt += 1) {
    try {
      const candidates = await requestTestDrafts(
        pr,
        claim,
        count - drafts.length,
        drafts,
        attempt,
      );
      drafts = collectUniqueTestDrafts(drafts, candidates, count);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (!lastError.message.startsWith("Fireworks returned unparseable JSON")) {
        throw lastError;
      }
    }
  }

  if (drafts.length !== count) {
    const cause = lastError ? ` Last error: ${lastError.message}` : "";
    throw new Error(
      `Fireworks produced ${drafts.length} of ${count} required unique, runnable adversarial tests after ${MAX_GENERATION_ATTEMPTS} attempts.${cause}`,
    );
  }

  return drafts.map((test, i) => ({
    id: `t${i + 1}`,
    ...test,
  }));
}
