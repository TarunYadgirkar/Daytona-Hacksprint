import { z } from "zod";
import type { StagedPR } from "./types";

const MAX_SOURCE_BYTES = 40_000;
const ownerOrRepoSchema = z.string().regex(/^[A-Za-z0-9_.-]+$/);

const pullSchema = z.object({
  title: z.string().min(1),
  body: z.string().nullable(),
  html_url: z.string().url(),
  user: z.object({ login: z.string().min(1) }),
  base: z.object({ sha: z.string().min(1) }),
  head: z.object({ sha: z.string().min(1) }),
});

const filesSchema = z.array(
  z.object({
    filename: z.string().min(1),
    status: z.string(),
  }),
);

const contentSchema = z.object({
  type: z.literal("file"),
  encoding: z.literal("base64"),
  content: z.string(),
  size: z.number().int().nonnegative().max(MAX_SOURCE_BYTES),
});

export interface GitHubPullRequestRef {
  owner: string;
  repo: string;
  number: number;
}

export function parseGitHubPullRequest(input: string): GitHubPullRequestRef {
  if (input.startsWith("github:")) {
    const match = /^github:([^/]+)\/([^#]+)#([1-9]\d*)$/.exec(input);
    if (!match) throw new Error("Invalid GitHub pull request identifier");
    return {
      owner: ownerOrRepoSchema.parse(match[1]),
      repo: ownerOrRepoSchema.parse(match[2]),
      number: Number(match[3]),
    };
  }

  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Enter a complete GitHub pull request URL");
  }
  if (url.protocol !== "https:" || url.hostname !== "github.com") {
    throw new Error("Only public github.com pull request URLs are supported");
  }
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length !== 4 || parts[2] !== "pull" || !/^[1-9]\d*$/.test(parts[3]!)) {
    throw new Error("Use a URL shaped like https://github.com/owner/repo/pull/123");
  }
  return {
    owner: ownerOrRepoSchema.parse(parts[0]),
    repo: ownerOrRepoSchema.parse(parts[1]),
    number: Number(parts[3]),
  };
}

export function githubPullRequestId(ref: GitHubPullRequestRef): string {
  return `github:${ref.owner}/${ref.repo}#${ref.number}`;
}

async function githubRequest<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<T> {
  const token = process.env.GITHUB_TOKEN?.trim();
  const response = await fetch(`https://api.github.com${path}`, {
    cache: "no-store",
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "Popper-Hackathon",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? "GitHub pull request or source file was not found"
        : `GitHub API request failed with status ${response.status}`,
    );
  }
  const parsed = schema.safeParse(await response.json());
  if (!parsed.success) throw new Error("GitHub returned an unsupported response");
  return parsed.data;
}

function encodedFilePath(filename: string): string {
  return filename.split("/").map(encodeURIComponent).join("/");
}

async function readFileAt(
  ref: GitHubPullRequestRef,
  filename: string,
  sha: string,
): Promise<string> {
  const content = await githubRequest(
    `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}/contents/${encodedFilePath(filename)}?ref=${encodeURIComponent(sha)}`,
    contentSchema,
  );
  return Buffer.from(content.content.replace(/\s/g, ""), "base64").toString("utf8");
}

export async function importGitHubPullRequest(
  input: string,
): Promise<StagedPR> {
  const ref = parseGitHubPullRequest(input);
  const root = `/repos/${encodeURIComponent(ref.owner)}/${encodeURIComponent(ref.repo)}`;
  const pull = await githubRequest(`${root}/pulls/${ref.number}`, pullSchema);
  const files = await githubRequest(
    `${root}/pulls/${ref.number}/files?per_page=100`,
    filesSchema,
  );
  const target = files.find(
    (file) => file.status === "modified" && file.filename.endsWith(".js"),
  );
  if (!target) {
    throw new Error(
      "This demo importer needs a pull request that modifies one standalone JavaScript file",
    );
  }

  const [before, after] = await Promise.all([
    readFileAt(ref, target.filename, pull.base.sha),
    readFileAt(ref, target.filename, pull.head.sha),
  ]);

  return {
    id: githubPullRequestId(ref),
    title: pull.title,
    description: pull.body?.trim() || pull.title,
    author: `github/${pull.user.login}`,
    language: "javascript",
    before,
    after,
    entryFile: "target.js",
    demoNote: `Imported live from ${ref.owner}/${ref.repo}#${ref.number}.`,
    sourceUrl: pull.html_url,
  };
}
