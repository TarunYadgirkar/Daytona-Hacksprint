# Progress

Living status. Update this in the same commit as the work it describes.

**How to use this file:** move items between sections, do not delete them. At 3am the useful question is usually "did we already try that?", and a deleted line cannot answer it.

Last updated: 2026-07-24. Full pipeline was verified live at `0bd3520`: `smoke -- pr-101`
returned `evidence_only` + `BLOCK` against Fireworks `kimi-k2p6` and Daytona. The current
hardening pass adds explicit execution, protected access, a four-outcome recorded-run library,
failure recovery, evidence inspection, deterministic recorded-mode streaming, and browser CI.
Current changes pass typecheck and a production build; the remaining validation is tracked below.

---

## Now

Lanes assigned in AGENTS.md (A = pipeline/adapters, B = UI/app). Put your name next to what you pick up.

| # | Item | Owner | Notes |
|---|------|-------|-------|
| 1 | Re-run `npm run smoke -- pr-101` after Lane A changes | Codex | Approval service currently rejects the required elevated `tsx` execution. |
| 2 | Run recorded-mode Playwright suite at 390px, 768px, and desktop | Codex | Test/config committed; local Playwright install is blocked by package-registry access. GitHub Actions installs it without changing the lockfile. |
| 3 | Authenticate CodeRabbit CLI and record verdicts | Operator | CLI 0.7.0 is installed in `.tools/`; browser OAuth requires operator interaction. |
| 4 | Configure Vercel Deployment Protection and production demo code | Operator | Dashboard action: Vercel Authentication + Standard Protection; set `SAFESHIP_DEMO_ACCESS_CODE` for Production and Preview. |

## Done

- [x] Repo scaffold, folder structure, TypeScript config
- [x] Type system and SSE event contract (`lib/types.ts`, `lib/events.ts`)
- [x] Four sponsor adapters written; Fireworks and Daytona live-verified at `0bd3520`, CodeRabbit capture pending
- [x] Pipeline orchestrator with compare/decide logic
- [x] Four staged PRs covering all four agreement quadrants
- [x] SSE gate route, override route, CopilotKit v2 runtime route
- [x] Live pipeline UI with the verdict rail
- [x] Preflight, smoke test, and CodeRabbit recorder scripts
- [x] Verified `compare()`/`decide()` against all four quadrants plus infra-failure and inconclusive-only edge cases
- [x] Verified the base64 sandbox file-write round-trips byte-identically with backticks, quotes and `$` in generated code
- [x] Added `no_evidence` agreement kind (see D-007) — infra failure was mislabelled as agreement
- [x] Restored the documented `app/`, `components/`, `lib/`, `scripts/`, and `docs/` structure
- [x] Added `/api/override` and the CopilotKit v2 catch-all runtime endpoint
- [x] Added `.env.example`, `.gitignore`, `next-env.d.ts`, dependencies, and `package-lock.json`
- [x] Standalone scripts now load `.env` through `dotenv`
- [x] `npm run typecheck` and `npm run build` pass
- [x] CopilotKit `/api/copilotkit/info` returns the registered default agent
- [x] Placeholder reviews are typed and labelled as `fixture`, never as recorded CodeRabbit cache
- [x] CodeRabbit recorder fails fast when unauthenticated and preserves the existing cache
- [x] Working Fireworks and Daytona keys configured; live `pr-101` smoke verified at `0bd3520`
- [x] Fireworks model refreshed to live `accounts/fireworks/models/kimi-k2p6`
- [x] Braintrust summary and override writes moved into traced spans
- [x] Handle Fireworks returning fewer than the requested number of tests — retry missing,
  reject malformed/duplicate drafts, and abort before sandbox execution if the suite stays partial
- [x] A "replay last run" button so a failed live demo can fall back instantly — completed
  `GateResult` snapshots are versioned, validated, and restored without recomputing a verdict
- [x] Incomplete execution can no longer recommend merge — empty, inconclusive-only, errored-only,
  and partially errored positive suites are labelled `no_evidence` and block
