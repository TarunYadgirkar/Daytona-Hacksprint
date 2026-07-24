# Popper forensic control room

Date: 2026-07-24
Status: approved design

## Purpose

Popper needs a judge-facing interface that explains its central argument in
seconds: execution evidence and static-review opinion are different methods,
their disagreement is useful, and a human remains responsible for the final
decision.

The redesign must feel like a working forensic instrument rather than a
generic dashboard or marketing page. It must preserve the real pipeline,
provenance, protected live integrations, deterministic recorded fallback, and
human override already implemented on `origin/main`.

## Current state and integration baseline

Two lines of work must be combined before visual implementation:

- `origin/main` at `b26914d` contains the protected demo boundary, recorded-run
  gallery, replay library, responsive evidence table, access/rate protection,
  Playwright coverage, and deployment documentation.
- `integration/github-main-lane-c` contains five additional build, CI, trust,
  and Daytona-hardening commits through `edd1a29`.

Implementation starts by merging `origin/main` into the integration branch.
The merge must preserve both sets of behavior. No frontend work begins from
the older integration UI in isolation.

## Goals

- Make the evidence-versus-opinion comparison understandable within ten
  seconds.
- Create one memorable visual signature around the split verdict rail.
- Guide a presenter through selection, execution, comparison, and human
  decision without needing to explain the interface.
- Keep live and recorded provenance explicit at every stage.
- Make the recorded fallback reachable during a slow or failed live run.
- Keep every result usable at phone, tablet, laptop, and projector widths.
- Meet WCAG 2.2 AA expectations for keyboard use, contrast, semantics, status
  announcements, and reduced motion.
- Produce a Vercel handoff that does not require committing or pasting secrets
  into source files.

## Non-goals

- No autonomous merge path.
- No live GitHub ingestion or webhook setup.
- No replacement of the existing SSE pipeline.
- No recomputation of agreement or gate decisions in React.
- No new design framework, Tailwind migration, charting library, or animation
  dependency.
- No attempt to turn Popper into a general-purpose repository dashboard.
- No live CodeRabbit CLI execution during a demo.

## Approaches considered

### Editorial case study

A linear, presentation-like page would make the narrative clear and could look
polished quickly. It would make the live pipeline feel secondary and reduce the
product's credibility as an operating tool.

### Dense operator console

A high-density observability dashboard would expose the most technical detail.
It would demand too much reading from judges and bury the product's central
comparison.

### Forensic control room

The selected direction combines a strong narrative hierarchy with genuine
operational detail. It treats each run as a case file, the pipeline as an
instrument, and the verdict split as the focal event.

## Visual direction

The interface uses a dark forensic-lab palette:

- Near-black navy as the primary ground.
- Warm off-white for primary text and evidence surfaces.
- Signal green for conclusive supporting execution.
- Safety red for broken claims and block decisions.
- Electric blue only for evidence/opinion disagreement and active focus.
- Amber for unavailable infrastructure or incomplete evidence.

Typography uses `Barlow Condensed` for headlines, stage labels, and calls to
action, with `IBM Plex Mono` for claims, timings, run identifiers, evidence,
and code. Fonts are loaded through `next/font` so production output is
self-hosted and avoids runtime font requests.

The visual language uses restrained instrument details: hairline grids,
calibration ticks, case numbers, inset evidence surfaces, and one animated
scan-line progression during execution. It avoids glassmorphism, purple
gradients, generic rounded cards, decorative stock imagery, and unnecessary
3D effects.

Motion is concentrated in the run:

- A short staged reveal on initial load.
- A progress trace that advances through pipeline stages.
- A decisive split animation when evidence and opinion disagree.
- No looping decorative animation.
- All motion is removed under `prefers-reduced-motion`.

## Information architecture

### 1. Mission header

The first viewport leads with:

> Do not trust the diff. Test the claim.

Supporting copy explains that Popper extracts the behavioral promise,
generates adversarial tests, executes both revisions, compares the evidence
with CodeRabbit, and leaves the decision to a human.

A compact integration trace names the sponsor roles without implying equal
semantics:

`Fireworks: attack generation → Daytona: execution → CodeRabbit: opinion →
Braintrust: trace → CopilotKit: interrogation`

### 2. Case selection

