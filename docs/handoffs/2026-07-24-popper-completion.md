# Popper completion handoff

**Updated:** 2026-07-24 13:21 PDT
**Repository:** `TarunYadgirkar/Daytona-Hacksprint`
**Working branch:** `integration/github-main-lane-c`
**Working directory:** `/Users/tarunyadgirkar/TarunsCode/daytona-hackathon/initial-export/daytona/.worktrees/github-main-integration`
**Reasoning effort:** high, not xhigh

## Objective

Finish the approved Popper forensic control-room frontend, integrate it with
the completed platform hardening, run the full deterministic and live release
gates, push every meaningful segment, and tell the user when Vercel deployment
is safe.

The user no longer wants to split the UI work to another account. Complete
Tasks 2–8 directly on `integration/github-main-lane-c`, then complete the
remaining integration and Task 11 verification. No remote UI feature branch
exists as of this handoff.

## Read first

Read these completely before editing:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/superpowers/specs/2026-07-24-popper-forensic-control-room-design.md`
4. `docs/superpowers/plans/2026-07-24-popper-forensic-control-room.md`

The design is approved. Do not restart brainstorming or redesign it. Execute
the plan. Use the repository's frontend-design, engineering-rules, TDD,
accessibility, webapp-testing, and verification-before-completion skills.

## Current Git state

The branch was clean and matched its remote when this handoff was written.
Recent pushed commits:

```text
cba3558 docs: support remote UI handoff
c589156 docs: add Vercel deployment handoff
60fa32a security: add production response headers
6faaadf docs: add parallel frontend handoff
f06001c refactor: extract evidence report formatter
a184380 chore: integrate protected demo baseline
54b7881 docs: harden production implementation plan
2ab01d8 docs: plan forensic control room build
```

`origin/main` was at `0107ddd`. Work only in the integration worktree and
branch above. Commit and push after every meaningful segment using short
conventional commits.

## Confirmed working

- Protected demo baseline and infrastructure hardening are integrated.
- Evidence-report formatting was extracted from `PipelineView` and unit tested.
- Nonce-based CSP middleware and standard production security headers are
  implemented in `middleware.ts` and `next.config.mjs`.
- Production script policy uses a nonce and `strict-dynamic`; `unsafe-eval` is
  development-only. `style-src 'unsafe-inline'` is deliberate because
  CopilotKit injects runtime styles.
- The Vercel variable contract is documented in `docs/VERCEL_HANDOFF.md`.
- `.env.example` contains the nine deployment variables plus local-only
  CodeRabbit recorder entries. No credential values were committed.
- `npm run check:env` passed without echoing secrets.
- `npm run lint` passed with zero warnings.
- `npm run typecheck` passed.
- All 43 unit/configuration tests passed.
- `npm run build` passed with Next.js 15.5.21.

## Expected failures already resolved

- `tests/security-headers.test.ts` initially failed because `middleware.ts` did
  not exist. The middleware and header configuration were then implemented.
- Typecheck initially rejected calling optional `nextConfig.headers`; the test
  now asserts the function exists before calling it.
- `tests/deployment-docs.test.ts` initially failed with `ENOENT` because
  `docs/VERCEL_HANDOFF.md` did not exist. The handoff was then created.
- The production build warned about multiple lockfiles and inferred the outer
  repository as the workspace root. The build still passed; do not spend time
  changing this unless it causes an actual failure.

## Incomplete work

Plan Tasks 2–8 are not implemented:

1. Interrupt an active live run with the recorded fallback.
2. Build the mission header and forensic font foundation.
3. Extract the staged PR case selector.
4. Extract run status and expose accessible stage states.
5. Extract the evidence workspace and human-decision panel.
6. Apply the approved forensic control-room visual system.
7. Verify locked, idle, active, completed, and error states with Playwright and
   axe at the required widths.

Task 9's platform code is complete, but its integration is not. The last build
reported `/` as static. Nonce CSP requires request-time rendering. During the
UI work, make `app/page.tsx` an async server component and call:

```tsx
import { connection } from "next/server";

await connection();
```

The next production build must report `/` as dynamic.

Task 10 is complete except `docs/PROGRESS.md` must only claim the UI work after
its checks pass. Task 11 has not been run against the completed UI.

## File ownership now

There is no second UI worker. The resumed session owns all remaining planned
changes. Preserve the platform work in:

- `middleware.ts`
- `next.config.mjs`
- `tests/security-headers.test.ts`
- `tests/deployment-docs.test.ts`
- `docs/VERCEL_HANDOFF.md`
- `docs/DEPLOYMENT.md`
- `.env.example`

Do not change `lib/types.ts` or `lib/events.ts` unless the UI plan truly
requires a contract change; announce it in `docs/PROGRESS.md` first.

## Exact next steps

1. Enter the integration worktree, fetch, and confirm the branch is clean:

   ```bash
   cd /Users/tarunyadgirkar/TarunsCode/daytona-hackathon/initial-export/daytona/.worktrees/github-main-integration
   git fetch origin --prune
   git status --short --branch
   ```

2. Force Node 20.20.0 for every npm command because the system default is Node
   18:

   ```bash
   export PATH="/Users/tarunyadgirkar/.nvm/versions/node/v20.20.0/bin:$PATH"
   node --version
   ```

3. Execute plan Tasks 2–8 in order. Follow red-green-refactor. Do the
   implementation directly; use subagents only for bounded independent review
   work, not for long-running implementation or repeated polling.
4. Ensure `app/page.tsx` calls `await connection()` and verify the production
   build marks `/` dynamic.
5. Update `docs/PROGRESS.md` only after the relevant UI, accessibility, and
   fallback checks pass.
6. Review all changes, run `git diff --check`, scan tracked content for secrets,
   then commit and push each meaningful segment.

## Final release gate

Do not say the app is complete and do not tell the user to deploy until all of
these pass freshly:

```bash
npm run check:env
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run smoke -- pr-101
```

The live smoke must finish with comparison `both_caught` and gate decision
`block`. Run it once after deterministic checks pass; it uses paid external
services.

Run the app in recorded mode and inspect 390×844, 768×900, and 1440×1000:

```bash
POPPER_GATE_MODE=recorded POPPER_RECORDED_DELAY_MS=5 npm run dev
```

Verify locked, idle, active, completed, fallback, and error states; keyboard
operation; visible focus; reduced motion; no page-level horizontal overflow;
no serious/critical axe findings; no CSP console or network violations.

Before final push, confirm:

```bash
git check-ignore -q .env
test -z "$(git ls-files .env)"
test "$(stat -f '%Lp' .env)" = "600"
git grep -nE '(fw_|dtn_|cr-|sk-|ck_pub_)[A-Za-z0-9_-]{16,}' -- ':!package-lock.json'
git diff --check
git status --short --branch
```

The active worktree's ignored `.env` is linked to the outer repository's
private `.env`. Never print, quote, or commit its values.

## Deployment handoff

The user will deploy through Vercel; do not deploy for them. When every release
gate passes, explicitly say **deploy now** and point them to
`docs/VERCEL_HANDOFF.md`. CodeRabbit must remain `cache` in Preview and
Production. Do not set `POPPER_GATE_MODE`, `OPENAI_API_KEY`,
`NEXT_PUBLIC_COPILOTKIT_API_KEY`, or the local CodeRabbit recorder key in
Vercel.

## Blockers and open questions

No external blocker exists. The remaining work is local implementation and
verification. If sponsor APIs fail during the final live smoke, report the
external failure accurately and do not convert it into passing evidence.
