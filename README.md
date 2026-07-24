# SafeShip

**Adversarial PR verification gate.** Most AI code review tools ask *does this diff look right?* SafeShip asks *can I break the claim this PR makes?*

An AI agent opens a pull request that says it fixes a null pointer on an empty cart. SafeShip extracts that specific behavioural claim, generates tests designed to falsify it, and runs them against both the before and after code in an isolated sandbox. The result is real pass/fail evidence rather than a second model's read of the diff.

It then pulls CodeRabbit's independent static review of the same change and compares. **The interesting output is where the two methods disagree** — where running the code and reading the code reach different conclusions.

Every gate decision is logged. Nothing merges without a human.

## The distinction

| | Method | Produces |
|---|---|---|
| Sandbox | runs the code | **evidence** |
| Static review | reads the code | **opinion** |

When they collide on the merge decision, the fact wins. But the judgement still gets shown — a reviewer flagging something the tests never targeted is exactly when a human should look.

## How a test becomes evidence

Every adversarial test runs twice. The pair is what carries meaning:

| Before | After | Verdict | Meaning |
|---|---|---|---|
| fail | pass | `claim_upheld` | the fix works |
| fail | fail | `claim_broken` | the PR's claim is false |
| pass | pass | `test_inconclusive` | never exercised the bug — proves nothing |
| any error | | `test_errored` | harness problem, not a verdict |

A test that passes against the old code is not a green tick. Reporting it as one would be the same error this product exists to criticise.

## Stack

| Sponsor | Role |
|---|---|
| **Fireworks AI** | hosts the model that extracts the claim and writes the adversarial tests |
| **Daytona** | isolated sandbox where before/after code and tests actually execute |
| **CodeRabbit** | the independent static review compared against sandbox evidence |
| **Braintrust** | logs every gate decision as a trace you can open and audit |
| **CopilotKit** | renders the live pipeline, exposes gate state to chat, records the human override |

Next.js 15 App Router · React 19 · TypeScript.

## Quick start

```bash
npm install
cp .env.example .env      # fill in the keys
npm run check:env         # preflight
npm run dev               # http://localhost:3000
```

Select a PR to preview its before/after diff. Nothing calls Fireworks or
Daytona until you explicitly press **Run adversarial gate**.

Verify the core logic without a browser:

```bash
npm test
npm run typecheck
npm run smoke -- pr-101
```

For deterministic UI development, set `SAFESHIP_GATE_MODE=recorded`. The gate
route then streams the same SSE contract from validated fixtures and calls no
sponsor APIs. Browser coverage lives in `e2e/` and runs with `npm run test:e2e`
after Playwright is installed.

## Safe demo access

Live gates are deliberately bounded:

- Only the four staged PR IDs are accepted.
- Every live run requests exactly four tests.
- A server-side quota allows five live runs per session in ten minutes.
- `SAFESHIP_DEMO_ACCESS_CODE` creates a signed, HTTP-only demo session.
- Vercel production fails closed if that access code is missing.

The recorded-runs gallery contains all four comparison outcomes and never
consumes Fireworks, Daytona, CodeRabbit, or Braintrust capacity.

## The staged PRs

Rather than wiring a live GitHub webhook, four PRs with real bugs are staged in `lib/fixtures/prs.ts`, one for each quadrant of the agreement matrix:

| PR | Outcome | What it shows |
|---|---|---|
| `pr-101` | disagreement — evidence only | sandbox breaks the claim, CodeRabbit approves |
| `pr-102` | agreement — both clear | a genuinely correct fix; the gate does not cry wolf |
| `pr-103` | disagreement — opinion only | CodeRabbit catches a risk the claim never mentioned |
| `pr-104` | agreement — both caught | obvious bug, both methods flag it |

## CodeRabbit verdicts are recorded, not live

CodeRabbit reviews take minutes to tens of minutes, free-plan CLI reviews are rate limited, and there is no public API for fetching an existing PR review. So verdicts are captured ahead of time and read back at run time:

```bash
npm run record:coderabbit          # all four, slow — start it and go do something else
npm run record:coderabbit -- pr-101
```

Fresh checkouts contain clearly labelled `fixture` reviews so the UI can be developed before
CodeRabbit is authenticated. Fixtures are not CodeRabbit output and are never relabelled as a
recorded cache entry. A demo-ready `cache` review always has a `recordedAt` timestamp produced by
the recorder.

The verdict is CodeRabbit's real opinion of the real code; only the timing is pre-arranged. The UI shows the capture timestamp, and you should say so when presenting. Set `CODERABBIT_MODE=cli` to go live in development — never in a demo.

## Docs

- `AGENTS.md` — instructions for coding agents, including external API gotchas that cost real time to discover
- `CLAUDE.md` — Claude Code entry point, imports `AGENTS.md`
- `docs/PROGRESS.md` — living status, blockers, and rejected approaches
- `docs/DECISIONS.md` — why the non-obvious calls were made
- `docs/DEMO_SCRIPT.md` — the three-minute run, and answers to the questions you will get
- `docs/DEPLOYMENT.md` — protected Vercel deployment and release checklist

## What this deliberately does not do

It does not merge anything. `GateDecision.requiresHuman` is typed as the literal `true`, so the type system enforces it. An autonomous merge bot judging an agent's code on another model's opinion is the problem this project is pointing at, not a feature to add later.
