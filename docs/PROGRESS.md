# Progress

Living status. Update this in the same commit as the work it describes.

**How to use this file:** move items between sections, do not delete them. At 3am the useful question is usually "did we already try that?", and a deleted line cannot answer it.

Last updated: 2026-07-24. Full pipeline was verified live at `0bd3520`: `smoke -- pr-101`
returned `evidence_only` + `BLOCK` against Fireworks `kimi-k2p6` and Daytona. That result predates
the integration described below; no live post-merge verification is claimed here.

---

## Current state

The merged baseline combines the demo work — explicit execution, public access,
four-outcome recorded runs, stream-failure recovery, evidence inspection, and recorded-mode
Playwright coverage — with the hardening work — content-bound CodeRabbit provenance,
`no_opinion` handling, constrained Daytona sandboxes, pinned Node/npm, strict linting, and
least-privilege CI. Deterministic post-merge checks belong to this integration task; live smoke is
deferred to the final task.

Outstanding operator work:

- Restore the live `.env` configuration before the final `npm run smoke -- pr-101`.
- Authenticate CodeRabbit CLI and refresh the recorded cache.
- Keep the public production URL available for judges.

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
- [x] Gate APIs accept only staged IDs, request exactly four tests, and apply a best-effort
  five-runs-per-ten-minutes per-client server quota
- [x] Vercel production opens the control room without an application access code
- [x] Preflight reports gate mode and sponsor configuration without requiring demo credentials
- [x] Persistent run failures expose retry, recorded fallback, connection state, stage timeout,
  copyable run ID, sponsor provenance, and never leave a closed stream marked running
- [x] Recorded cases can interrupt an active live stream; focused Playwright coverage confirms
  the EventSource closes before the completed record replaces live state
- [x] Recorded-run gallery includes `evidence_only`, `opinion_only`, `both_caught`, and
  `both_clear`, with capture time, origin, opinion provenance, evidence availability, and run ID
- [x] Evidence UI exposes generated code, separate stdout/stderr, verdict explanations, summary
  counts, an above-the-fold human decision, report copying, responsive overflow, and live regions
- [x] Recorded test mode streams the production SSE contract without sponsor calls
- [x] Playwright coverage and GitHub Actions workflow added for interaction, integrity, replay,
  unavailable evidence, provisional CodeRabbit provenance, and responsive layouts
- [x] Recorded-mode Playwright coverage exists for 390px, 768px, and desktop, and Copilot chat
  starts closed so it cannot cover mobile evidence; CI uses a temporary pinned install until the
  browser-test dependency is committed separately
- [x] Fixed mobile intrinsic-width overflow from reordered diff panels; browser assertions now
  identify the overflowing elements if page-level horizontal scroll regresses
- [x] Verified `/api/copilotkit/info` returns the registered `BuiltInAgent`; browser coverage opens
  the opt-in chat and rejects runtime connection errors; the client explicitly uses REST transport
- [x] Node/npm are pinned, strict lint and CI checks are defined, all repository test files are
  discovered, and CI retains recorded-mode Playwright
- [x] CodeRabbit provenance fails closed: CLI reviews run on the selected staged diff, malformed
  or incomplete output propagates, cache entries are content-bound, and fixture opinions block
- [x] Daytona sandboxes are private, ephemeral, network-blocked, TTL-bounded, command-bounded,
  and retain automatic deletion if explicit cleanup fails
- [x] Public Vercel deployment checklist added in `docs/DEPLOYMENT.md`
- [x] Forensic control-room frontend added with request-time nonce rendering, explicit sponsor
  roles, staged case files, visible pipeline states, split evidence/opinion rail, and human gate
- [x] Responsive and accessibility coverage added for locked, idle, active, completed, error,
  keyboard, reduced-motion, recorded fallback, and four comparison quadrants
- [x] Final frontend deterministic gate passed: environment preflight, zero-warning lint, strict
  typecheck, all 42 current unit/configuration tests, and a dynamic production build
- [x] Product renamed to Popper across tracked source, UI, metadata,
  prompts, tests, docs, storage keys, and sponsor defaults
- [x] Application access-code boundary removed for the public hackathon demo while retaining
  staged-case allowlisting, fixed test counts, and a per-client live-run quota
- [x] Optional public GitHub PR importer added alongside all four staged cases, with a dedicated
  standalone JavaScript demo repository and pull request
- [x] Fast sponsor path verified: Fireworks Kimi K2.6 Turbo with Priority returned successfully,
  and a four-test Daytona `daytona-large` suite completed in 1.95 seconds before clean deletion
- [x] Fireworks structured output uses enforced JSON Schema with reasoning disabled; the live
  claim-and-four-test generation path completed in 11.2 seconds
- [x] CodeRabbit Pro Plus reviewed the public demo PR; its timestamped major null-cart finding
  is digest-bound to both the staged and imported copies for instant demo playback

## Next

- [ ] Tune the adversarial test prompt if generated tests come back weak or confirmatory
- [ ] Sandbox reuse across tests in one run (currently one sandbox per run, which is fine, but if creation is slow this is the lever)
- [ ] Braintrust dashboard view sorted by `methods_agree` ascending — that view IS the stage moment

## Blocked

- Live pipeline re-verification: `.env` currently has recorded mode enabled and no Fireworks or
  Daytona keys, so `npm run check:env` correctly fails before a paid run can start.
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
| Public production link triggers paid runs | medium | Explicit run button, staged-ID allowlist, fixed count, and per-client quota bound hackathon usage |
| Transitive dependency advisories | medium | `npm audit --omit=dev` reports 15 advisories, including 6 high. Current automatic fixes propose incompatible downgrades or have no upstream fix; reassess sponsor SDK updates before production use. |
