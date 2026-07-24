# Forensic control room UI lane

Use this brief in a second Codex Pro session. Set reasoning effort to **high**.

## Objective

Implement Tasks 2–8 from:

`docs/superpowers/plans/2026-07-24-safeship-forensic-control-room.md`

This lane owns the judge-facing frontend: interruptible recorded fallback,
mission header, case selector, run-status instrument, evidence workspace,
visual system, responsive behavior, and accessibility tests.

The design is already approved. Do not repeat brainstorming or redesign the
product:

`docs/superpowers/specs/2026-07-24-safeship-forensic-control-room-design.md`

## Create an isolated worktree

Run from the repository root:

```bash
cd /Users/tarunyadgirkar/TarunsCode/daytona-hackathon/initial-export/daytona
git fetch origin --prune
git worktree add .worktrees/forensic-ui \
  -b feature/forensic-control-room-ui \
  origin/integration/github-main-lane-c
cd .worktrees/forensic-ui
```

Confirm the branch contains the approved integration baseline:

```bash
git merge-base --is-ancestor f06001c HEAD
git status --short --branch
```

Do not work in `.worktrees/github-main-integration`; the primary session owns
that worktree.

## Read before editing

```bash
sed -n '1,260p' AGENTS.md
sed -n '1,200p' CLAUDE.md
sed -n '1,420p' docs/superpowers/specs/2026-07-24-safeship-forensic-control-room-design.md
```

Use the repository skills for engineering rules, frontend design, TDD,
accessibility, webapp testing, and verification before completion.

## File ownership

This UI lane may edit:

- `app/globals.css`
- `app/layout.tsx`
- `app/page.tsx`
- `components/**`
- `e2e/**`
- `package.json`
- `package-lock.json`
- `.github/workflows/ci.yml`
- `playwright.config.ts`
- `docs/PROGRESS.md`

This UI lane must not edit:

- `.env` or any credentials
- `.env.example`
- `middleware.ts`
- `next.config.mjs`
- `tests/security-headers.test.ts`
- `tests/deployment-docs.test.ts`
- `docs/DEPLOYMENT.md`
- `docs/VERCEL_HANDOFF.md`
- `lib/adapters/**`
- `lib/pipeline.ts`
- `lib/types.ts`
- `lib/events.ts`

The primary session owns security headers, Vercel configuration, deployment
documentation, live smoke verification, and final integration.

## Required implementation sequence

Execute plan Tasks 2–8 in order. These are tightly coupled, so keep one
worktree and make a short conventional commit after each meaningful segment.

Important integration note for `app/page.tsx`: make the page request-time
rendered so the primary lane can add nonce-based CSP without a merge conflict:

```tsx
import { connection } from "next/server";

export default async function Page() {
  await connection();
  return (
    <>
      <MissionHeader />
      <AccessBoundary>
        <PipelineView
          prs={STAGED_PRS}
          gateMode={
            process.env.SAFESHIP_GATE_MODE === "recorded"
              ? "recorded_fixture"
              : "live"
          }
          braintrustConfigured={Boolean(process.env.BRAINTRUST_API_KEY)}
        />
      </AccessBoundary>
    </>
  );
}
```

Do not add `middleware.ts` or CSP headers in this lane.

## Node and commands

Use Node 20 for every npm command:

```bash
export PATH="/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH"
node --version
npm ci
```

Expected Node version: `v20.20.0`.

Follow red-green-refactor for each behavior:

1. Add the focused failing Playwright test.
2. Run it and record the expected failure.
3. Implement the minimal behavior.
4. Run the focused test and record the pass.
5. Run the relevant full gate.
6. Commit and push.

## Final verification

Before reporting completion:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
git diff --check
git status --short --branch
```

Visually inspect recorded states at 390, 768, and 1440 pixels. Confirm:

- No page-level horizontal overflow.
- Recorded fallback can interrupt an active run.
- The claim, evidence, CodeRabbit opinion, and human decision read in order.
- Provenance remains explicit.
- No serious or critical axe violations.
- Reduced motion removes the verdict animation.

## Push and hand back

```bash
git push -u origin feature/forensic-control-room-ui
```

Do not merge into `integration/github-main-lane-c` and do not deploy. Return:

- Commit range.
- Files changed.
- RED/GREEN evidence.
- Lint, typecheck, unit, build, and Playwright results.
- Screenshot paths.
- Any unresolved concerns.

The primary session will review the branch, merge it, run security/deployment
work, execute live smoke, and give the final Vercel go-ahead.
