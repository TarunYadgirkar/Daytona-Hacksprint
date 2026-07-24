import assert from "node:assert/strict";
import test from "node:test";
import type { GateEvent } from "./events";
import { RECORDED_RUNS } from "./fixtures/recorded-runs";
import { streamRecordedRun } from "./recorded-stream";

test("recorded stream emits the complete gate contract without external work", async () => {
  const previous = process.env.POPPER_RECORDED_DELAY_MS;
  process.env.POPPER_RECORDED_DELAY_MS = "0";
  const events: GateEvent[] = [];
  try {
    await streamRecordedRun(RECORDED_RUNS[0]!, (event) => events.push(event));
  } finally {
    if (previous === undefined) delete process.env.POPPER_RECORDED_DELAY_MS;
    else process.env.POPPER_RECORDED_DELAY_MS = previous;
  }

  assert.equal(events[0]?.type, "run_start");
  assert.equal(events.at(-1)?.type, "run_complete");
  assert.deepEqual(
    events
      .filter((event) => event.type === "stage_done")
      .map((event) => event.stage),
    ["claim", "tests", "sandbox", "coderabbit", "compare", "decision"],
  );
});
