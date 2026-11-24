## Ticket Types

Every type is human-in-the-loop by default. The exception is scoped
narrowly: Research may run AFK, and only with the human's explicit sign-off
for that specific ticket.

- **Research** — investigate to surface a fact a decision is waiting on
  (an API's behaviour, a library's constraints, how existing code does
  something). Ask the human before running it AFK; whether AFK or live, the
  human reviews and accepts the findings before the ticket closes.
- **Prototype** — raise the fidelity of a discussion with a cheap artifact
  to react to. Delegate to `jl-prototype` for the full flow
  (its own quiz, its own branch, its own self-check).
- **Quiz** — resolve a decision conversationally, one question at a
  time. Delegate to `jl-quiz`. A quiz is not exclusive to this
  ticket type — it can surface inside a Prototype ticket (commonly, to get
  feedback on what was just built) or a Research ticket (occasionally) —
  without changing that ticket's fixed type.
- **Task** — manual work that has to happen before a decision can be made
  (provisioning access, moving data, signing up for a service). Not a
  decision itself; it unblocks one. When a Task involves making source
  changes directly, it gets an isolated worktree — see
  `jl-subagent-spawning/SKILL.md` → Task Ticket Worktree-Trigger Detection
  for how that's determined (explicit `worktree: required` marker, then
  inference, defaulting to inline when ambiguous).
