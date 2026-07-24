# Demo script

Three minutes. The audience does not need the architecture; they need one moment where two respected methods disagree and only one of them can prove it.

---

## Before you walk up

- [ ] `npm run check:env` passes
- [ ] `npm run smoke -- pr-101` produces `evidence_only` and `BLOCK`
- [ ] CodeRabbit cache re-recorded, `recordedAt` visible in the UI
- [ ] Braintrust project open in a second tab, sorted by `methods_agree` ascending
- [ ] One sandbox already created once today, so the first call is warm
- [ ] A completed `pr-101` saved in the browser; verify “Replay saved run” restores it

## The run

**Open on the problem, not the product.** "An agent opened this PR. It says it fixes a checkout crash on an empty cart. Every review tool we have will now read that diff and tell us whether it looks right." Pause on the diff. The guard clause looks correct, and it is — for the case it handles.

**Say what SafeShip does differently.** "We don't ask whether it looks right. We extract the promise the PR is making, and then we try to break it."

**Run `pr-101`.** Let the claim appear. Read it aloud — it is one falsifiable sentence, which is the point. Let the tests generate and stream into the sandbox.

**Stop on the table.** Point at the before/after columns. "This test fails on the old code and still fails on the new code. The PR's own description says new sessions get `null` from the cart service. The fix only handles the empty array."

**Then the rail splits.** This is the moment. "CodeRabbit approved this change. It is a good tool and it read the diff correctly — the guard clause *is* correct. But reading and running are different, and only one of them found this."

**Land it.** "So SafeShip blocks. Every step of that is logged" — switch to Braintrust — "and a human still makes the call." Click block, type the reason, show it land.

## If you have another minute

Run `pr-103`. CodeRabbit blocks it for prototype pollution and every adversarial test passes. "The tests targeted the claim, and the claim was about merging, which works. This is a risk the claim never mentioned. Neither method dominates — that is why we show both."

That second case is what separates this from a tool that just argues with CodeRabbit, and it is worth the minute if you have it.

## Questions you will get

**"Isn't this just tests?"** Tests written by the same agent that wrote the code inherit its blind spots. These are generated against the *claim*, adversarially, and scored on whether they fail before and pass after — which is what makes them evidence rather than decoration.

**"What if the model writes bad tests?"** Then they come back inconclusive and we show that, rather than counting them as passes. Look at the `test_inconclusive` tag — we grade our own evidence.

**"Why CodeRabbit if you're beating it?"** We are not. `pr-103` is the case where CodeRabbit catches something we structurally cannot. The product is the disagreement, not the winner.

**"Is the CodeRabbit review live?"** No, and say so without flinching: reviews take minutes, so verdicts are recorded ahead of time. It is CodeRabbit's real opinion of this exact code. The timestamp is on screen.

**"Would you let this merge automatically?"** No. That is the one thing we deliberately did not build. An autonomous merge bot judging an agent's code on another model's opinion is the problem, not the product.

## If something breaks

- Sandbox slow or failing → the gate blocks on missing evidence by design; say that, then click “Replay saved run”.
- Fireworks returns garbage → SafeShip retries missing tests. If generation still stops, click “Replay saved run”.
- Wifi gone → use “Replay saved run”; the validated snapshot does not call the model, sandbox, or review CLI.

Do not debug on stage. Narrate the fallback and keep moving.
