---
name: johnludlow-clarify-requirements
description: "Adaptive requirements-clarification skill: interviews the user in chat for small features, or generates a questionnaire document for large features, and lets the user switch between the two modes at any point in the session"
---

# Clarify Requirements

## Overview

This skill closes the gap between what a user asks for and what an agent
builds, before planning or implementation starts. It replaces two narrower
ideas — a relentless one-question-at-a-time chat interview, and a
tracker-issue-backed map for oversized efforts — with a single skill that
carries one underlying model of open questions and answers, rendered in
whichever mode fits the size of the change.

Use this skill when:

- intent is fuzzy and needs sharpening before a plan or spec is written
- a feature is small enough to clarify in a few conversational turns
- a feature is large enough that a chat interview would feel like an
  interrogation, and a document the user can fill in at their own pace is a
  better fit
- the user wants to change how they are being asked mid-session, in either
  direction

This skill is provider- and harness-agnostic. It uses only plain
conversation and standard file read/write — no issue-tracker native
blocking, labels, or child-issue creation, and no harness-specific slash
command syntax.

## Core Model

Every clarification session tracks the same state regardless of which mode
is rendering it:

- **Objective** — a one-line statement of what is being built or decided.
- **Facts** — answerable by exploring the repository or codebase. The agent
  resolves these itself and never puts them to the user.
- **Decisions** — answerable only by the user. These are put to the user and
  waited on; the agent must not answer on the user's behalf.
- **Resolved** — decisions that have been answered, with the answer recorded
  against the decision.
- **Open** — decisions not yet answered.
- **Deferred / Out of scope** — decisions consciously not being made in this
  session.

Facts vs. decisions is a hard split: if a question can be answered by
reading the codebase, docs, or history, answer it yourself. Only put
decisions to the user. Do not blur this line even when working through a
questionnaire document alone — a document is still the user's side of the
exchange, not license to fill in their answers for them.

## Mode A — In-Chat Interview

Default mode. Use for small features, bug fixes, or any change where the
open-decision count is small and narrow in scope (a rough guide: five or
fewer open decisions, all in one area of the system).

Behaviour:

- Ask one decision at a time. Wait for the answer before asking the next.
- Resolve facts yourself by exploring the codebase; never ask the user
  something you can look up.
- When a user's phrasing conflicts with existing terminology (in code,
  `CONTEXT.md`, or earlier in the session), call it out and ask which is
  correct rather than guessing.
- When you have resolved every decision, restate the objective and the full
  set of resolved decisions, then stop and ask for confirmation before
  proceeding to planning or implementation. Do not act on the plan until the
  user confirms shared understanding has been reached.

## Mode B — Questionnaire Document

Use for large or broad features, where the open-decision count is large or
spans multiple unrelated areas (a rough guide: more than five open
decisions, or decisions spanning multiple unrelated areas of the system), or
whenever the user asks for a questionnaire directly.

Behaviour:

1. Resolve as many facts as possible by exploring the codebase before
   writing the document — the document should only contain decisions, not
   facts.
2. Generate a single markdown file from
   `assets/clarify-questionnaire-template.md` (relative to this skill),
   defaulting to `docs/clarify/<slug>.questionnaire.md` (ask the user if a
   different location is preferred).
3. Populate the Objective, Facts, and Open Decisions sections. Leave
   Resolved Decisions and Deferred / Out of Scope empty unless the session
   already produced some before switching to this mode.
4. Tell the user where the file is and that they can answer inline under
   each question, then hand it back when ready. Do not continue asking
   questions in chat while a questionnaire is outstanding, unless the user
   asks to switch back (see Mode Switching).
5. When the user returns the file, read it, move every answered item from
   Open Decisions to Resolved Decisions with its answer recorded, and treat
   any newly surfaced questions the answers raise as new Open Decisions.
6. Repeat until no open decisions remain, then restate the objective and the
   full set of resolved decisions and stop for confirmation, exactly as in
   Mode A.

