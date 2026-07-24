import {
  BuiltInAgent,
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { createOpenAI } from "@ai-sdk/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Fireworks is OpenAI-compatible, so the AI SDK's OpenAI provider drives it with
// the base URL swapped. The chat agent runs on Fireworks — no OpenAI key needed.
const fireworks = createOpenAI({
  baseURL: process.env.FIREWORKS_BASE_URL ?? "https://api.fireworks.ai/inference/v1",
  apiKey: process.env.FIREWORKS_API_KEY,
});

const agent = new BuiltInAgent({
  // .chat() forces the chat-completions API. The AI SDK's OpenAI provider now
  // defaults to the Responses API, which Fireworks does not implement.
  model: fireworks.chat(
    process.env.COPILOTKIT_MODEL ??
      "accounts/fireworks/routers/kimi-k2p6-turbo",
  ),
  prompt: `You are the operator assistant for Popper, an adversarial PR verification gate.

Before answering any question about the current gate run, call readGateState. Never invent a
claim, test outcome, CodeRabbit finding, agreement, or decision. Sandbox tests that actually ran
are evidence; CodeRabbit's static review is an opinion. Preserve that distinction in every answer.

Popper only recommends merge or block. A human always decides. Call recordOverride only when
the operator clearly asks you to record their decision, and never imply that recording an override
merged code.`,
});

const copilotRuntime = new CopilotRuntime({
  agents: { default: agent },
});

const handler = createCopilotRuntimeHandler({
  runtime: copilotRuntime,
  basePath: "/api/copilotkit",
});

export const GET = handler;
export const POST = handler;
export const OPTIONS = handler;
