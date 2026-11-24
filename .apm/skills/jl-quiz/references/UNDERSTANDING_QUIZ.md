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

## Record the outcome (AC008)

The user's choice is recorded against the check: done / skipped / deferred
/ declined — and nothing is recorded as verified understanding unless the
user said they did it (AC008: skip, defer, and decline outcomes are
recorded without fabricating evidence of verified understanding; AC016: a
declined check is never described as verified understanding).

## Run the check when chosen

When the user says the check, the agent poses the check question(s) and
evaluates the user's answers: a clear answer is recorded as verified
understanding for this check; a mismatch is clarified by default (asking
for the user's reasoning first).

The rest of the Understanding Quiz (scenario and trade-off questions
after an accepted check, depth control, mismatch proceed recording,
Understanding Quiz ticket creation — AC011–AC019) is owned by later
phases of [JohnLudlow/agents#210](https://github.com/JohnLudlow/agents/issues/210).
