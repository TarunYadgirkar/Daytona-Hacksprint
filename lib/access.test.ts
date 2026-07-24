import assert from "node:assert/strict";
import test from "node:test";
import {
  authorizeDemoCode,
  consumeGateQuota,
  demoAccessStatus,
  requireDemoAccess,
} from "./access";

test("demo access is open when no access code is configured", () => {
  const previous = process.env.SAFESHIP_DEMO_ACCESS_CODE;
  delete process.env.SAFESHIP_DEMO_ACCESS_CODE;
  try {
    const request = new Request("http://localhost/api/gate");
    assert.deepEqual(demoAccessStatus(request), {
      required: false,
      authorized: true,
      configured: false,
    });
    assert.equal(requireDemoAccess(request), null);
  } finally {
    if (previous === undefined) delete process.env.SAFESHIP_DEMO_ACCESS_CODE;
    else process.env.SAFESHIP_DEMO_ACCESS_CODE = previous;
  }
});

test("a signed cookie authorizes a configured demo code", () => {
  const previous = process.env.SAFESHIP_DEMO_ACCESS_CODE;
  process.env.SAFESHIP_DEMO_ACCESS_CODE = "test-access-code";
  try {
    assert.equal(authorizeDemoCode("wrong-code"), null);
    const cookie = authorizeDemoCode("test-access-code");
    assert.ok(cookie);
    const request = new Request("http://localhost/api/gate", {
      headers: { cookie: cookie.split(";")[0]! },
    });
    assert.deepEqual(demoAccessStatus(request), {
      required: true,
      authorized: true,
      configured: true,
    });
  } finally {
    if (previous === undefined) delete process.env.SAFESHIP_DEMO_ACCESS_CODE;
    else process.env.SAFESHIP_DEMO_ACCESS_CODE = previous;
  }
});

test("Vercel production fails closed when no demo code is configured", () => {
  const previousCode = process.env.SAFESHIP_DEMO_ACCESS_CODE;
  const previousVercelEnv = process.env.VERCEL_ENV;
  delete process.env.SAFESHIP_DEMO_ACCESS_CODE;
  process.env.VERCEL_ENV = "production";
  try {
    const request = new Request("https://safeship.example/api/gate");
    assert.deepEqual(demoAccessStatus(request), {
      required: true,
      authorized: false,
      configured: false,
    });
    assert.equal(requireDemoAccess(request)?.status, 503);
    assert.equal(authorizeDemoCode("anything"), null);
  } finally {
    if (previousCode === undefined) delete process.env.SAFESHIP_DEMO_ACCESS_CODE;
    else process.env.SAFESHIP_DEMO_ACCESS_CODE = previousCode;
    if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousVercelEnv;
  }
});

test("live gate quota blocks a sixth run in the ten-minute window", () => {
  const previousCode = process.env.SAFESHIP_DEMO_ACCESS_CODE;
  const previousVercelEnv = process.env.VERCEL_ENV;
  delete process.env.SAFESHIP_DEMO_ACCESS_CODE;
  delete process.env.VERCEL_ENV;
  try {
    const request = new Request("http://localhost/api/gate");
    for (let run = 0; run < 5; run += 1) {
      assert.equal(consumeGateQuota(request).allowed, true);
    }
    const blocked = consumeGateQuota(request);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.remaining, 0);
    assert.ok(blocked.retryAfterSeconds > 0);
  } finally {
    if (previousCode === undefined) delete process.env.SAFESHIP_DEMO_ACCESS_CODE;
    else process.env.SAFESHIP_DEMO_ACCESS_CODE = previousCode;
    if (previousVercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previousVercelEnv;
  }
});
