/**
 * GET /api/gate?pr=pr-101
 *
 * Streams the gate as Server-Sent Events. Deliberately a plain streaming route
 * rather than a CopilotKit agent tool: the demo must not depend on an LLM
 * choosing to call a function at the right moment. CopilotKit still drives the
 * conversational surface and the human override — see app/api/copilotkit.
 */

import { encodeSSE, type GateEvent } from "@/lib/events";
import { flushLogger } from "@/lib/adapters/braintrust";
import { consumeGateQuota } from "@/lib/quota";
import { getPR } from "@/lib/fixtures/prs";
import { getRecordedRun } from "@/lib/fixtures/recorded-runs";
import { GateStageError, runGate } from "@/lib/pipeline";
import { streamRecordedRun } from "@/lib/recorded-stream";

export const runtime = "nodejs"; // Daytona and Braintrust SDKs are Node-only
export const dynamic = "force-dynamic";
export const maxDuration = 300; // sandbox runs are slow; do not let the platform cut us off

const DEMO_TEST_COUNT = 4;

export async function GET(request: Request) {
  const prId = new URL(request.url).searchParams.get("pr");
  const pr = prId ? getPR(prId) : undefined;
  const recordedMode = process.env.POPPER_GATE_MODE === "recorded";
  const recordedRun = prId && recordedMode ? getRecordedRun(prId) : undefined;

  if (!pr) {
    await flushLogger();
    return new Response(JSON.stringify({ error: `Unknown PR "${prId}"` }), {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  }

  if (recordedMode && !recordedRun) {
    await flushLogger();
    return Response.json(
      { error: `No recorded fixture exists for "${pr.id}"` },
      { status: 500 },
    );
  }

  const quota = recordedMode
    ? { allowed: true, remaining: Number.POSITIVE_INFINITY, retryAfterSeconds: 0 }
    : consumeGateQuota(request);
  if (!quota.allowed) {
    await flushLogger();
    return Response.json(
      { error: "Live-run limit reached. Load a recorded run or retry later." },
      {
        status: 429,
        headers: {
          "retry-after": String(quota.retryAfterSeconds),
          "cache-control": "no-store",
        },
      },
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const emit = (event: GateEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(encodeSSE(event)));
        } catch {
          closed = true; // client navigated away mid-run
        }
      };

      try {
        if (recordedRun) {
          await streamRecordedRun(recordedRun, emit);
        } else {
          await runGate({ pr, emit, testCount: DEMO_TEST_COUNT });
        }
      } catch (err) {
        emit({
          type: "stage_error",
          stage: err instanceof GateStageError ? err.stage : "decision",
          message: err instanceof Error ? err.message : String(err),
        });
      } finally {
        // runGate flushes completed traces itself. This second flush covers
        // failures that happen before the assembled result can be logged.
        await flushLogger();
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no", // stops nginx-style proxies buffering the stream
    },
  });
}
