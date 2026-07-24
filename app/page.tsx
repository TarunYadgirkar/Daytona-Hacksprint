import { connection } from "next/server";
import AccessBoundary from "@/components/AccessBoundary";
import MissionHeader from "@/components/MissionHeader";
import PipelineView from "@/components/PipelineView";
import { STAGED_PRS } from "@/lib/fixtures/prs";

export default async function Page() {
  await connection();

  return (
    <>
      <MissionHeader />
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
