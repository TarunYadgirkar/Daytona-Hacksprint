import { z } from "zod";
import { authorizeDemoCode, demoAccessStatus } from "@/lib/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const accessSchema = z.object({
  code: z.string().trim().min(1).max(200),
});

export async function GET(request: Request): Promise<Response> {
  return Response.json(demoAccessStatus(request), {
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const parsed = accessSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json({ error: "Enter the demo access code" }, { status: 400 });
    }

    const status = demoAccessStatus(request);
    if (status.required && !status.configured) {
      return Response.json(
        {
          error:
            "Production access protection is not configured. Set SAFESHIP_DEMO_ACCESS_CODE.",
        },
        { status: 503 },
      );
    }

    const cookie = authorizeDemoCode(parsed.data.code);
    if (!cookie) {
      return Response.json({ error: "Incorrect demo access code" }, { status: 401 });
    }

    return Response.json(
      { authorized: true },
      {
        headers: {
          "cache-control": "no-store",
          "set-cookie": cookie,
        },
      },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof SyntaxError
            ? "Request body must be valid JSON"
            : "Could not verify demo access",
      },
      { status: error instanceof SyntaxError ? 400 : 500 },
    );
  }
}
