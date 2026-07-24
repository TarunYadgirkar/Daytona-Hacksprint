"use client";

/**
 * The evidence table. Two columns of outcome, because a single "did it pass"
 * column would hide the only thing that makes the result mean anything: a test
 * that passes on BOTH sides never touched the bug and proves nothing.
 */

import type { AdversarialTest, SandboxTestResult, TestVerdict } from "@/lib/types";

const VERDICT_LABEL: Record<TestVerdict, string> = {
  claim_upheld: "claim held",
  claim_broken: "claim broken",
  test_inconclusive: "inconclusive",
  test_errored: "errored",
};

export default function TestTable({
  tests,
  results,
}: {
  tests: AdversarialTest[];
  results: SandboxTestResult[];
}) {
  if (tests.length === 0) {
    return <p className="empty">No adversarial tests generated yet.</p>;
  }

  return (
    <table className="tests">
      <thead>
        <tr>
          <th style={{ width: "48%" }}>Attack</th>
          <th>Before</th>
          <th>After</th>
          <th>Verdict</th>
        </tr>
      </thead>
      <tbody>
        {tests.map((test) => {
          const r = results.find((x) => x.testId === test.id);
          return (
            <tr key={test.id}>
              <td>
                {test.name}
                <span className="hyp">{test.hypothesis}</span>
                {r?.stdout && (
                  <span className="hyp">↳ {r.stdout.split("\n").filter(Boolean).slice(-1)[0]}</span>
                )}
              </td>
              <td className={`outcome ${r?.before ?? ""}`}>{r?.before ?? "…"}</td>
              <td className={`outcome ${r?.after ?? ""}`}>{r?.after ?? "…"}</td>
              <td>
                {r ? <span className={`verdict-tag ${r.verdict}`}>{VERDICT_LABEL[r.verdict]}</span> : "…"}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