Staged PRs appear as compact case files. Each card shows:

- PR identifier and title.
- The claimed behavior.
- A short risk cue.
- Selected state with visible focus.

Selection only previews the diff. It never starts a paid run. The primary
button remains a separate, explicit `Run adversarial gate` action.

### 3. Live instrument

The active run surface contains:

- Connection state and run identifier.
- Execution origin, CodeRabbit provenance, and Braintrust configuration.
- Six pipeline stages with text state, timing, and an accessible live update.
- Slow-stage and disconnected-state notices with direct recovery actions.
- A persistent `Load recorded case` fallback that can abort an active
  EventSource and restore a completed record.

### 4. Evidence workspace

Results follow the product's reasoning order:

1. Extracted claim.
2. Generated attacks.
3. Before/after execution evidence.
4. Independent CodeRabbit opinion.
5. Agreement analysis.
6. Gate recommendation and human action.

The test table keeps its accessible caption, scoped headings, horizontal
scroll container, generated-code disclosure, and execution-output disclosure.
Summary chips report broken, upheld, inconclusive, and errored evidence without
using color alone.

### 5. Split verdict rail

The verdict rail is the interface's visual signature. Its two sides are always
labelled:

- `Execution evidence`
- `CodeRabbit opinion`

Agreement forms one continuous field. Disagreement opens a blue seam between
the methods and reveals a plain-language disagreement label. Unavailable
evidence or unavailable opinion uses amber and explicit text, never green.

### 6. Human decision

The final panel emphasizes that the displayed call is a recommendation. Merge
and block actions require a reason and remain disabled until the run is
complete. Success appears only after `/api/override` confirms the Braintrust
write.

The CopilotKit surface remains available as `Ask Popper`, focused on
interrogating the completed evidence and recording the same human override
path rather than starting the pipeline nondeterministically.

### 7. Recorded case library

Bundled records become a four-case evidence library covering the meaningful
agreement quadrants. Cards show:

- Case label and PR identifier.
- Live capture or recorded-fixture origin.
- Evidence and opinion availability.
- Captured timestamp and run identifier.
- Expected comparison kind.

Loading a record is always explicit that no sponsor call, sandbox, review
command, or Braintrust write ran again.

## Component boundaries

`PipelineView` remains the owner of SSE-derived state. It does not calculate a
verdict. To keep the current component below the repository's size limit,
presentational sections are extracted without changing the pipeline contract:

- `MissionHeader` renders the product statement and integration trace.
- `CaseSelector` renders staged PR cards, diff preview, and explicit run action.
- `RunStatus` renders connection, provenance, timers, notices, and recovery.
- `EvidenceWorkspace` composes the claim, stage list, evidence table, opinion,
  and verdict rail.
- `DecisionPanel` composes the recommendation and existing override behavior.
- `RunGallery` remains the recorded-case entry point.

The existing `StageList`, `TestTable`, `VerdictRail`, `OverrideBar`, and
`CopilotTools` behavior remains authoritative. Refactoring must move rendering
without duplicating agreement or decision logic.

## Data flow

### Live run

1. A user selects a staged PR.
2. The UI previews the case without requesting `/api/gate`.
3. The user explicitly starts the run.
4. `PipelineView` opens the SSE connection and renders decoded events.
5. Agreement and decision arrive precomputed from `lib/pipeline.ts`.
6. A completed result is validated and stored in the replay library.
7. A human override posts to `/api/override` and reports success only after a
   successful response.

### Recorded run

1. A user chooses a bundled or browser-saved record.
2. Any active EventSource is closed and stage timers are cleared.
3. The validated completed result populates the same presentation state.
4. The UI labels the record's origin and disables writes that would imply a
   live Braintrust trace.

No recorded action may call Fireworks, Daytona, CodeRabbit, or Braintrust.

## Error and recovery states

- Invalid SSE payload: show an alert and offer a recorded case.
- Slow sponsor stage: keep the connection open, announce the delay, and expose
  the fallback.
- Disconnected stream: stop the run state, identify the last failed stage, and
  offer retry or recorded fallback.
- Daytona infrastructure failure: show unavailable evidence and block.
- Missing CodeRabbit opinion: show unavailable opinion and block.
- Failed override: retain the decision controls and display no success state.
- Disabled browser storage: keep the completed run in memory and retain bundled
  records.
