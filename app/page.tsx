import AccessBoundary from "@/components/AccessBoundary";
import PipelineView from "@/components/PipelineView";
import { STAGED_PRS } from "@/lib/fixtures/prs";

export default function Page() {
  return (
    <>
      <header className="masthead">
        <h1>SafeShip</h1>
        <p>Most review tools ask whether the diff looks right. This one tries to break what the PR claims.</p>
      </header>
      <AccessBoundary>
        <PipelineView
          prs={STAGED_PRS}
          gateMode={
            process.env.SAFESHIP_GATE_MODE === "recorded"
              ? "recorded_fixture"
              : "live"
          }
          braintrustConfigured={Boolean(process.env.BRAINTRUST_API_KEY)}
        />
      </AccessBoundary>
    </>
  );
}
