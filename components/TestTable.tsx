"use client";

/**
 * The evidence table. Two columns of outcome, because a single "did it pass"
 * column would hide the only thing that makes the result meaningful.
 */

import type {
  AdversarialTest,
  SandboxTestResult,
  TestVerdict,
} from "@/lib/types";

const VERDICT_LABEL: Record<TestVerdict, string> = {
  claim_upheld: "claim held",
  claim_broken: "claim broken",
  test_inconclusive: "inconclusive",
  test_errored: "errored",
};

const VERDICT_EXPLANATION: Record<TestVerdict, string> = {
  claim_upheld:
    "Failed before and passed after. This execution supports the PR's claim.",
  claim_broken:
    "Failed before and still failed after. This execution falsifies the PR's claim.",
  test_inconclusive:
    "Passed against both revisions. It never distinguished the fix from the old code.",
  test_errored:
    "The harness did not execute cleanly. This is unavailable evidence, not a code verdict.",
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

  const counts = {
    conclusive: results.filter(
      (result) =>
        result.verdict === "claim_upheld" ||
        result.verdict === "claim_broken",
    ).length,
    broken: results.filter((result) => result.verdict === "claim_broken").length,
    inconclusive: results.filter(
      (result) => result.verdict === "test_inconclusive",
    ).length,
    errored: results.filter((result) => result.verdict === "test_errored").length,
  };

  return (
    <>
      <div className="evidence-counts" aria-label="Evidence result summary">
        <span>
          <strong>{counts.conclusive}</strong> conclusive
        </span>
        <span>
          <strong>{counts.broken}</strong> broken
        </span>
        <span>
          <strong>{counts.inconclusive}</strong> inconclusive
        </span>
        <span>
          <strong>{counts.errored}</strong> errored
        </span>
      </div>

      <div className="tests-scroll" tabIndex={0} aria-label="Adversarial test results">
        <table className="tests">
          <thead>
            <tr>
              <th>Attack</th>
              <th>Before</th>
              <th>After</th>
              <th>Verdict</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((test) => {
              const result = results.find(
                (candidate) => candidate.testId === test.id,
              );
              return (
                <tr key={test.id}>
                  <td>
                    <strong>{test.name}</strong>
                    <span className="hyp">{test.hypothesis}</span>
                    <details className="test-detail">
                      <summary>View generated test code</summary>
                      <pre>{test.code}</pre>
                    </details>
                    {result && (
                      <div className="execution-output">
                        <details>
                          <summary>stdout</summary>
                          <pre>{result.stdout || "(empty)"}</pre>
                        </details>
                        <details>
                          <summary>stderr</summary>
                          <pre>{result.stderr || "(empty)"}</pre>
                        </details>
                      </div>
                    )}
                  </td>
                  <td className={`outcome ${result?.before ?? ""}`}>
                    {result?.before ?? "…"}
                  </td>
                  <td className={`outcome ${result?.after ?? ""}`}>
                    {result?.after ?? "…"}
                  </td>
                  <td>
                    {result ? (
                      <>
                        <span className={`verdict-tag ${result.verdict}`}>
                          {VERDICT_LABEL[result.verdict]}
                        </span>
                        <span className="verdict-explanation">
                          {VERDICT_EXPLANATION[result.verdict]}
                        </span>
                      </>
                    ) : (
                      "…"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
