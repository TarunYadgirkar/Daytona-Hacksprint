# Two-minute demo instructions

## The story

Show one case and one result:

> An AI agent claims checkout now works for a new session. Its fix handles an
> empty array but still crashes when the cart service returns `null`. Popper
> generates an independent attack, runs it against both revisions, and blocks
> the PR even though the static review approves the diff.

Use only `pr-101`. The two-minute demo is not the time to import a GitHub PR or
show all four comparison outcomes.

## What each sponsor contributes

| Sponsor | What Popper uses | Why it matters in the demo | What proves it on screen |
|---|---|---|---|
| **Fireworks AI** | The Kimi K2.6 Turbo priority route extracts one structured claim, generates four distinct adversarial tests, and also powers the chat agent. | It is fast enough for an interactive gate and gives Popper tests designed to falsify a promise, not merely confirm a diff. | **The claim**, generated test names and code, then the CopilotKit response. |
| **Daytona** | One private, ephemeral, network-blocked sandbox receives the before and after modules. It runs every test against both revisions in parallel and is deleted afterward. | Model-generated code never runs on the Popper server. The two executions turn a generated idea into evidence. | Sandbox stage, sandbox ID, and the **Before / After / Verdict** table. |
| **CodeRabbit** | Its independent review is recorded before the demo because the CLI can take many minutes. The cache is timestamped and bound to the exact staged code digest. | It can catch risks outside the PR’s claim. In `pr-101`, its approval creates the useful disagreement with execution evidence. | The right half of the verdict rail, the review timestamp, and its findings. |
| **Braintrust** | Every pipeline stage is a trace span. The final result records claim confidence, test verdicts, sponsor provenance, and scores such as `methods_agree`; a human decision is logged as feedback. | The team can audit one decision and sort many runs to find disagreements worth improving. | The matching trace and its ordered spans, metadata, and scores. |
| **CopilotKit** | The reviewer can ask about the current run through `readGateState` and record a deliberate merge or block through `recordOverride`. The assistant is backed by Fireworks. | Chat stays grounded in the evidence already on screen, and the human remains in control. | The sidebar answer and the recorded human-decision flow. |

Keep one distinction clear throughout: Fireworks proposes a claim and attacks;
Daytona produces execution evidence; CodeRabbit supplies an independent review
opinion. The comparison and recommendation are deterministic pipeline code, not
a chat response.

## One day before

The repository currently documents two blockers: the Fireworks key failed the
latest smoke test with HTTP 401, and the checked-in CodeRabbit entries are
fixtures. Fix both before using the full live script.

1. Refresh the ignored local `.env` values. Never paste or show a key.
2. Authenticate the CodeRabbit CLI, then record the exact case:

   ```bash
   .tools/bin/coderabbit auth login
   npm run record:coderabbit -- pr-101
   ```

3. Run the release checks:

   ```bash
   npm run check:env
   npm run typecheck
   npm run smoke -- pr-101
   ```

4. Do not continue until smoke ends with:

   ```text
   comparison: evidence_only
   decision:   BLOCK
   ```

5. In the UI, confirm the CodeRabbit panel says **Recorded verdict from** with
   a timestamp. If it says **Fixture placeholder**, the review is not a real
   CodeRabbit result.

## Thirty minutes before

1. Use the same browser profile that will be used on stage.
2. Open the deployed app in live mode. Do not set
   `POPPER_GATE_MODE=recorded`.
3. Select `pr-101`, click **Run adversarial gate**, and let one live run finish.
4. Confirm all of the following:

   - the run is labelled **Live capture** in the gallery;
   - the claim includes the missing or `null` cart case;
   - at least one test is `fail` before and `fail` after;
   - the rail says **Disagreement — evidence only**;
   - the recommendation says **Block**;
   - the CodeRabbit source is `cache`, not `fixture`.

5. Leave that live capture in browser storage. It is the timed fallback.
6. Open the matching run in Braintrust in a second tab. Check the ordered stage
   spans and the `methods_agree: 0` score.
7. Ask **Why is this blocked?** once in CopilotKit. Confirm the answer mentions
   the actual null-cart result and does not claim that code was merged.
8. Refresh the Popper tab, select `pr-101`, open **Diff under test**, and stop.
9. Close unrelated tabs and notifications. Keep the Braintrust tab immediately
   beside Popper.

## On stage

- Start the timer only after the diff is visible.
- Speak while the pipeline runs; do not wait silently for a sponsor call.
- At 0:50, if the result table is not visible, load the saved **Live capture**.
  The fallback is part of the plan, not a failure.
- Do not open generated source, stdout, or stderr unless a judge asks. Those
  details are available, but they interrupt the two-minute story.
- Do not record a human override during the timed demo. Showing that CopilotKit
  can record it is enough; the Braintrust trace already proves the audit path.
- End on Braintrust and the next-step sentence. Stop at two minutes.

## Truthfulness rules

- A **Live capture** is a completed sponsor-backed run saved in this browser.
- A **Recorded fixture** is a deterministic simulation. It calls no sponsor
  API, opens no Daytona sandbox, and writes no Braintrust trace.
- A CodeRabbit source of `cache` is a previously completed review of the exact
  staged code. Say that it was recorded ahead of time and point to its
  timestamp.
- A CodeRabbit source of `fixture` is a placeholder. Never call it a
  CodeRabbit review.
- A Daytona infrastructure error means evidence is unavailable. It is not a
  failed test and must not be narrated as proof of a broken claim.

## Recovery

| Problem | Immediate move | What to say |
|---|---|---|
| Fireworks or Daytona is still running at 0:50 | Load the saved **Live capture** for `pr-101`. | “I’m loading the verified live capture so we stay inside two minutes; no sponsor call is being rerun.” |
| No saved live capture exists | Load the bundled `pr-101` recorded fixture. | “This is the deterministic simulated example; the live integration is unavailable right now.” |
| CodeRabbit says **Fixture placeholder** | Continue, but call it staged sample data. | “The independent review is simulated here, so I will not present it as a live or recorded CodeRabbit verdict.” |
| CopilotKit responds slowly | Open the sidebar, explain `readGateState` and `recordOverride`, then move on. | Do not wait or invent its answer. |
| Braintrust will not load | Stay on the completed Popper result and point to the run ID and provenance. | “The audit UI is unavailable, but I will not claim a trace that I cannot show.” |

## Rehearsal target

Run the synchronized script three times:

- first for correct clicks;
- second for a natural speaking pace;
- third with the 0:50 saved-run fallback.

The audience should leave with one sentence: **Popper does not trust an
AI-authored test suite or another model’s confidence; it asks an independent
question, runs it against both revisions, and lets a human decide from the
evidence.**
