/**
 * CopilotKit runtime endpoint.
 *
 * This is the v2 runtime (CopilotKit v1.50+). The legacy v1 endpoint factories
 * still work, but new code should use the shape below.
 *
 * The agent's job in SafeShip is to explain and to act on the operator's behalf:
 * "why did the two methods disagree on pr-101?", "block this and tell me why".
 * The pipeline itself runs over /api/gate so the demo does not hinge on tool
 * selection. Frontend tools in components/CopilotTools.tsx give the agent read
 * access to live gate state and write access to the override.
 *
 * To route this agent through Fireworks as well, swap BuiltInAgent's simple
 * `model` string for factory mode with an OpenAI-compatible provider pointed at
 * FIREWORKS_BASE_URL. Simple mode is kept here because it is one line and does
 * not block anything.
 */

import { CopilotRuntime, copilotRuntimeNextJSAppRouterEndpoint } from "@copilotkit/runtime";
import { BuiltInAgent } from "@copilotkit/runtime/v2";
import type { NextRequest } from "next/server";

const agent = new BuiltInAgent({
  model: process.env.COPILOT_MODEL ?? "openai:gpt-5.4-mini",
  prompt: `You are the operator's assistant inside SafeShip, an adversarial PR verification gate.

SafeShip extracts the behavioural claim a pull request makes, generates tests designed to falsify that claim, runs them against the before and after code in an isolated sandbox, and compares the result against CodeRabbit's independent static review.

Hold this distinction firmly in everything you say: a sandbox result is EVIDENCE, because code actually ran. A review verdict is an OPINION, because a model read a diff. When they disagree, say which is which and do not smooth it over.

Use readGateState to see the current run before answering questions about it. Never claim a test result you have not read from that tool.

You may recommend a merge or a block. You may never perform one. Approving or blocking is the operator's call, made through the override buttons, and you should say so plainly if asked to do it yourself.`,
});

const runtime = new CopilotRuntime({ agents: { default: agent } });

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
};
