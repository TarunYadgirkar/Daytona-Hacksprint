import { connection } from "next/server";
import MissionHeader from "@/components/MissionHeader";
import PipelineView from "@/components/PipelineView";
import { STAGED_PRS } from "@/lib/fixtures/prs";

export default async function Page() {
  await connection();

  return (
    <>
      <MissionHeader />
      <PipelineView
        prs={STAGED_PRS}
        gateMode={
          process.env.POPPER_GATE_MODE === "recorded"
            ? "recorded_fixture"
            : "live"
        }
        braintrustConfigured={Boolean(process.env.BRAINTRUST_API_KEY)}
      />
    </>
  );
}
