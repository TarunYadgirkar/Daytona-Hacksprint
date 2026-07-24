/**
 * Staged "AI-agent-authored" PRs, each with a real bug (or deliberately none).
 *
 * These are chosen to cover all four quadrants of the agreement matrix, so the
 * demo can show that neither method dominates the other:
 *
 *   pr-101  both_caught    sandbox and the recorded CodeRabbit review catch the null bug
 *   pr-102  both_clear     genuine correct fix, nothing to report
 *   pr-103  opinion_only   CodeRabbit catches a risk the behaviour tests miss
 *   pr-104  both_caught    obvious bug, both methods flag it
 *
 * Keep the modules small. The point on stage is legibility: a judge must be
 * able to read the diff on a projector and see the bug the moment you say it.
 */

import type { StagedPR } from "../types";

export const STAGED_PRS: StagedPR[] = [
  {
    id: "pr-101",
    title: "fix: prevent checkout crash on empty cart",
    author: "agent/sweeper-v2",
    language: "javascript",
    entryFile: "target.js",
    description: `Checkout was throwing for users with an empty cart.

Reported by support: a new session gets \`null\` back from the cart service until the first add-to-cart call, and the totals panel crashed on load. Reproduced locally with an empty cart.

This adds an early return so an empty cart totals to 0 instead of throwing. Checkout now renders for new sessions.`,
    before: `function cartTotal(items) {
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

module.exports = { cartTotal };`,
    after: `function cartTotal(items) {
  if (items.length === 0) return 0;
  return items.reduce((sum, item) => sum + item.price * item.qty, 0);
}

module.exports = { cartTotal };`,
    demoNote:
      "The agent patched the symptom it could see ([]) and never handled null, " +
      "which is the case the PR description itself describes. Both the real CodeRabbit " +
      "review and Popper's generated execution evidence independently catch the gap.",
  },

  {
    id: "pr-102",
    title: "fix: off-by-one in pagination window",
    author: "agent/sweeper-v2",
    language: "javascript",
    entryFile: "target.js",
    description: `The last item on each page was being dropped.

\`paginate(items, page, size)\` used an exclusive upper bound computed from the page index rather than the offset, so every page returned size-1 items. This corrects the slice bounds.`,
    before: `function paginate(items, page, size) {
  const start = page * size;
  return items.slice(start, start + size - 1);
}

module.exports = { paginate };`,
    after: `function paginate(items, page, size) {
  if (size <= 0) return [];
  const start = Math.max(0, page) * size;
  return items.slice(start, start + size);
}

module.exports = { paginate };`,
    demoNote: "A genuinely correct fix. Use this one to show the gate does not cry wolf.",
  },

  {
    id: "pr-103",
    title: "feat: deep-merge config objects",
    author: "agent/config-refactor",
    language: "javascript",
    entryFile: "target.js",
    description: `Adds \`deepMerge(target, source)\` so environment config can be layered over defaults.

Nested objects merge recursively rather than being replaced wholesale. Used by the config loader to combine defaults.json with the per-environment override file.`,
    before: `function deepMerge(target, source) {
  return Object.assign({}, target, source);
}

module.exports = { deepMerge };`,
    after: `function deepMerge(target, source) {
  const out = Object.assign({}, target);
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      out[key] = deepMerge(out[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

module.exports = { deepMerge };`,
    demoNote:
      "The stated behaviour (recursive merge) is correct and the adversarial tests " +
      "will confirm it. The risk is prototype pollution via a __proto__ key, which " +
      "is a property of the code, not of the claim. Static review sees it; " +
      "claim-targeted tests do not. This is the case that keeps the demo honest.",
  },

  {
    id: "pr-104",
    title: "fix: retry transient upload failures",
    author: "agent/reliability",
    language: "javascript",
    entryFile: "target.js",
    description: `Uploads were failing on the first transient network error.

Adds \`retry(fn, attempts)\` which re-invokes the operation up to \`attempts\` times before giving up, so a single blip no longer fails the whole upload.`,
    before: `function retry(fn, attempts) {
  return fn();
}

module.exports = { retry };`,
    after: `function retry(fn, attempts) {
  let lastError;
  for (let i = 0; i < 1; i++) {
    try {
      return fn();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

module.exports = { retry };`,
    demoNote:
      "The loop bound is hardcoded to 1, so it never retries. Both methods catch " +
      "this. Useful as the warm-up case before the interesting ones.",
  },
];

export function getPR(id: string): StagedPR | undefined {
  return STAGED_PRS.find((pr) => pr.id === id);
}
