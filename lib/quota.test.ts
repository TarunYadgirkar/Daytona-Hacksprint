import assert from "node:assert/strict";
import test from "node:test";
import { consumeGateQuota } from "./quota";

test("live gate quota blocks a sixth run in the ten-minute window", () => {
  const request = new Request("https://popper.example/api/gate", {
    headers: { "x-forwarded-for": "203.0.113.42" },
  });
  for (let run = 0; run < 5; run += 1) {
    assert.equal(consumeGateQuota(request).allowed, true);
  }
  const blocked = consumeGateQuota(request);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfterSeconds > 0);
});
