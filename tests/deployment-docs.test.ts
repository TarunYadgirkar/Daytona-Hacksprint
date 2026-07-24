import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const required = [
  "FIREWORKS_API_KEY",
  "FIREWORKS_BASE_URL",
  "FIREWORKS_MODEL",
  "DAYTONA_API_KEY",
  "BRAINTRUST_API_KEY",
  "BRAINTRUST_PROJECT",
  "SAFESHIP_DEMO_ACCESS_CODE",
  "CODERABBIT_MODE",
  "COPILOTKIT_MODEL",
] as const;

test("Vercel handoff names every required live variable without secrets", () => {
  const handoff = readFileSync("docs/VERCEL_HANDOFF.md", "utf8");

  for (const name of required) {
    assert.match(handoff, new RegExp(`\\b${name}\\b`));
  }

  assert.doesNotMatch(handoff, /\b(?:fw_|dtn_|cr-|sk-)[A-Za-z0-9_-]{16,}\b/);
  assert.doesNotMatch(handoff, /SAFESHIP_GATE_MODE=recorded/);
});

test("the public Vercel template omits local-only credentials", () => {
  const handoff = readFileSync("docs/VERCEL_HANDOFF.md", "utf8");

  assert.match(handoff, /CodeRabbit API key.*local recorder only/i);
  assert.doesNotMatch(handoff, /NEXT_PUBLIC_COPILOTKIT_API_KEY=/);
  assert.doesNotMatch(handoff, /OPENAI_API_KEY=/);
});
