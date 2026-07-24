import assert from "node:assert/strict";
import test from "node:test";
import nextConfig from "../next.config.mjs";
import { buildContentSecurityPolicy } from "../middleware";

test("production CSP uses a nonce and rejects unsafe script execution", () => {
  const policy = buildContentSecurityPolicy("nonce-value", false);

  assert.match(policy, /script-src 'self' 'nonce-nonce-value' 'strict-dynamic'/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /object-src 'none'/);
  assert.doesNotMatch(policy, /script-src[^;]*'unsafe-inline'/);
  assert.doesNotMatch(policy, /script-src[^;]*'unsafe-eval'/);
});

test("development CSP permits the Next.js evaluator without weakening production", () => {
  const policy = buildContentSecurityPolicy("nonce-value", true);

  assert.match(policy, /script-src[^;]*'unsafe-eval'/);
});

test("Next.js applies standard production security headers", async () => {
  assert.equal(nextConfig.poweredByHeader, false);

  const getHeaders = nextConfig.headers;
  assert.ok(getHeaders);
  const routes = await getHeaders();
  const headers = Object.fromEntries(
    routes.flatMap((route) => route.headers.map(({ key, value }) => [key, value])),
  );

  assert.equal(headers["X-Content-Type-Options"], "nosniff");
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.equal(headers["Referrer-Policy"], "strict-origin-when-cross-origin");
  assert.equal(
    headers["Permissions-Policy"],
    "camera=(), microphone=(), geolocation=()",
  );
  assert.match(headers["Strict-Transport-Security"], /max-age=63072000/);
});
