# CLAUDE.md

Claude Code does not read `AGENTS.md` natively, so this file imports it. Keep shared project rules in `AGENTS.md` — this file holds only Claude-specific notes.

@AGENTS.md

## Working style for this repo

- This is a time-boxed hackathon build. Prefer a boring call that survives a dependency bump over an elegant one that breaks at 3am. Where those conflict, say so and pick boring.
- Read `docs/PROGRESS.md` before starting: it lists what is done, what is in flight, and who is on what.
- When you hit an external API surface you are unsure about, check the docs rather than guessing from memory. These five SDKs have all shipped breaking changes recently, and several are newer than any training cutoff.
- Update `docs/PROGRESS.md` in the same change as the work it describes, not afterwards.
