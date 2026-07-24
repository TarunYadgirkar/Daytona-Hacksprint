import { z } from "zod";
import { flushLogger, logHumanOverride } from "@/lib/adapters/braintrust";
import type { HumanOverride } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const overrideSchema = z.object({
  runId: z.string().trim().min(1).max(200),
  call: z.enum(["merge", "block"]),
  reason: z.string().trim().max(2000).default(""),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const parsed = overrideSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid override", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const override: HumanOverride = {
      ...parsed.data,
      at: new Date().toISOString(),
    };

    const recorded = await logHumanOverride(override);
    if (!recorded) {
      return Response.json(
        { error: "Braintrust is not configured; the override was not recorded" },
        { status: 503 },
      );
    }
    return Response.json({ recorded: true, override });
  } catch (error) {
    const message = error instanceof SyntaxError ? "Request body must be valid JSON" : "Could not record override";
    return Response.json({ error: message }, { status: error instanceof SyntaxError ? 400 : 500 });
  } finally {
    // Braintrust batches writes. The audit record must leave the process before
    // a serverless route can be frozen.
    await flushLogger();
  }
}
