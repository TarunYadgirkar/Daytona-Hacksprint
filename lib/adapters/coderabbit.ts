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
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { CodeRabbitFinding, CodeRabbitReview, CodeRabbitVerdict, StagedPR } from "../types";
import { CODERABBIT_CACHE } from "../fixtures/coderabbit-cache";

const CLI_TIMEOUT_MS = 20 * 60 * 1000;
const AUTH_STATUS_TIMEOUT_MS = 10 * 1000;

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
      source: "fixture",
    };
  }
  return cached;
}

/**
 * Shell out to the CodeRabbit CLI in agent mode.
 *
 * Requires: CLI installed (curl -fsSL https://cli.coderabbit.ai/install.sh | sh),
 * authenticated (`coderabbit auth login`), and CWD inside a git repo with the
 * change present as tracked edits.
 */
export async function runCodeRabbitCLI(pr: StagedPR, cwd = process.cwd()): Promise<CodeRabbitReview> {
  const projectLocalBin = join(process.cwd(), ".tools", "bin", "coderabbit");
  const command =
    process.env.CODERABBIT_BIN || (existsSync(projectLocalBin) ? projectLocalBin : "coderabbit");
  await assertCodeRabbitAuthenticated(command, cwd);
  const stdout = await new Promise<string>((resolve, reject) => {
    const child = spawn(command, ["review", "--agent"], {
      cwd,
      env: { ...process.env, CODERABBIT_API_KEY: process.env.CODERABBIT_API_KEY ?? "" },
    });

    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`CodeRabbit CLI exceeded ${CLI_TIMEOUT_MS / 60000} minutes`));
    }, CLI_TIMEOUT_MS);

    child.stdout.on("data", (d) => (out += d.toString()));
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(new Error(`CodeRabbit CLI not runnable: ${e.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      const agentError = findAgentError(out);
      if (out.trim().length === 0) {
        reject(new Error(`CodeRabbit CLI produced no output (exit ${code}): ${err}`));
      } else if (code !== 0 || agentError) {
        reject(
          new Error(
            agentError
              ? `CodeRabbit CLI failed: ${agentError}`
              : `CodeRabbit CLI exited ${code}: ${err || out.slice(0, 500)}`,
          ),
        );
      } else {
        resolve(out);
      }
    });
  });

  return parseAgentOutput(stdout, pr);
}

async function assertCodeRabbitAuthenticated(command: string, cwd: string): Promise<void> {
  // API-key mode is non-interactive and does not create a stored CLI session.
  if (process.env.CODERABBIT_API_KEY) return;

  const stdout = await new Promise<string>((resolve, reject) => {
    const child = spawn(command, ["auth", "status", "--agent"], {
      cwd,
      env: process.env,
    });

    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error("CodeRabbit authentication check timed out"));
    }, AUTH_STATUS_TIMEOUT_MS);

    child.stdout.on("data", (data) => (out += data.toString()));
    child.stderr.on("data", (data) => (err += data.toString()));
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(new Error(`CodeRabbit CLI not runnable: ${error.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(`CodeRabbit authentication check exited ${code}: ${err || out}`));
    });
  });

  const authenticated = stdout.split("\n").some((line) => {
    try {
      return asRecord(JSON.parse(line) as unknown)?.authenticated === true;
    } catch {
      return false;
    }
  });

  if (!authenticated) {
    throw new Error(
      "CodeRabbit CLI is not authenticated. Run 'coderabbit auth login' or set CODERABBIT_API_KEY.",
    );
  }
}

/**
 * Agent mode streams JSON events, one per line, including `heartbeat` and
 * `review_skipped`. We keep the last object that carries findings and ignore
 * the rest. Written defensively because the event shape is not contractual.
 */
export function parseAgentOutput(stdout: string, _pr: StagedPR): CodeRabbitReview {
  const agentError = findAgentError(stdout);
  if (agentError) throw new Error(`CodeRabbit CLI failed: ${agentError}`);

  const findings: CodeRabbitFinding[] = [];

  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch {
      continue;
    }
    const evt = asRecord(parsed);
    if (!evt) continue;
    const candidates =
      (Array.isArray(evt.findings) && evt.findings) ||
      (Array.isArray(evt.comments) && evt.comments) ||
      (evt.type === "finding" ? [evt] : []);
    if (!Array.isArray(candidates)) continue;

    for (const candidate of candidates) {
      const c = asRecord(candidate);
      if (!c) continue;
      findings.push({
        severity: normalizeSeverity(c.severity ?? c.level),
        file: firstString(c.fileName, c.file, c.path),
        line:
          typeof c.line === "number"
            ? c.line
            : typeof c.startLine === "number"
              ? c.startLine
              : undefined,
        title: firstString(c.title, c.summary, c.comment) ?? "Finding",
        body: firstString(c.body, c.description, c.codegenInstructions, c.comment),
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

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === "string");
}

function findAgentError(stdout: string): string | null {
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      const event = asRecord(JSON.parse(trimmed) as unknown);
      if (event?.type === "error") {
        return firstString(event.message, event.status, event.phase) ?? "unknown error";
      }
    } catch {
      // Non-JSON progress output is ignored; the CLI can mix formats.
    }
  }
  return null;
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
