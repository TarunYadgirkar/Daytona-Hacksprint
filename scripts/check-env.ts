/**
 * Preflight. Run this before you touch anything else, and again 30 minutes
 * before you present.
 *
 *     npx tsx scripts/check-env.ts
 */

import "dotenv/config";

interface Check {
  name: string;
  key: string;
  required: boolean;
  note: string;
}

const deployed =
  process.env.NODE_ENV === "production" ||
  process.env.VERCEL_ENV === "production" ||
  process.env.VERCEL_ENV === "preview";

const CHECKS: Check[] = [
  { name: "Fireworks", key: "FIREWORKS_API_KEY", required: true, note: "claim extraction + test generation" },
  { name: "Daytona", key: "DAYTONA_API_KEY", required: true, note: "sandbox execution — no key means no evidence" },
  { name: "Braintrust", key: "BRAINTRUST_API_KEY", required: false, note: "logging no-ops silently without this" },
  { name: "CodeRabbit", key: "CODERABBIT_API_KEY", required: false, note: "only needed for CODERABBIT_MODE=cli" },
  {
    name: "Demo access",
    key: "SAFESHIP_DEMO_ACCESS_CODE",
    required: deployed,
    note: deployed ? "required for deployed API routes" : "set before deploying",
  },
];

let fatal = false;

console.log("\nSafeShip preflight\n");

for (const check of CHECKS) {
  const present = Boolean(process.env[check.key]);
  const mark = present ? "ok  " : check.required ? "FAIL" : "warn";
  if (!present && check.required) fatal = true;
  console.log(`  [${mark}] ${check.name.padEnd(18)} ${check.key.padEnd(22)} ${check.note}`);
}

const mode = process.env.CODERABBIT_MODE ?? "cache";
console.log(`\n  CodeRabbit mode: ${mode}`);
if (mode === "cli") {
  console.log("  WARNING: live CLI mode. Reviews take 8-30 minutes and free plans are");
  console.log("           limited to roughly 3 per hour. Do not demo in this mode.");
} else {
  console.log("  Reading recorded verdicts. Run 'npm run record:coderabbit' to refresh them.");
}

const gateMode = process.env.SAFESHIP_GATE_MODE ?? "live";
console.log(`\n  Gate mode: ${gateMode}`);
if (gateMode === "recorded") {
  console.log("  WARNING: fixture events only. No Fireworks, Daytona, CodeRabbit, or Braintrust work will run.");
}

console.log(`\n  Fireworks model: ${process.env.FIREWORKS_MODEL ?? "(default)"}`);
console.log("  Verify this ID against fireworks.ai/models — the catalog changes.\n");

if (fatal) {
  console.error("Missing required keys. Copy .env.example to .env and fill them in.\n");
  process.exit(1);
}
console.log("Preflight passed.\n");
