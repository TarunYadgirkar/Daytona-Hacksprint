const METHODS = [
  ["Fireworks", "attack generation"],
  ["Daytona", "execution"],
  ["CodeRabbit", "opinion"],
  ["Braintrust", "trace"],
  ["CopilotKit", "interrogation"],
] as const;

export default function MissionHeader() {
  return (
    <header className="mission-header">
      <div className="mission-brand">
        <span className="wordmark">Popper</span>
        <span className="mission-index">Adversarial verification / 01</span>
      </div>
      <div className="mission-copy">
        <p className="eyebrow">Evidence before confidence</p>
        <h1>
          Do not trust the diff.
          <span>Test the claim.</span>
        </h1>
        <p className="mission-deck">
          Extract the promise. Generate attacks. Execute both revisions.
          Compare proof with review. Leave the call to a human.
        </p>
      </div>
      <ol className="method-trace" aria-label="Popper integration trace">
        {METHODS.map(([name, role], index) => (
          <li key={name}>
            <span aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <strong>{name}:</strong> {role}
          </li>
        ))}
      </ol>
    </header>
  );
}
