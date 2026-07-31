# Mode Switching

The user may redesignate the session's mode at any point, in either direction.
Mode switching is a projection of the same underlying state, not a restart —
never re-ask a decision that is already Resolved.

## Chat to Questionnaire

Triggered by explicit user request ("make this a questionnaire", "let's put
this in a document instead"), or proposed by the agent when the open-decision
count or breadth grows mid-interview past the Mode B guide above.

1. Snapshot the current Objective, Facts, Resolved Decisions, and Open
   Decisions.
2. Generate the questionnaire document as in Mode B, pre-populated with the
   snapshot — resolved items go straight into Resolved Decisions, not back
   into Open Decisions.
3. Tell the user the file has been created and pause chat-mode questioning.

## Questionnaire to Chat

Triggered by explicit user request ("let's just talk through the rest",
"I'd rather answer these in chat").

1. Read the questionnaire document as it currently stands, including any
   partial answers.
2. Import every answered item into Resolved Decisions and every unanswered
   item into Open Decisions.
3. Resume Mode A, asking one open decision at a time. Do not regenerate or
   delete the document — if the user switches back to questionnaire mode
   later, re-sync it from the current state rather than starting a new file.
