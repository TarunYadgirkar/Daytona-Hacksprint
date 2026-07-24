# Protected deployment

SafeShip can create paid model calls and live sandboxes, so a deployment is
not ready merely because it builds.

## Vercel project

1. Import this repository as a Next.js project.
2. Keep the Node.js runtime and allow the gate route's 300-second
   `maxDuration` where the plan permits it.
3. Add the production and preview environment variables from `.env.example`.
   Set `CODERABBIT_MODE=cache`; never use CLI mode during a demo.
4. Generate a strong, shareable `SAFESHIP_DEMO_ACCESS_CODE`. Set it for both
   Preview and Production, then redeploy. Environment-variable changes do not
   affect already-created deployments.
5. Do not set `SAFESHIP_GATE_MODE=recorded` on the live demo. It exists for
   deterministic browser testing only.

SafeShip checks Vercel's `VERCEL_ENV`. A production request fails closed with
HTTP 503 when `SAFESHIP_DEMO_ACCESS_CODE` is absent, instead of exposing paid
integrations by mistake.

## Deployment Protection

In Vercel, open **Project → Settings → Deployment Protection**, enable
**Vercel Authentication**, choose **Standard Protection**, and save.

Standard Protection covers preview deployments and generated deployment URLs
on Hobby, but it does not cover the public production domain. The application
access code is therefore still required in Production. Vercel's current
documentation is the source of truth:

- https://vercel.com/docs/deployment-protection
- https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication

If the plan supports **All Deployments**, it can add another layer around the
production domain. Keep the application access code anyway: API routes should
not depend exclusively on a dashboard toggle.

## Release check

```bash
npm ci
npm test
npm run typecheck
npm run build
npm run smoke -- pr-101
```

Then verify:

- An unauthenticated preview URL redirects to Vercel Authentication.
- The production URL asks for the SafeShip demo code.
- An incorrect code does not mount the pipeline.
- Selecting a PR makes no `/api/gate` request.
- One explicit recorded-mode run completes without sponsor API keys.
- One explicit live `pr-101` run returns `evidence_only` and `block`.
- The recorded gallery loads every quadrant after clearing browser storage.
- At 390px, 768px, and desktop widths, evidence remains reachable without
  page-level horizontal overflow.

## Operational limits

The access code is the durable public boundary. The five-runs-per-ten-minutes
quota is deliberately a second guard, not a billing-grade distributed rate
limiter: serverless instances do not share its in-memory counters. If this
moves beyond a controlled demo, replace the map with a shared store such as
Vercel KV or Upstash before opening access more broadly.
