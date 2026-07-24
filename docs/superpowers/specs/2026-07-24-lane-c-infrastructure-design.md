# Lane C Infrastructure Design

## Context

Lane A owns the pipeline, sponsor adapters, and scripts. Lane B owns the app and UI. Lane C must improve project reliability without editing either lane's exclusive files or the shared SSE contract.

The current baseline has local commit history and a clean worktree, but no remote. TypeScript passes on Node 20.20.0. The production build is blocked by Lane B's CopilotKit client-boundary issue. The project has no Node version pin, deterministic test command, lint command, or CI workflow.

## Goals

- Make the required Node and npm versions explicit and reproducible.
- Add deterministic TypeScript tests without introducing a large test framework.
- Add a strict lint command suitable for local use and CI.
- Add CI that installs from the lockfile and runs lint, typecheck, tests, and the production build.
- Keep Lane C changes isolated until Lane A and Lane B finish.
- Provide a final integration gate that detects regressions across all three lanes.

## Non-goals

- Do not edit `app/**`, `components/**`, `lib/adapters/**`, `lib/pipeline.ts`, or `scripts/**`.
- Do not edit `lib/types.ts` or `lib/events.ts`.
- Do not change sponsor credentials, call sponsor APIs during routine Lane C development, or record CodeRabbit output.
- Do not create a Git remote without an explicit repository URL.
- Do not force dependency upgrades to clear audit warnings.

## Approach

Work on the `lane-c/infrastructure` branch in `.worktrees/lane-c-infrastructure`. Keep commits small and merge `master` into Lane C after the other lanes stabilize; do not rebase the shared branch.

### Runtime pinning

- Add `.nvmrc` with Node `20.20.0`.
- Add `engines.node` and `packageManager` metadata to `package.json`.
- Keep npm as the package manager because the repository already has `package-lock.json`.

### Deterministic tests

- Use Node's built-in test runner through the existing `tsx` dependency.
- Add a `test` script that runs TypeScript test files under `tests/`.
- Add contract tests for pure verdict behavior and repository configuration.
- Tests that encode Lane A safety fixes may remain red only on the isolated branch while Lane A is still in progress; Lane C cannot merge until every test is green.

### Linting

- Add ESLint with the Next.js TypeScript and Core Web Vitals flat configuration.
- Pin lint dependencies to compatible versions rather than using `latest`.
- Add a `lint` script with zero warnings allowed.
- Do not use lint autofix across Lane A or Lane B files while those lanes are active.

### Continuous integration

Add a GitHub Actions workflow using Node 20 and `npm ci`. Run these gates in order:

1. `npm run lint`
2. `npm run typecheck`
3. `npm test`
4. `npm run build`

The workflow is intentionally not merge-ready until Lane B fixes the existing production build and Lane A satisfies the verdict contract tests.

## Concurrency and integration

- Lane C owns `.nvmrc`, `package.json`, `package-lock.json`, lint configuration, `tests/**`, `.github/workflows/**`, and this specification.
- Recheck both worktrees before every patch and commit.
- Do not modify `docs/PROGRESS.md` until final integration because all lanes append there.
- After Lane A and Lane B finish, merge `master` into Lane C, rerun the complete local gate, then merge Lane C back into `master`.
- Resolve conflicts by preserving the owning lane's production changes and reapplying only Lane C infrastructure.

## Verification

Routine Lane C checks must not call Fireworks, Daytona, Braintrust, CodeRabbit, or CopilotKit models.

Before Lane C can merge:

- Node version metadata agrees with the runtime used in CI.
- `npm ci` succeeds from a clean install.
- Lint passes with zero warnings.
- TypeScript passes.
- All deterministic tests pass.
- The production build passes.
- `npm run smoke -- pr-101` is run once after all lanes integrate and still returns `evidence_only` plus `block`.
- The worktree is secret-scanned and `.env` remains ignored.

## Failure handling

- A failing build owned by Lane B blocks Lane C integration but does not justify editing Lane B files.
- A failing verdict contract owned by Lane A is reported with the exact test and expected behavior; Lane C does not patch Lane A files.
- Dependency audit findings are reviewed and reported. No `npm audit fix --force` is allowed without a separate compatibility decision.
- Missing remote configuration is reported as an external blocker, not guessed.
