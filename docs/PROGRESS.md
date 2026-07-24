# Progress

Living status. Update this in the same commit as the work it describes.

**How to use this file:** move items between sections, do not delete them. At 3am the useful question is usually "did we already try that?", and a deleted line cannot answer it.

Last updated: scaffold complete. Decision logic and sandbox file-write verified locally; no live API calls made yet.

---

## Now

Nobody assigned yet. Claim an item by putting your name on it.

| # | Item | Owner | Notes |
|---|------|-------|-------|
| 1 | Get keys for all five sponsors, run `npm run check:env` | | Blocks everything. Do this first. |
| 2 | First live Fireworks call — confirm model ID and JSON mode | | Model IDs change; verify against fireworks.ai/models |
| 3 | First live Daytona sandbox — confirm `executeCommand` shape | | See D-002 for why we avoid the filesystem API |
| 4 | `npm run smoke -- pr-101` end to end | | The moment the project is real |
| 5 | Install + auth CodeRabbit CLI, record verdicts | | Slow. Start it early, do other work while it runs. |

## Done

- [x] Repo scaffold, folder structure, TypeScript config
- [x] Type system and SSE event contract (`lib/types.ts`, `lib/events.ts`)
- [x] Four sponsor adapters written (untested against live APIs)
- [x] Pipeline orchestrator with compare/decide logic
- [x] Four staged PRs covering all four agreement quadrants
- [x] SSE gate route, override route, CopilotKit v2 runtime route
- [x] Live pipeline UI with the verdict rail
- [x] Preflight, smoke test, and CodeRabbit recorder scripts
- [x] Verified `compare()`/`decide()` against all four quadrants plus infra-failure and inconclusive-only edge cases
- [x] Verified the base64 sandbox file-write round-trips byte-identically with backticks, quotes and `$` in generated code
- [x] Added `no_evidence` agreement kind (see D-007) — infra failure was mislabelled as agreement
- [x] Restored nested layout after a flat export flattened every file into root (imports now resolve)
- [x] Fixed sandbox `stderr` diagnostics to come from the side that errored, not always `before` (`lib/adapters/daytona.ts`)
- [x] CodeRabbit adapter falls back to the `cr` alias when `coderabbit` is not on PATH (`CODERABBIT_BIN` overrides)
- [x] Installed deps and CodeRabbit CLI v0.7.0; keys pending

## Next

- [ ] Tune the adversarial test prompt if generated tests come back weak or confirmatory
- [ ] Handle the case where Fireworks returns fewer than the requested number of tests
- [ ] Sandbox reuse across tests in one run (currently one sandbox per run, which is fine, but if creation is slow this is the lever)
- [ ] A "replay last run" button so a failed live demo can fall back instantly
- [ ] Braintrust dashboard view sorted by `methods_agree` ascending — that view IS the stage moment

## Blocked

Nothing yet.

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
