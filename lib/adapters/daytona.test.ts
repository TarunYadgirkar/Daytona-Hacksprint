import assert from "node:assert/strict";
import test from "node:test";
import { DAYTONA_SANDBOX_POLICY } from "./daytona";

test("Daytona sandbox policy constrains untrusted test execution", () => {
  assert.deepEqual(DAYTONA_SANDBOX_POLICY, {
    createParams: {
      language: "javascript",
      public: false,
      networkBlockAll: true,
      ephemeral: true,
      autoDeleteInterval: 0,
      ttlMinutes: 10,
    },
    createOptions: {
      timeout: 60,
    },
    commandTimeoutSeconds: 15,
    generatedTestTimeoutSeconds: 10,
    deleteTimeoutSeconds: 60,
    waitForDelete: true,
    cleanupFailureLog: "Sandbox cleanup failed; automatic deletion remains enabled.",
  });
});
