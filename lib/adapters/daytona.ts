/**
 * Daytona adapter. This is where opinion turns into evidence.
 *
 * Every adversarial test is executed twice, against BEFORE and AFTER, in an
 * isolated sandbox. The pair of outcomes is what makes the result meaningful:
 *
 *   before=fail, after=pass  -> claim_upheld       (the fix works)
 *   before=fail, after=fail  -> claim_broken       (the PR lied)
 *   before=pass, after=pass  -> test_inconclusive  (never touched the bug)
 *   anything errored         -> test_errored       (harness problem, not a verdict)
 *
 * IMPLEMENTATION NOTE, please read before "improving" this file:
 * Files are written with `base64 -d` over executeCommand rather than the SDK's
 * filesystem helpers. That is deliberate. The filesystem API surface has moved
 * between SDK versions; `executeCommand` has been stable throughout. During a
 * hackathon, a boring call that survives a dependency bump is worth more than
 * an elegant one that breaks at 3am. See docs/DECISIONS.md D-002.
 */

import { Daytona } from "@daytona/sdk";
import type {
  AdversarialTest,
  RunOutcome,
  SandboxReport,
  SandboxTestResult,
  StagedPR,
  TestVerdict,
} from "../types";

const ROOT = "/home/daytona/safeship";
/** Per-test wall clock ceiling. An adversarial test that hangs is a failed test. */
const TEST_TIMEOUT_SECONDS = 10;

interface ExecResult {
  exitCode: number;
  stdout: string;
}

/** SDK versions have used both `result` and `stdout`, and sometimes omit exitCode. */
function normalizeExec(raw: unknown): ExecResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const stdout = (r.result ?? r.stdout ?? r.output ?? "") as string;
  const exitCode = typeof r.exitCode === "number" ? r.exitCode : r.exitCode === undefined ? 0 : Number(r.exitCode);
  return { exitCode: Number.isFinite(exitCode) ? exitCode : 1, stdout: String(stdout) };
}

async function exec(sandbox: any, command: string): Promise<ExecResult> {
  return normalizeExec(await sandbox.process.executeCommand(command));
}

/** base64 round-trip keeps arbitrary generated code out of shell-quoting hell. */
async function writeFile(sandbox: any, path: string, content: string): Promise<void> {
  const b64 = Buffer.from(content, "utf8").toString("base64");
  // base64 alphabet is shell-safe inside single quotes, so no escaping needed.
  await exec(sandbox, `printf '%s' '${b64}' | base64 -d > '${path}'`);
}

function classify(before: RunOutcome, after: RunOutcome): TestVerdict {
  if (before === "error" || after === "error") return "test_errored";
  if (before === "pass" && after === "pass") return "test_inconclusive";
  if (after === "fail") return "claim_broken";
  return "claim_upheld";
}

export interface RunSandboxOptions {
  pr: StagedPR;
  tests: AdversarialTest[];
  onResult?: (result: SandboxTestResult) => void;
  onLog?: (message: string) => void;
}

export async function runAdversarialSuite(opts: RunSandboxOptions): Promise<SandboxReport> {
  const { pr, tests, onResult, onLog } = opts;
  const startedAt = Date.now();

  if (!process.env.DAYTONA_API_KEY) throw new Error("DAYTONA_API_KEY is not set");

  const daytona = new Daytona({ apiKey: process.env.DAYTONA_API_KEY });
  let sandbox: any = null;
  const results: SandboxTestResult[] = [];

  try {
    onLog?.("Creating isolated sandbox…");
    sandbox = await daytona.create({ language: "javascript" });
    onLog?.(`Sandbox ${sandbox.id} ready.`);

    await exec(sandbox, `mkdir -p ${ROOT}/before ${ROOT}/after`);
    await writeFile(sandbox, `${ROOT}/before/target.js`, pr.before);
    await writeFile(sandbox, `${ROOT}/after/target.js`, pr.after);
    onLog?.("Wrote before/ and after/ variants of the module under test.");

    for (const test of tests) {
      const testStart = Date.now();
      const file = `${test.id}.js`;
      await writeFile(sandbox, `${ROOT}/before/${file}`, test.code);
      await writeFile(sandbox, `${ROOT}/after/${file}`, test.code);

      const beforeRun = await exec(
        sandbox,
        `cd ${ROOT}/before && timeout ${TEST_TIMEOUT_SECONDS}s node ${file} 2>&1`,
      );
      const afterRun = await exec(
        sandbox,
        `cd ${ROOT}/after && timeout ${TEST_TIMEOUT_SECONDS}s node ${file} 2>&1`,
      );

      // Exit 0 is a pass. 124 is GNU timeout's "killed", which we count as a
      // fail rather than an error: a hang is a real failure of the claim.
      const toOutcome = (r: ExecResult): RunOutcome => {
        if (r.exitCode === 0) return "pass";
        if (/SyntaxError|Cannot find module|ReferenceError: require/i.test(r.stdout)) return "error";
        return "fail";
      };

      const before = toOutcome(beforeRun);
      const after = toOutcome(afterRun);

      const result: SandboxTestResult = {
        testId: test.id,
        testName: test.name,
        hypothesis: test.hypothesis,
        before,
        after,
        verdict: classify(before, after),
        stdout: afterRun.stdout.slice(0, 4000),
        // Diagnostics from the side that actually errored. streams are merged via
        // 2>&1, so this is combined output, kept only for the test_errored case.
        stderr:
          after === "error"
            ? afterRun.stdout.slice(0, 2000)
            : before === "error"
              ? beforeRun.stdout.slice(0, 2000)
              : "",
        durationMs: Date.now() - testStart,
      };

      results.push(result);
      onResult?.(result);
    }

    return {
      sandboxId: sandbox.id ?? null,
      results,
      claimBroken: results.some((r) => r.verdict === "claim_broken"),
      totalDurationMs: Date.now() - startedAt,
    };
  } catch (err) {
    // An infra failure is NOT evidence of a broken claim. Keep them distinct,
    // or the gate will start blocking PRs because Daytona had a bad minute.
    return {
      sandboxId: sandbox?.id ?? null,
      results,
      claimBroken: results.some((r) => r.verdict === "claim_broken"),
      totalDurationMs: Date.now() - startedAt,
      infraError: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (sandbox) {
      try {
        await sandbox.delete();
        onLog?.("Sandbox torn down.");
      } catch {
        // Sandboxes auto-stop on their interval. A leaked sandbox is not worth
        // failing the run over.
      }
    }
  }
}
