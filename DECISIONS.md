# Decisions

Short records of non-obvious calls, so nobody re-litigates them at 3am and nobody has to guess the reasoning on stage.

Format: what we decided, why, and what it costs.

---

## D-001 — SafeShip never merges on its own

**Decided:** The gate produces a recommendation. A human clicks merge or block. `GateDecision.requiresHuman` is typed as the literal `true` so the type system enforces it.

**Why:** An autonomous merge bot built on an LLM's reading of an LLM's code is exactly the failure mode this project is arguing against. It would also be the first thing a judge attacks, and rightly. Keeping the human in the loop is not a limitation to apologise for; it is the position.

**Costs:** Slightly less impressive as an "it does everything" demo. Worth it.

---

## D-002 — Sandbox files are written with `base64 -d` over `executeCommand`

**Decided:** `lib/adapters/daytona.ts` writes files by piping base64 through a shell command rather than using the SDK's filesystem helpers.

**Why:** The filesystem API surface has moved between SDK versions; `executeCommand` has been stable throughout. Base64 also sidesteps shell quoting entirely, which matters because we are writing model-generated code containing arbitrary quotes and backticks.

**Costs:** Slightly less idiomatic, one extra process per file. Both irrelevant at this scale.

---

## D-003 — CodeRabbit verdicts are recorded ahead of time, not fetched live

**Decided:** `CODERABBIT_MODE=cache` is the default. Verdicts are captured by `npm run record:coderabbit` and committed.

**Why:** Two hard constraints. CodeRabbit reviews take minutes to tens of minutes, and free-plan CLI reviews are rate limited to roughly three an hour. Neither is compatible with a demo. There is also no public API for fetching an existing PR review, so live retrieval was never an option.

**Costs:** You must remember to re-record after changing a staged PR. The `recordedAt` field makes stale or placeholder data visible in the UI.

**Presentation note:** Say plainly that the verdict was captured earlier. It is CodeRabbit's real opinion of the real code — only the timing is pre-arranged. Implying a live call would be the one dishonest thing in an otherwise evidence-based pitch, and it is not worth it.

---

## D-004 — The pipeline runs over plain SSE, not as a CopilotKit agent tool

**Decided:** `/api/gate` streams the pipeline directly. CopilotKit owns the chat surface, reads gate state through a frontend tool, and records the human override.

**Why:** If the pipeline were an agent tool, the demo would depend on a model choosing to call a function at the right moment, in front of judges, on venue wifi. CopilotKit is still structurally load-bearing — it is how a human interrogates the run and how the override is recorded — but the deterministic path stays deterministic.

**Costs:** Two surfaces to keep in sync. `readGateState` exists precisely to stop them drifting.

---

## D-005 — A test that passes on both revisions is inconclusive, not a pass

**Decided:** Every adversarial test runs twice, against before and after. The pair is classified, not the individual outcome.

**Why:** This is the difference between evidence and theatre. A test that passes against the old code never exercised the bug, so it tells you nothing about whether the fix works. Reporting it as a green tick would be the same category error the product exists to criticise.

**Costs:** Doubles sandbox execution time. Buys the only thing that makes the results meaningful.

---

## D-006 — Interface copy avoids the word "AI"

**Decided:** The UI says "evidence" and "opinion", "sandbox" and "review", never "AI-powered".

**Why:** Everything on the screen is AI-powered; saying so distinguishes nothing. The interesting claim is about *method* — running code versus reading code — and the copy should carry that distinction instead of the marketing one.

**Costs:** None.

---

## D-007 — "No evidence" is its own outcome, not agreement

**Decided:** Added a fifth `AgreementKind`, `no_evidence`, returned by `compare()` whenever the sandbox reports an `infraError`.

**Why:** Found while testing the decision logic. If Daytona failed and CodeRabbit approved, the old code reported `both_clear` — the rail would have shown two green halves and the word "agreement" when in fact nothing had run. That is precisely the evidence/opinion blur this product exists to name, appearing in our own UI. `decide()` was already blocking correctly on infra failure; only the label was wrong, which is the most dangerous kind of wrong.

**Costs:** One more case for the UI to label. Cheap.
