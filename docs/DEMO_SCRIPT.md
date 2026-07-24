# Two-minute demo script

This is written for a calm speaking pace of about 145 words per minute. The
operator action and narration happen at the same time. Rehearse the clicks until
they do not interrupt the story.

Before the clock starts, have `pr-101` selected, open **Diff under test**, and
leave the page at the top of the case. Keep a verified saved **Live capture** in
the recorded-runs gallery and the matching Braintrust trace open in a second
tab. See [`DEMO_INSTRUCTIONS.md`](./DEMO_INSTRUCTIONS.md) for setup and
truthfulness checks.

| Time | Operator action | Say |
|---|---|---|
| 0:00–0:14 | Point to the PR description, then the `items.length` guard in the after code. | “An AI agent says this PR fixes checkout for a new session. The diff adds an empty-cart guard, and it looks reasonable. Popper asks a different question: can we break the promise?” |
| 0:14–0:37 | Click **Run adversarial gate**. Point to **The claim** as it appears, then to the generated attacks in the pipeline. | “Fireworks, using its fast Kimi K2.6 Turbo priority route, turns the description into one falsifiable claim and writes four attacks. Claim extraction can be wrong, but it only aims the tests. We show low confidence, and a bad aim produces inconclusive tests. The model’s reading never decides the verdict.” |
| 0:37–1:05 | Point to the Daytona sandbox stage and the **Before** and **After** columns. If results are not visible by 0:50, silently click **Abort live run and load** on the saved **Live capture** for `pr-101`. | “Daytona runs that generated code in a private, network-blocked, disposable sandbox—not on our server. Every test runs against both revisions. Here, `null` fails before and still fails after, so the claim is broken. This is different from CI: CI runs the author’s tests against only the new code, inheriting the same blind spots. We independently attack the claim, and the before-and-after pair proves the test exercised the promised change.” |
| 1:05–1:30 | Point to the split verdict rail: **Execution evidence** on the left and **CodeRabbit opinion** on the right. End on **Block**. | “You should use CodeRabbit, so we do. Its timestamped review of this exact diff approved the guard. CodeRabbit can execute code to sharpen its review, but it is not built to answer our claim-specific before-and-after question. That disagreement—review approves, execution disproves—is why Popper recommends block.” |
| 1:30–1:47 | Open the CopilotKit sidebar. Enter **Why is this blocked?** if there is time, but do not wait for the response. | “CopilotKit lets the reviewer question the run. Its assistant reads the exact gate state before answering, and it can record—but never make—the human decision. We also reuse Fireworks to power this chat.” |
| 1:47–2:00 | Switch to the matching Braintrust trace. Point to the ordered spans and the disagreement score. | “Braintrust traces every stage, scores disagreements, and records the human choice, so the decision is auditable. We never auto-merge. With more time, we would support multi-file PRs and use these traces and overrides to make the attacks stronger.” |

## If the saved run appears

Do not hide the replay banner. Add this one sentence while loading it, then
resume the same script:

> “I’m loading the verified live capture so we stay inside two minutes; no
> sponsor call is being rerun.”

If the only fallback says **Recorded fixture** or **Fixture placeholder**, say
“simulated example” instead of “verified live capture,” and do not describe its
CodeRabbit result as a real review.
