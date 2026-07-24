# Public deployment

Popper can create paid model calls and live sandboxes, so a deployment is
not ready merely because it builds.

## Vercel project

1. Import this repository as a Next.js project.
2. Keep the Node.js runtime and allow the gate route's 300-second
   `maxDuration` where the plan permits it.
3. Add the exact production and preview environment variables from
   [`VERCEL_HANDOFF.md`](./VERCEL_HANDOFF.md). Keep
   `CODERABBIT_MODE=cache`; never use CLI mode during a demo.
4. Do not set `POPPER_GATE_MODE=recorded` on the live demo. It exists for
   deterministic browser testing only.

Copy sensitive values directly from the ignored local `.env` into Vercel
Project Settings. Do not print or commit them. Environment changes require a
redeploy.

## Deployment Protection

In Vercel, open **Project → Settings → Deployment Protection**, enable
**Vercel Authentication**, choose **Standard Protection**, and save.

Standard Protection covers preview deployments and generated deployment URLs
on Hobby. Production remains public so judges can open it without credentials.
Vercel's current documentation is the source of truth:

- https://vercel.com/docs/deployment-protection
- https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication

## Release check

```bash
npm ci
npm run verify
npm run test:e2e
npm run smoke -- pr-101
```

Then verify:

- An unauthenticated preview URL redirects to Vercel Authentication.
- The production URL opens the Popper control room directly.
- Selecting a PR makes no `/api/gate` request.
- One explicit recorded-mode run completes without sponsor API keys.
- One explicit live `pr-101` run returns `both_caught` and `block`.
- The recorded gallery loads every quadrant after clearing browser storage.
- At 390px, 768px, and desktop widths, evidence remains reachable without
  page-level horizontal overflow.

## Operational limits

The five-runs-per-ten-minutes quota is a best-effort guard, not a billing-grade
distributed rate limiter: serverless instances do not share its in-memory
counters. If this moves beyond a hackathon demo, replace the map with a shared
store such as Vercel KV or Upstash.
