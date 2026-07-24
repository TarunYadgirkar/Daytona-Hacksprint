/**
 * POST /api/override
 *
 * Records a human overriding the gate. This endpoint is the reason SafeShip can
 * claim it is not an autonomous merge bot: the final call leaves a signed,
 * attributed record in Braintrust, and nothing merges without it.
 */

import { logHumanOverride } from "@/lib/adapters/braintrust";
import type { GateCall } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { runId?: string; call?: GateCall; reason?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const { runId, call, reason } = body;
  if (!runId || (call !== "merge" && call !== "block")) {
    return Response.json({ error: "runId and call ('merge' | 'block') are required." }, { status: 400 });
  }

  const override = {
    runId,
    call,
    reason: reason?.trim() || "(no reason given)",
    at: new Date().toISOString(),
  };

  await logHumanOverride(override);
  return Response.json({ ok: true, override });
}
