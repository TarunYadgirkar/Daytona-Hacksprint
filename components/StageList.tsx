"use client";

import { STAGE_ORDER, type StageName } from "@/lib/types";

export type StageState = "pending" | "running" | "done" | "error";

const STAGE_LABEL: Record<StageName, string> = {
  claim: "Extract the claim",
  tests: "Generate adversarial tests",
  sandbox: "Execute before / after",
  coderabbit: "Independent review",
  compare: "Compare methods",
  decision: "Recommend",
};

const DOT: Record<StageState, string> = {
  pending: "○",
  running: "◐",
  done: "●",
  error: "✕",
};

const STATE_LABEL: Record<StageState, string> = {
  pending: "Pending",
  running: "Running",
  done: "Complete",
  error: "Error",
};

export default function StageList({
  states,
  timings,
  logs,
}: {
  states: Record<StageName, StageState>;
  timings: Partial<Record<StageName, number>>;
  logs: Array<{ stage: StageName; message: string }>;
}) {
  return (
    <div role="status" aria-label="Pipeline status updates">
      {STAGE_ORDER.map((stage) => {
        const stageLogs = logs.filter((l) => l.stage === stage);
        const ms = timings[stage];
        return (
          <div key={stage}>
            <div className="stage" data-state={states[stage]}>
              <span className="dot" aria-hidden="true">{DOT[states[stage]]}</span>
              <span>{STAGE_LABEL[stage]}</span>
              <span className="stage-state">
                {STATE_LABEL[states[stage]]}
              </span>
              <span className="ms">{ms !== undefined ? `${(ms / 1000).toFixed(1)}s` : ""}</span>
            </div>
            {states[stage] !== "pending" &&
              stageLogs.map((l, i) => (
                <div className="logline" key={i}>
                  {l.message}
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}
