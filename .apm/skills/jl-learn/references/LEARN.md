# Learn — workflow reference

Entry point: `/jl-learn`. The user invokes the skill with the thing to learn
(the "goal" — a concept, term or topic).

## Resolve configuration (BLOCKER 0)

Resolve settings from the `jl_learn` block in `CONTRIBUTING.md` and
`AGENTS.md` through `jl-config` (same pattern as `jl-quiz/SKILL.md` BLOCKER
0). The schema accepts the generic settings: `quiz_mode`,
`plan_destination`, `file_storage_location`. If a required value is missing,
ask the user with explicit options and continue.

## Explain (AC1)

1. The agent explains the goal/concept in plain language, with the user in
   control of the depth of the explanation.
2. The agent lists the key takeaway points (2–3).

## Resources and takeaways (AC1)

1. The agent lists 3–5 resources relevant to the topic (links where
   available, file paths in the repository where relevant).
2. The agent restates the key takeaways.

## Knowledge check offer (AC1)

The agent asks whether a knowledge check is useful:

> "Would you like me to run a quick knowledge check on this?"

## Record the check outcome (AC1)

The agent records the user's outcome against the check:

- **Completed** — the user says they completed the check; record it as
  completed with the user's own summary.
- **Skipped** — the user chooses not to do it or declines; record it as
  **skipped** (AC1: completed and user-skipped outcomes remain distinct).

A skipped check is never recorded as completed or verified.