- Missing production access code: fail closed before mounting the pipeline.

## Accessibility

- One `h1`, followed by ordered section headings.
- Every stage exposes its text state; important changes use a polite live
  region.
- Errors use `role="alert"` and successful overrides use `role="status"`.
- Tables include captions and `scope="col"` headings.
- Focus order follows the visual workflow.
- All interactive controls have visible high-contrast focus indicators.
- Color is never the only carrier of stage, verdict, or provenance state.
- Minimum body-text contrast is 4.5:1 and large-text/UI contrast is 3:1.
- Touch targets are at least 44 by 44 CSS pixels where practical.
- Horizontal scrolling is limited to the evidence-table container.
- Reduced-motion users receive immediate state changes without transitions.

## Responsive behavior

- Desktop: case selection and live instrument form a two-column control room;
  evidence uses the full content width.
- Tablet: control and evidence sections stack while provenance remains in one
  compact row where space permits.
- Mobile: all sections become a single reading column; action groups become
  full-width; the verdict rail remains side by side with shorter labels; the
  evidence table scrolls internally.
- Projector: maximum content width and type scale keep the claim, verdict, and
  final recommendation legible from a distance.

## Performance

- Use CSS transitions and keyframes only; add no animation runtime.
- Use `next/font` subsets and variable weights where supported.
- Avoid images in the critical path.
- Keep recorded fixture data statically bundled and sponsor calls user-driven.
- Preserve server components for the page shell; isolate client behavior to
  existing interactive components.
- Avoid layout shifts by reserving stable run-status and verdict regions.

## Security and deployment

- Preserve the production access boundary, signed cookie, constant-time code
  comparison, and run quota from `origin/main`.
- Keep `.env` ignored, untracked, and permission-restricted.
- Keep `CODERABBIT_MODE=cache` for preview and production.
- Never expose Fireworks, Daytona, Braintrust, CodeRabbit, or access-code
  secrets through `NEXT_PUBLIC_` variables.
- Vercel Preview and Production receive the required variables through project
  settings or a non-echoing CLI import.
- Preview deployments additionally enable Vercel Authentication.
- Production fails closed when `POPPER_DEMO_ACCESS_CODE` is missing.

The final handoff lists every Vercel variable name, indicates its environment
scope, and provides commands that read values from the ignored local `.env`
without printing them into the repository or shell history.

## Test strategy

Behavior changes follow red-green-refactor.

Unit and integration coverage:

- Loading a recorded case closes an active live connection.
- Stage and connection-state transformations retain their current semantics.
- Unavailable evidence and opinion never render as positive agreement.
- Override failure never renders recorded success.

Playwright coverage:

- Selecting a case sends no gate request.
- Explicit run starts one gate request.
- Active-run fallback cancels the stream and loads the selected record.
- Each recorded quadrant produces the expected rail and recommendation.
- Access-code required, incorrect, and authorized states.
- Keyboard navigation and visible focus across the primary workflow.
- No page-level overflow at 390, 768, and 1280 pixels.
- Reduced-motion behavior.
- Automated accessibility scan on the locked screen, idle control room, active
  run, completed evidence, and error alert.

Release verification:

```bash
npm run check:env
npm run lint
npm run typecheck
npm test
npm run build
npm run smoke -- pr-101
npx playwright test
```

The live smoke must still return `evidence_only` and `block`.

## Acceptance criteria

- The latest protected-demo frontend and all five integration hardening commits
  coexist on one branch.
- A first-time viewer can identify the claim, evidence, opinion, disagreement,
  and human decision without presenter guidance.
- No PR selection starts a paid run.
- A recorded case can replace an active or failed live run immediately.
- Live and recorded provenance is explicit wherever results appear.
- Infrastructure failure cannot appear green or recommend merge.
- All recorded quadrants remain usable after browser storage is cleared.
- Keyboard, contrast, semantic, responsive, and reduced-motion checks pass.
- Lint, typecheck, unit tests, production build, live smoke, and Playwright
  checks pass with fresh evidence.
- No secret is committed, printed by verification scripts, or exposed to the
  browser.
- The Vercel handoff is complete enough for deployment without editing source.
