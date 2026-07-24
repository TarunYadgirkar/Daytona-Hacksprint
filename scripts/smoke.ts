/**
 * End-to-end smoke test with no browser and no UI.
 *
 *     npx tsx scripts/smoke.ts pr-101
 *
 * Run this after any change to the pipeline, and once immediately before you
 * present. It exercises Fireworks, Daytona, CodeRabbit and Braintrust in the
 * same order the demo does, and prints the same verdicts the screen will show.
 */

import "dotenv/config";
import { STAGED_PRS, getPR } from "../lib/fixtures/prs";
import { runGate } from "../lib/pipeline";
import type { GateEvent } from "../lib/events";

async function main() {
  const id = process.argv[2] ?? "pr-101";
  const pr = getPR(id);
  if (!pr) {
    console.error(`Unknown PR "${id}". Known: ${STAGED_PRS.map((p) => p.id).join(", ")}`);
    process.exit(1);
  }

  console.log(`\nGate: ${pr.id} — ${pr.title}\n`);

  const emit = (e: GateEvent) => {
    switch (e.type) {
      case "stage_start":
        process.stdout.write(`  ${e.stage} … `);
        break;
      case "stage_done":
        process.stdout.write("done\n");
        break;
      case "log":
        process.stdout.write(`\n    ${e.message}\n  ${e.stage} … `);
        break;
      case "claim_ready":
        console.log(`\n    claim: "${e.claim.statement}" (confidence ${e.claim.confidence})`);
        break;
      case "test_result":
        console.log(`\n    ${e.result.testId} ${e.result.before}/${e.result.after} → ${e.result.verdict}`);
        break;
      case "stage_error":
        console.log(`\n    ERROR in ${e.stage}: ${e.message}`);
        break;
    }
  };

  const result = await runGate({ pr, emit });

  console.log("\n" + "-".repeat(64));
  console.log(`Agreement : ${result.agreement.kind} (agree=${result.agreement.agree})`);
  console.log(`CodeRabbit: ${result.codeRabbit.verdict} via ${result.codeRabbit.source}`);
  console.log(`Decision  : ${result.decision.call.toUpperCase()}`);
  console.log(`Rationale : ${result.decision.rationale}`);
  console.log("-".repeat(64) + "\n");

  if (pr.demoNote) console.log(`Expected, per fixtures: ${pr.demoNote}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
