# Vercel handoff

Add these variables to both Preview and Production in **Vercel → Project
Settings → Environment Variables**.

| Variable | Preview | Production | Value source |
|---|---:|---:|---|
| `FIREWORKS_API_KEY` | Yes | Yes | Local `.env` |
| `FIREWORKS_BASE_URL` | Yes | Yes | `https://api.fireworks.ai/inference/v1` |
| `FIREWORKS_MODEL` | Yes | Yes | `accounts/fireworks/models/kimi-k2p6` |
| `DAYTONA_API_KEY` | Yes | Yes | Local `.env` |
| `BRAINTRUST_API_KEY` | Yes | Yes | Local `.env` |
| `BRAINTRUST_PROJECT` | Yes | Yes | `safeship` |
| `SAFESHIP_DEMO_ACCESS_CODE` | Yes | Yes | Local `.env` |
| `CODERABBIT_MODE` | Yes | Yes | `cache` |
| `COPILOTKIT_MODEL` | Yes | Yes | `accounts/fireworks/models/kimi-k2p6` |

Copy sensitive values directly from the ignored local `.env` into Vercel
Project Settings. Do not print those values in a terminal transcript or commit
them.

Do not set these variables in Preview or Production:

- `SAFESHIP_GATE_MODE`; its recorded value is only for deterministic local
  browser tests.
- `OPENAI_API_KEY`; CopilotKit uses Fireworks.
- `NEXT_PUBLIC_COPILOTKIT_API_KEY`; the app uses its server runtime route.

The CodeRabbit API key is for the local recorder only and is not needed in
Vercel cache mode.

## Deployment settings

1. Use Node.js 20.x and the repository's standard Next.js build settings.
2. Enable Vercel Authentication for Preview under **Project → Settings →
   Deployment Protection**.
3. Keep the application access code enabled in Production because Vercel's
   standard Preview protection does not protect the public production domain.
4. Redeploy after every environment-variable update.

## Verification

Confirm the local environment without echoing credential values:

```bash
npm run check:env
```

Before promoting the deployment, run:

```bash
npm ci
npm run verify
npm run test:e2e
npm run smoke -- pr-101
```

The live smoke must finish with `evidence_only` and `block`.
