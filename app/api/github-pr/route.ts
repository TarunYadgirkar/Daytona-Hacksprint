import { z } from "zod";
import { importGitHubPullRequest } from "@/lib/github-pr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const urlSchema = z.string().trim().url().max(500);

export async function GET(request: Request): Promise<Response> {
  const parsed = urlSchema.safeParse(
    new URL(request.url).searchParams.get("url"),
  );
  if (!parsed.success) {
    return Response.json(
      { error: "Enter a complete GitHub pull request URL" },
      { status: 400 },
    );
  }

  try {
    return Response.json(await importGitHubPullRequest(parsed.data), {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not import the GitHub pull request",
      },
      { status: 422 },
    );
  }
}
