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

---

## D-008 — Placeholder reviews have fixture provenance

**Decided:** CodeRabbit placeholders use `source: "fixture"`. Only CLI output or a recorded cache
entry may use `source: "cli"` or `source: "cache"`, and both require a `recordedAt` timestamp.

**Why:** Adding the current time to hand-written placeholder findings would make them look like a
review that actually ran. That would be the opinion-side equivalent of calling an unexecuted test
evidence. The UI, SSE log, and types now preserve the distinction until the recorder replaces the
fixtures with authenticated CodeRabbit output.

**Costs:** A fresh checkout cannot honestly demonstrate the CodeRabbit comparison until someone
authenticates the CLI and runs `npm run record:coderabbit`. That was already operationally true;
now the product says so.

---

## D-009 — A partial generated suite never reaches the sandbox

**Decided:** Test generation accepts only distinct drafts with a non-empty adversarial hypothesis
and an explicit `require('./target.js')`. If Fireworks returns fewer than requested, SafeShip asks
for only the missing attacks, up to three attempts. It then aborts the `tests` stage rather than
executing a partial suite.

**Why:** Quietly running two tests when the gate requested four makes reduced model output look
like complete verification. That is an evidence-availability failure, not a smaller success.
Duplicate model answers are likewise one attack, not multiple independent tests.

**Costs:** A weak model response can stop a run before Daytona instead of producing a low-coverage
decision. The saved-run replay is the demo fallback for that failure.

---

## D-010 — Replay renders a completed result; it never reruns the gate

**Decided:** The browser stores the last completed `GateResult` in a versioned, runtime-validated
local snapshot. “Replay saved run” restores that already-computed claim, evidence, opinion,
agreement, and decision, and labels the screen as replayed.

**Why:** A venue-wifi fallback must be instant and must show exactly what the pipeline and
Braintrust previously produced. Recomputing agreement in React or silently mixing saved and live
state would violate the single-source-of-truth rule.

**Costs:** Replay is browser-local and only exists after that browser has completed a run. Clearing
site storage removes it, so the demo checklist must include creating the saved run beforehand.

---

## D-011 — Incomplete positive evidence blocks; a counterexample remains decisive

**Decided:** Empty, inconclusive-only, errored-only, and partially errored suites cannot support a
merge recommendation. They produce `no_evidence` and block. A real `claim_broken` result remains
decisive even if another generated harness errored.

**Why:** A counterexample needs only one successful execution to falsify a claim. Supporting a
claim is asymmetric: SafeShip must complete the requested suite and obtain at least one test that
fails before and passes after. Treating “nothing broke” as proof would recreate the exact
evidence/opinion error the product criticises.

**Costs:** One malformed generated harness can block an otherwise promising change. That is a
deliberate safe default; the human can inspect the successful evidence and override.

---

## D-012 — A skipped static review is unavailable, not approval

**Decided:** CodeRabbit `review_skipped` events fail the review attempt and are never converted
into an empty `approve` verdict or recorded cache entry.

**Why:** Zero findings after a completed review can mean approval. Zero findings because no review
ran means no opinion exists. Those states must remain distinct for the comparison to be honest.

**Costs:** Rate limits and unsupported repositories now stop cache recording instead of producing
a convenient green signal.
