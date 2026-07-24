# Popper

**Adversarial PR verification gate.** Most AI code review tools ask *does this diff look right?* Popper asks *can I break the claim this PR makes?*

[Open the live demo](https://daytona-hacksprint.vercel.app) · [Try the public demo PR](https://github.com/TarunYadgirkar/popper-demo-cart/pull/1)

An AI agent opens a pull request that says it fixes a null pointer on an empty cart. Popper extracts that specific behavioural claim, generates tests designed to falsify it, and runs them against both the before and after code in an isolated sandbox. The result is real pass/fail evidence rather than a second model's read of the diff.

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
| **Fireworks AI** | Kimi K2.6 Turbo + Priority extracts the claim and writes structured adversarial tests |
| **Daytona** | `daytona-large` sandbox executes every before/after test pair concurrently |
| **CodeRabbit** | recorded Pro Plus review of the same public PR, bound to the exact code digest |
| **Braintrust** | logs every gate decision as a trace you can open and audit |
| **CopilotKit** | operator assistant reads live gate state and supports the human decision |

Next.js 15 App Router · React 19 · TypeScript.

## Live demo

1. Open [daytona-hacksprint.vercel.app](https://daytona-hacksprint.vercel.app).
2. Select `pr-101`, or paste `https://github.com/TarunYadgirkar/popper-demo-cart/pull/1`.
3. Press **Run adversarial gate**.

The verified production run completes all six stages in about 13 seconds. Four
generated tests execute in Daytona, CodeRabbit's timestamped review is loaded,
and the null-cart bug finishes as `both_caught` with a `block` recommendation.
No access code is required and Popper never merges the PR.

## Quick start

```bash
nvm use
npm install
cp .env.example .env      # fill in the keys
npm run check:env         # preflight
npm run dev               # http://localhost:3000
```

Select a PR to preview its before/after diff. Nothing calls Fireworks or
Daytona until you explicitly press **Run adversarial gate**.

Verify the core logic without a browser:

```bash
npm run verify
npm run test:e2e
npm run smoke -- pr-101
```

For deterministic UI development, set `POPPER_GATE_MODE=recorded`. The gate
route then streams the same SSE contract from validated fixtures and calls no
sponsor APIs. Browser coverage lives in `e2e/` and runs with `npm run test:e2e`
after Playwright is installed.

## Public demo safety

Live gates are deliberately bounded:

- Only the four staged cases or validated public GitHub PR imports are accepted.
- Every live run requests exactly four tests.
- A server-side quota allows five live runs per client in ten minutes.
- The control room and API are public; no application access code is required.

The recorded-runs gallery contains all four comparison outcomes and never
consumes Fireworks, Daytona, CodeRabbit, or Braintrust capacity.

## Import a real GitHub PR

Paste a public GitHub pull request URL into the importer below the staged case
list. Popper fetches the PR metadata and the before/after contents of its first
modified standalone JavaScript file, then runs that diff through the same live
pipeline. The four staged cases remain available as the reliable demo path.

Demo PR:

```text
https://github.com/TarunYadgirkar/popper-demo-cart/pull/1
```

The importer intentionally rejects private repositories, non-GitHub URLs,
multi-file application builds, and non-JavaScript targets. Add an optional
server-side `GITHUB_TOKEN` in Vercel if the public GitHub API rate limit becomes
a problem; never expose that token to the browser.

## The staged PRs

Four small PRs are staged in `lib/fixtures/prs.ts` so the core paths remain
legible and reliable on stage. The separate recorded-runs gallery demonstrates
all four quadrants of the agreement matrix without consuming sponsor capacity.

| PR | Live expectation | What it shows |
|---|---|---|
| `pr-101` | agreement — both caught | sandbox and the recorded CodeRabbit review catch the null-cart bug |
| `pr-102` | agreement — both clear | a genuinely correct fix; the gate does not cry wolf |
| `pr-103` | fixture opinion unavailable | deep-merge behavior plus a staged static-review risk |
| `pr-104` | fixture opinion unavailable | an obvious retry-bound bug |

## CodeRabbit verdicts are recorded, not live

CodeRabbit reviews take minutes to tens of minutes, free-plan CLI reviews are rate limited, and there is no public API for fetching an existing PR review. So verdicts are captured ahead of time and read back at run time:

```bash
npm run record:coderabbit          # all four, slow — start it and go do something else
npm run record:coderabbit -- pr-101
```

The public cart demo includes a real CodeRabbit Pro Plus review bound to
`pr-101` and its imported GitHub equivalent. Other staged cases contain clearly
labelled `fixture` reviews for UI examples. Fixtures are not CodeRabbit output
and are never relabelled as a recorded cache entry. The live pipeline treats a
fixture as `no_opinion` and blocks. Bundled recorded-run fixtures are explicitly
simulated UI examples and cannot record a human override. A demo-ready `cache`
review has a capture timestamp and a digest binding it to the exact staged
before/after content.

The verdict is CodeRabbit's real opinion of the real code; only the timing is pre-arranged. The UI shows the capture timestamp, and you should say so when presenting. Set `CODERABBIT_MODE=cli` to go live in development — never in a demo.

## Docs

- `AGENTS.md` — instructions for coding agents, including external API gotchas that cost real time to discover
- `CLAUDE.md` — Claude Code entry point, imports `AGENTS.md`
- `docs/PROGRESS.md` — living status, blockers, and rejected approaches
- `docs/DECISIONS.md` — why the non-obvious calls were made
- `docs/DEMO_SCRIPT.md` — the three-minute run, and answers to the questions you will get
- `docs/DEPLOYMENT.md` — public Vercel deployment and release checklist

## What this deliberately does not do

It does not merge anything. `GateDecision.requiresHuman` is typed as the literal `true`, so the type system enforces it. An autonomous merge bot judging an agent's code on another model's opinion is the problem this project is pointing at, not a feature to add later.