- [x] CodeRabbit `review_skipped` output fails recording instead of becoming an empty approval
- [x] Human overrides only display as recorded after a successful API response; button and chat
  use the same failure-aware request path
- [x] Verdict rail renders unavailable evidence and fixture opinions distinctly from green signals
- [x] CopilotKit setup and preflight now reflect its Fireworks-backed runtime; no OpenAI key required
- [x] Selecting a PR only previews it; an explicit run button shows cost/duration context before paid calls
- [x] Gate APIs accept only staged IDs, request exactly four tests, enforce signed demo access,
  and apply a best-effort five-runs-per-ten-minutes server quota
- [x] Vercel production fails closed when `SAFESHIP_DEMO_ACCESS_CODE` is missing
- [x] Preflight reports gate mode and requires the demo access code in deployed environments
- [x] Persistent run failures expose retry, recorded fallback, connection state, stage timeout,
  copyable run ID, sponsor provenance, and never leave a closed stream marked running
- [x] Recorded-run gallery includes `evidence_only`, `opinion_only`, `both_caught`, and
  `both_clear`, with capture time, origin, opinion provenance, evidence availability, and run ID
- [x] Evidence UI exposes generated code, separate stdout/stderr, verdict explanations, summary
  counts, an above-the-fold human decision, report copying, responsive overflow, and live regions
- [x] Recorded test mode streams the production SSE contract without sponsor calls
- [x] Playwright coverage and GitHub Actions workflow added for interaction, integrity, replay,
  unavailable evidence, provisional CodeRabbit provenance, and responsive layouts
- [x] Protected Vercel deployment checklist added in `docs/DEPLOYMENT.md`

## Next

- [ ] Tune the adversarial test prompt if generated tests come back weak or confirmatory
- [ ] Sandbox reuse across tests in one run (currently one sandbox per run, which is fine, but if creation is slow this is the lever)
- [ ] Braintrust dashboard view sorted by `methods_agree` ascending — that view IS the stage moment

## Blocked

- Current agent-side `tsx` and local-server verification: the execution approval service rejects
  escalations with an internal schema error. Run smoke/tests/browser checks from a normal terminal.
- Local Playwright dependency install: the package registry is unavailable in the managed
  sandbox. CI installs `@playwright/test@1.61.1` without mutating `package-lock.json`; when network
  access is available, add it as a normal dev dependency and commit the refreshed lockfile.
- Real CodeRabbit cache capture: local CLI is installed but `coderabbit auth status --agent`
  reports `not_authenticated`, and no `CODERABBIT_API_KEY` is configured. Run
  `.tools/bin/coderabbit auth login`, then `npm run record:coderabbit`, from a normal terminal.

## Rejected

Keep failed approaches here so nobody retries them.

- **Live GitHub webhook ingestion.** Too much setup risk mid-hack for zero demo value. Staged PRs instead. Revisit only if everything else is finished and stable.
- **Running the pipeline as a CopilotKit agent tool.** The demo would then depend on an LLM choosing to call a function at the right moment in front of judges. The pipeline runs over plain SSE; CopilotKit drives chat, state reads, and the override. See D-004.

## Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Daytona sandbox creation slow or flaky on demo wifi | medium | Pre-warm one sandbox before presenting; have a recorded run ready |
| Fireworks returns unparseable JSON | medium | `parseJSON` already recovers from fences and prose; if it still fails, drop temperature |
| Generated tests are confirmatory, not adversarial | medium | The prompt is the lever. Check `pr-101` actually gets broken before trusting the demo. |
| CodeRabbit CLI rate limit hit while recording | high | Record early, record once, commit the cache |
| Venue wifi | high | Everything except Daytona can be shown from a recorded Braintrust trace |
| Public production link triggers paid runs | medium | App access code fails closed on Vercel production; explicit run button, staged-ID allowlist, fixed count, and quota add defense in depth |
| Transitive dependency advisories | medium | `npm audit --omit=dev` reports 15 advisories, including 6 high. Current automatic fixes propose incompatible downgrades or have no upstream fix; reassess sponsor SDK updates before production use. |
