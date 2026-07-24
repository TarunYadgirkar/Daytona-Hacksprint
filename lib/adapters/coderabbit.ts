/**
 * CodeRabbit adapter: the independent "static AI review" signal.
 *
 * WHAT WE LEARNED, so nobody re-derives it at 2am:
 * CodeRabbit has no public "give me the review for PR #123" endpoint. The REST
 * API (api.coderabbit.ai) covers report generation and is Pro-gated. The real
 * integration surface for local code is the CLI:
 *
 *     coderabbit review --agent        # structured JSON, added in CLI v0.3.11
 *
 * Flags changed recently. As of CLI v0.7.0 the `--plain`, `--prompt-only`,
 * `--fast`, `--interactive` and `--cwd` flags were REMOVED. Most blog posts and
 * older skills still tell you to use `--prompt-only`; they are stale. Use
 * `--agent` for JSON, `--light` for a faster pass, `--dir` to scope.
 *
 * TWO OPERATIONAL FACTS THAT SHAPE THIS FILE:
 *   1. A review takes minutes, sometimes tens of minutes.
 *   2. Free-plan CLI reviews are rate limited (~3/hour).
 * Neither is compatible with a live demo. So: cache is the default, the CLI is
 * opt-in, and you record verdicts ahead of time with `npm run record:coderabbit`.
 * This is honesty, not a shortcut. The recorded output is CodeRabbit's real
 * verdict on the real code, just fetched last night instead of on stage. Say so
 * when you present it.
 */

import { spawn } from "node:child_process";
import type { CodeRabbitFinding, CodeRabbitReview, CodeRabbitVerdict, StagedPR } from "../types";
import { CODERABBIT_CACHE } from "../fixtures/coderabbit-cache";

const CLI_TIMEOUT_MS = 20 * 60 * 1000;

export async function getCodeRabbitReview(pr: StagedPR): Promise<CodeRabbitReview> {
  const mode = process.env.CODERABBIT_MODE ?? "cache";
  if (mode === "cli") {
    try {
      return await runCodeRabbitCLI(pr);
    } catch (err) {
      // Never let a slow or rate-limited CLI take down the demo. Fall back and
      // be loud about it in the console, quiet in the UI.
      console.error("[coderabbit] CLI failed, falling back to cache:", err);
      return fromCache(pr);
    }
  }
  return fromCache(pr);
}

function fromCache(pr: StagedPR): CodeRabbitReview {
  const cached = CODERABBIT_CACHE[pr.id];
  if (!cached) {
    return {
      verdict: "concerns",
      findings: [
        {
          severity: "info",
          title: "No recorded CodeRabbit review for this PR",
          body: `Run 'npm run record:coderabbit -- ${pr.id}' to capture one.`,
        },
      ],
      source: "cache",
    };
  }
  return { ...cached, source: "cache" };
}

/**
 * Shell out to the CodeRabbit CLI in agent mode.
 *
 * Requires: CLI installed (curl -fsSL https://cli.coderabbit.ai/install.sh | sh),
 * authenticated (`coderabbit auth login`), and CWD inside a git repo with the
 * change present as tracked edits.
 */
// The installer puts both `coderabbit` and its short alias `cr` on PATH. Prefer
// the full name; fall back to `cr` so a PATH with only the alias still works.
const CODERABBIT_BIN = process.env.CODERABBIT_BIN ?? "coderabbit";

export async function runCodeRabbitCLI(pr: StagedPR, cwd = process.cwd()): Promise<CodeRabbitReview> {
  const stdout = await new Promise<string>((resolve, reject) => {
    const spawnCli = (bin: string) =>
      spawn(bin, ["review", "--agent"], {
        cwd,
        env: { ...process.env, CODERABBIT_API_KEY: process.env.CODERABBIT_API_KEY ?? "" },
      });

    let child = spawnCli(CODERABBIT_BIN);
    let triedAlias = false;

    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`CodeRabbit CLI exceeded ${CLI_TIMEOUT_MS / 60000} minutes`));
    }, CLI_TIMEOUT_MS);

    const attach = () => {
      child.stdout.on("data", (d) => (out += d.toString()));
      child.stderr.on("data", (d) => (err += d.toString()));
      child.on("error", (e: NodeJS.ErrnoException) => {
        // Binary not on PATH under its full name — retry once with the `cr` alias.
        if (e.code === "ENOENT" && !triedAlias && CODERABBIT_BIN === "coderabbit") {
          triedAlias = true;
          child = spawnCli("cr");
          attach();
          return;
        }
        clearTimeout(timer);
        reject(new Error(`CodeRabbit CLI not runnable: ${e.message}`));
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        // The CLI exits non-zero when it has findings, which is not an error.
        if (out.trim().length === 0) reject(new Error(`CodeRabbit CLI produced no output (exit ${code}): ${err}`));
        else resolve(out);
      });
    };

    attach();
  });

  return parseAgentOutput(stdout, pr);
}

/**
 * Agent mode streams JSON events, one per line, including `heartbeat` and
 * `review_skipped`. We keep the last object that carries findings and ignore
 * the rest. Written defensively because the event shape is not contractual.
 */
export function parseAgentOutput(stdout: string, _pr: StagedPR): CodeRabbitReview {
  const findings: CodeRabbitFinding[] = [];

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    let evt: any;
    try {
      evt = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const candidates = evt.findings ?? evt.comments ?? (evt.type === "finding" ? [evt] : []);
    if (!Array.isArray(candidates)) continue;

    for (const c of candidates) {
      findings.push({
        severity: normalizeSeverity(c.severity ?? c.level),
        file: c.file ?? c.path,
        line: typeof c.line === "number" ? c.line : c.startLine,
        title: c.title ?? c.summary ?? c.comment ?? "Finding",
        body: c.body ?? c.description ?? c.codegenInstructions ?? c.comment,
      });
    }
  }

  return {
    verdict: deriveVerdict(findings),
    findings,
    source: "cli",
    recordedAt: new Date().toISOString(),
    raw: stdout.slice(0, 20000),
  };
}

function normalizeSeverity(input: unknown): CodeRabbitFinding["severity"] {
  const s = String(input ?? "").toLowerCase();
  if (s.includes("critical")) return "critical";
  if (s.includes("major") || s.includes("warning")) return "major";
  if (s.includes("minor")) return "minor";
  return "info";
}

/**
 * CodeRabbit reports findings, not a merge verdict, so we map severity to one.
 * Keeping this mapping in one place matters: it is the thing being compared
 * against sandbox evidence, and if it drifts, the disagreement stat is noise.
 */
export function deriveVerdict(findings: CodeRabbitFinding[]): CodeRabbitVerdict {
  if (findings.some((f) => f.severity === "critical")) return "block";
  if (findings.some((f) => f.severity === "major")) return "concerns";
  return "approve";
}
