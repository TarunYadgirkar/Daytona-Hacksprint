"use client";

import type { GateCall, GateDecision } from "@/lib/types";
import OverrideBar from "./OverrideBar";

type Props = {
  runId: string;
  decision: GateDecision;
  report: string | null;
  copyNotice: string | null;
  onCopyReport: () => void;
  onOverride: (call: GateCall, reason: string) => Promise<void>;
};

export default function DecisionPanel({
  runId,
  decision,
  report,
  copyNotice,
  onCopyReport,
  onOverride,
}: Props) {
  return (
    <section className="panel decision-panel">
      <div className="decision-actions">
        <span className="label">Human gate</span>
        {report && (
          <button
            type="button"
            className="act ghost"
            onClick={onCopyReport}
          >
            Copy evidence report
          </button>
        )}
      </div>
      <OverrideBar
        key={runId}
        runId={runId}
        decision={decision}
        onOverride={onOverride}
      />
      {copyNotice && <p className="copy-notice">{copyNotice}</p>}
    </section>
  );
}
