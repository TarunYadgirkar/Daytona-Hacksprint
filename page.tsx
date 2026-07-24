import PipelineView from "@/components/PipelineView";
import { STAGED_PRS } from "@/lib/fixtures/prs";

export default function Page() {
  return (
    <>
      <header className="masthead">
        <h1>SafeShip</h1>
        <p>Most review tools ask whether the diff looks right. This one tries to break what the PR claims.</p>
      </header>
      <PipelineView prs={STAGED_PRS} />
    </>
  );
}
