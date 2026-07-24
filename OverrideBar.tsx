"use client";

/**
 * The human override.
 *
 * SafeShip recommends; a person decides. Both buttons stay enabled regardless
 * of the recommendation, because an override you can only click when you agree
 * is not an override. The reason field is optional but logged, and it is the
 * field that makes the Braintrust trail worth reading later.
 */

import { useState } from "react";
import type { GateCall, GateDecision } from "@/lib/types";

export default function OverrideBar({
  runId,
  decision,
  onOverride,
}: {
  runId: string;
  decision: GateDecision;
  onOverride?: (call: GateCall, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState<GateCall | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(call: GateCall) {
    setBusy(true);
    try {
      await fetch("/api/override", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ runId, call, reason }),
      });
      setSent(call);
      onOverride?.(call, reason);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="decision">
      <span className="label">Recommendation</span>
      <p className={`call ${decision.call}`}>{decision.call === "block" ? "Block" : "Merge"}</p>
      <p className="rationale">{decision.rationale}</p>

      <div className="override">
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for the record (optional)"
          aria-label="Reason for the record"
          disabled={busy || sent !== null}
        />
        <button className="act" onClick={() => submit("block")} disabled={busy || sent !== null}>
          Block
        </button>
        <button className="act ghost" onClick={() => submit("merge")} disabled={busy || sent !== null}>
          Merge anyway
        </button>
      </div>

      {sent && (
        <p className="override-done">
          Recorded: a human chose to {sent}. Logged to Braintrust against run {runId.slice(0, 8)}.
        </p>
      )}
      {!sent && (
        <p className="rationale" style={{ color: "var(--muted)", fontSize: 11, marginTop: 10 }}>
          Nothing merges automatically. SafeShip never takes this action on its own.
        </p>
      )}
    </div>
  );
}