The document is deliberately incomplete while decisions remain open — do not
guess at answers to speed this up, and do not invent structure the user
hasn't asked for beyond the template.

## Mode Switching

The user may redesignate the session's mode at any point, in either
direction. Mode switching is a projection of the same underlying state, not
a restart — never re-ask a decision that is already Resolved.

### Chat to questionnaire

Triggered by explicit user request ("make this a questionnaire", "let's put
this in a document instead"), or proposed by the agent when the open-decision
count or breadth grows mid-interview past the Mode B guide above.

1. Snapshot the current Objective, Facts, Resolved Decisions, and Open
   Decisions.
2. Generate the questionnaire document as in Mode B, pre-populated with the
   snapshot — resolved items go straight into Resolved Decisions, not back
   into Open Decisions.
3. Tell the user the file has been created and pause chat-mode questioning.

### Questionnaire to chat

Triggered by explicit user request ("let's just talk through the rest",
"I'd rather answer these in chat").

1. Read the questionnaire document as it currently stands, including any
   partial answers.
2. Import every answered item into Resolved Decisions and every unanswered
   item into Open Decisions.
3. Resume Mode A, asking one open decision at a time. Do not regenerate or
   delete the document — if the user switches back to questionnaire mode
   later, re-sync it from the current state rather than starting a new file.

## Requirements

The agent MUST:

- Keep the human user in control of which mode is active; only switch modes
  on explicit user request, or by proposing a switch and waiting for
  agreement — never switch silently.
- Resolve facts by exploring the repository; never put a fact to the user as
  if it were a decision.
- Put every decision to the user and wait for their answer; never answer a
  decision on the user's behalf, including while processing a returned
  questionnaire.
- Reach and restate shared understanding — objective plus every resolved
  decision — before proceeding to planning or implementation.
- Preserve already-resolved decisions across a mode switch; never re-ask a
  resolved decision.
- Produce questionnaire documents that pass `rumdl check .` and follow the
  structure in `assets/clarify-questionnaire-template.md`.

The agent MUST NOT:

- Depend on issue-tracker native features (blocking, labels, child-issue
  creation) to represent open or resolved decisions.
- Depend on any harness-specific chat feature beyond plain conversational
  turns and standard file read/write.
- Proceed to planning or implementation before the user has confirmed shared
  understanding.
- Continue asking questions in chat while a questionnaire document is
  outstanding, unless the user asks to switch back.

## Relationship to Other Skills and Commands

- Use `johnludlow-issue-management` once shared understanding is reached and
  the resolved objective needs a home (markdown plan, GitHub issue, or Azure
  DevOps work item) — this skill only clarifies requirements, it does not
  decide where the resulting plan lives.
- Use `johnludlow-markdown-standards` for the structure and formatting of any
  questionnaire document produced by this skill.
- This skill is upstream of `/flow-start`: a confirmed objective and resolved
  decision set from this skill is well-formed input to `/flow-start`'s story
  generation, not a replacement for it.

## Example

### Small feature (Mode A)

> User: Add a "remember me" checkbox to the login form.
>
> Agent: Looking at the login form now — it currently issues a session
> cookie with no explicit expiry (a fact, resolved by reading the code).
> One decision: when "remember me" is checked, how long should the session
> last?
>
> User: 30 days.
>
> Agent: Understood. Objective: add a "remember me" checkbox that extends
> the session to 30 days when checked. Resolved: session length is 30 days
> when checked, unchanged otherwise. Confirm before I proceed?

### Large feature (Mode B)

> User: We need multi-tenant billing support across the whole platform.
>
> Agent: This spans billing, auth, and provisioning — more open decisions
> than a chat interview handles well. I've drafted
> `docs/clarify/multi-tenant-billing.questionnaire.md` with the facts I could
> confirm from the code and the open decisions I need from you. Take your
> time and hand it back when ready.
