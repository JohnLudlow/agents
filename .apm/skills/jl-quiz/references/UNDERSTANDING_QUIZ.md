# Understanding Quiz — workflow reference

Entry point: `/jl-quiz-understanding`. This is the Understanding Quiz
workflow, driven by the `jl_quiz_understanding` configuration block
(`jl_quiz_requirements.quiz_mode`, `plan_destination`,
`file_storage_location`), resolved through `jl-config` as described in
`jl-quiz/SKILL.md` BLOCKER 0.

## Offer a check (AC005)

The agent picks one specific thing worth the user demonstrating
understanding of — a term, concept or outcome (the "check") and states it
as the user's prompt, e.g. "Check: what happens to the main branch if a
merge contains a conflict — does the agent rebase, fast-forward or ask?"
The user then chooses the outcome (AC005–AC007, all user-chosen):

- "yes, I'll do it now" — the user will demonstrate understanding in this
  session (the check is offered);
- "skip" (AC006) — the user chooses not to do it this time;
- "defer" (AC007) — the user moves it to a later time or context.

## Record the outcome (AC008, AC016)

The user's choice is recorded against the check with an explicit state:

- **Done** — the user completed the check. Recorded as verified
  understanding of that check, with the user's own words quoted.
- **Skipped** — the user chose to skip the check. Recorded as skipped —
  nothing is recorded as verified understanding (AC008).
- **Deferred** — the user deferred the check to a later time or context.
  Recorded as deferred — nothing is recorded as verified understanding
  unless the user says otherwise when returning.
- **Declined** — the user declined the check. Recorded as declined — a
  declined check is never described as verified understanding (AC008, AC016).

The record stays honest about the outcome: a check that was skipped,
deferred or declined is never described as verified understanding.

## Run the check when chosen

When the user says the check, the agent poses the check question(s) and
evaluates the user's answers: a clear answer is recorded as verified
understanding for this check; a mismatch is clarified by default (asking
for the user's reasoning first).

## After an accepted check — scenario and trade-off questions (AC011, AC012)

When the user completes the check, the agent offers **2–5 optional scenario
or trade-off questions** (AC011): concrete scenario questions ("What happens
if X?") and trade-off questions ("Do you prefer Y or Z here?").

The user controls whether to explore questions in greater depth (AC012):

- "Go deeper / explore it" — the agent asks deeper questions;
- "Keep it short / that's enough" — the agent does not ask deeper
  follow-ups.

## Clarify mismatches by default (AC013)

When the user's answer shows a mismatch (their understanding differs from
the check or the goal model), the agent **clarifies by default** (AC013):
it restates the mismatch as a question and asks how to resolve it —
including adjusting the check — before recording anything as progress.

## Record the decision to proceed with an unresolved mismatch (AC014)

When the user decides to proceed despite an unresolved mismatch, the agent
**records the user's explicit decision to proceed** (AC014) — an entry in
the Understanding Quiz record such as "Proceeded with unresolved mismatch:
<the user's reason>".

## Record unresolved mismatches in map fog (AC015)

Unresolved mismatches (the user proceeds, but the mismatch is still
unclear) are recorded in the Recon map's fog of war (AC015) — the same fog
rule as the Requirements Quiz, with provider-native links and never a
floating reference.

## Understanding Quiz tickets (AC017–AC019)

- **Each offered understanding check has a separate Understanding Quiz
  ticket** (AC017) — every check the agent offers gets its own ticket,
  including a check the user declines.
- **The user approves ticket creation** (AC018) — a ticket is created only
  after the user says to go ahead. Before creation the ticket is validated
  against `jl-ticket-templates/assets/quiz-ticket-template.md` and the
  provider labels are applied.
- **Understanding checks do not replace existing planning gates** (AC019) —
  the check is additive: the agent continues whatever gates apply where the
  check happens; it never suppresses or substitutes them.
