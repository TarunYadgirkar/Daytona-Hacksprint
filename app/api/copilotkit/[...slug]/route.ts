import {
  BuiltInAgent,
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const agent = new BuiltInAgent({
  model: process.env.COPILOTKIT_MODEL ?? "openai/gpt-4.1-mini",
  apiKey: process.env.OPENAI_API_KEY,
  prompt: `You are the operator assistant for SafeShip, an adversarial PR verification gate.

Before answering any question about the current gate run, call readGateState. Never invent a
claim, test outcome, CodeRabbit finding, agreement, or decision. Sandbox tests that actually ran
are evidence; CodeRabbit's static review is an opinion. Preserve that distinction in every answer.

SafeShip only recommends merge or block. A human always decides. Call recordOverride only when
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
