"use client";

/**
 * Frontend tools exposed to the CopilotKit agent.
 *
 * readGateState is how the agent learns what actually happened. Without it the
 * agent will happily invent a test result, which for a product whose entire
 * pitch is "evidence, not opinion" would be a fairly humiliating demo.
 *
 * recordOverride lets the operator say "block this, the null case is real" in
 * chat and have it land in the same audit trail as the button. Same endpoint,
 * same log, different surface.
 */

import { z } from "zod";
import { useFrontendTool } from "@copilotkit/react-core/v2";
import type { GateCall } from "@/lib/types";

export interface GateSnapshot {
  runId: string | null;
  prId: string | null;
  claim: string | null;
  tests: Array<{ id: string; name: string; hypothesis: string }>;
  results: Array<{ testId: string; before: string; after: string; verdict: string }>;
  codeRabbit: { verdict: string; source: string; findings: string[] } | null;
  agreement: { agree: boolean; kind: string; summary: string } | null;
  decision: { call: string; rationale: string } | null;
}

export default function CopilotTools({
  getSnapshot,
  onOverride,
}: {
  getSnapshot: () => GateSnapshot;
  onOverride: (call: GateCall, reason: string) => Promise<void>;
}) {
  useFrontendTool({
    name: "readGateState",
    description:
      "Read the current SafeShip gate run: the extracted claim, the adversarial tests and their before/after outcomes, CodeRabbit's verdict, the agreement analysis, and the recommendation. Call this before answering any question about the current run.",
    parameters: z.object({}),
    handler: async () => JSON.stringify(getSnapshot(), null, 2),
  });

  useFrontendTool({
    name: "recordOverride",
    description:
      "Record the operator's final merge or block decision for the current run, with a reason, and log it to Braintrust. Only call this when the operator has clearly asked you to. Never call it to act on your own recommendation.",
    parameters: z.object({
      call: z.enum(["merge", "block"]).describe("The operator's decision"),
      reason: z.string().describe("Why, in the operator's words, for the audit trail"),
    }),
    handler: async ({ call, reason }) => {
      await onOverride(call as GateCall, reason);
      return `Recorded a human ${call} with reason: ${reason}`;
    },
  });

  return null;
}
