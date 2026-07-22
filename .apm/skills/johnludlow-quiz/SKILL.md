---
name: johnludlow-quiz
description: "Structured question skill: interviews the user in chat for narrow decisions, or generates a questionnaire document for broad decisions, and lets the user switch between the two modes at any point in the session"
---

# Quiz

## Overview

This skill gives any agent a structured way to surface decisions that only
the user can answer, before the agent acts on assumptions. It carries one
underlying model of open questions and answers, rendered in whichever mode
fits the breadth of the decisions.

**Default bias: ask.** When in any doubt about what the user wants, ask
rather than assume. A brief question is always cheaper than rework caused
by a wrong guess. This skill exists precisely because agents are prone to
ploughing ahead on assumptions — use it early and often.

Use this skill when:

- a task has decisions the agent cannot resolve from the codebase, docs, or
  history alone
- the agent could make a reasonable guess, but the cost of guessing wrong
  is non-trivial
- the agent is uncertain whether a choice is a fact (answerable from the
  codebase) or a decision (answerable only by the user) — when in doubt,
  treat it as a decision and ask
- a small number of narrow decisions can be resolved in a few conversational
  turns
- a large number of decisions, or decisions spanning multiple areas, would
  benefit from a document the user can fill in at their own pace
- the user wants to change how they are being asked mid-session, in either
  direction

Examples of decisions this skill handles:

- **Planning**: scope, target audience, acceptance criteria, plan target
- **Implementation**: which library to use, pattern A vs pattern B, how to
  handle an edge case, API design choices
- **Documentation**: audience, depth, which topics to cover
- **Testing**: test strategy, which frameworks to use, coverage expectations
- **Any context**: trade-offs the codebase cannot answer for the user

This skill is provider- and harness-agnostic. It uses only plain
conversation and standard file read/write — no issue-tracker native
blocking, labels, or child-issue creation, and no harness-specific slash
command syntax.

## Core Model

Every quiz session tracks the same state regardless of which mode is
rendering it:

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

**When uncertain whether something is a fact or a decision, treat it as a
decision and ask the user.** A brief clarifying question is always
preferable to a silent assumption that turns out to be wrong.

## When This Skill is Invoked

When this skill is invoked, follow these steps:

1. Determine the scope and make a judgement about
   - Scope
   - Complexity
   - Depth of shared understanding

2. Determine which mode (In-Chat Interview vs Questionnaire)
   - If the user has asked you to operate in a particular mode, continue in
     that mode until instructed otherwise, continue to step 4
   - If a prior decision has been made in this session about what mode to
     operate in, continue in that mode until instructed otherwise, continue
     to step 4
   - If a CONTRIBUTING.md or AGENTS.md document rules about what mode to
     operate in, continue in that mode until instructed otherwise, continue
     to step 4
   - If the ***Scope*** is ***small***, AND the ***Complexity*** is
     ***simple***, AND the ***shared understanding*** is ***deep*** AND
     ***complete***, use an in-chat interview (Mode A)
   - If the ***Scope*** is ***large***, OR the ***Complexity*** is
     ***complex***, OR the ***shared understanding*** is ***shallow*** OR
     ***nonexistent***, use a separate questionnaire document (Mode B).

## Mode A — In-Chat Interview

Default mode. Use when the open-decision count is small and narrow in scope
(a rough guide: five or fewer open decisions, all in one area).

Behaviour:

- Ask one decision at a time. Wait for the answer before asking the next.
- Resolve facts yourself by exploring the codebase; never ask the user
  something you can look up.
- When a user's phrasing conflicts with existing terminology (in code,
  `CONTEXT.md`, or earlier in the session), call it out and ask which is
  correct rather than guessing.
- When you have resolved every decision, restate the objective and the full
  set of resolved decisions, then stop and ask for confirmation before
  proceeding. Do not act until the user confirms shared understanding has
  been reached.

## Mode B — Questionnaire Document

Use when the open-decision count is large or spans multiple unrelated areas
(a rough guide: more than five open decisions, or decisions spanning multiple
unrelated areas), or whenever the user asks for a questionnaire directly.

Behaviour:

1. Resolve as many facts as possible by exploring the codebase before
   writing the document — the document should only contain decisions, not
   facts.
2. Generate a single markdown file from
   `assets/clarify-questionnaire-template.md` (relative to this skill).
   Ask the user where to put the document.
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

- Default to asking the user when in any doubt — a brief question is
  always cheaper than rework from a wrong assumption.
- Keep the human user in control of which mode is active; only switch modes
  on explicit user request, or by proposing a switch and waiting for
  agreement — never switch silently.
- Resolve facts by exploring the repository; never put a fact to the user as
  if it were a decision.
- Put every decision to the user and wait for their answer; never answer a
  decision on the user's behalf, including while processing a returned
  questionnaire.
- Reach and restate shared understanding — objective plus every resolved
  decision — before proceeding to the next step.
- Preserve already-resolved decisions across a mode switch; never re-ask a
  resolved decision.
- Produce questionnaire documents that pass `rumdl check .` and follow the
  structure in `assets/clarify-questionnaire-template.md`.

The agent MUST NOT:

- Assume when it could ask — guessing saves one message but can cost an
  entire rework cycle.
- Depend on issue-tracker native features (blocking, labels, child-issue
  creation) to represent open or resolved decisions.
- Depend on any harness-specific chat feature beyond plain conversational
  turns and standard file read/write.
- Proceed before the user has confirmed shared understanding.
- Continue asking questions in chat while a questionnaire document is
  outstanding, unless the user asks to switch back.

## Relationship to Other Skills and Commands

- Use `johnludlow-issue-management` when the resolved objective needs a home
  in a provider-native system (GitHub issue, Azure DevOps work item) — this
  skill only surfaces and resolves decisions, it does not decide where
  resulting artifacts live.
- Use `johnludlow-markdown-standards` for the structure and formatting of any
  questionnaire document produced by this skill.

## Examples

### Planning — small scope (Mode A)

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

### Planning — large scope (Mode B)

> User: We need multi-tenant billing support across the whole platform.
>
> Agent: This spans billing, auth, and provisioning — more open decisions
> than a chat interview handles well. I've drafted a questionnaire with the
> facts I could confirm from the code and the open decisions I need from
> you. Take your time and hand it back when ready.

### Implementation — library choice (Mode A)

> User: Implement the CSV export feature from the plan.
>
> Agent: The plan says "export to CSV" but doesn't specify a library. The
> project already uses `papaparse` for CSV parsing in the import flow (a
> fact). One decision: should I use `papaparse` for export too, or do you
> prefer a different library?
>
> User: Use papaparse.
>
> Agent: Understood. Using papaparse for CSV export, consistent with the
> existing import flow. Confirm before I proceed?

### Implementation — design pattern (Mode A)

> User: Add retry logic to the API client.
>
> Agent: The API client currently has no retry logic (a fact). Two
> decisions: (1) should retries use exponential backoff or fixed intervals?
> (2) What is the maximum retry count?
>
> User: Exponential backoff, max 3 retries.
>
> Agent: Understood. Exponential backoff with a maximum of 3 retries.
> Confirm before I proceed?

### Documentation — audience (Mode A)

> User: Document the authentication module.
>
> Agent: The auth module has inline JSDoc but no standalone documentation
> (a fact). One decision: is this documentation aimed at API consumers
> (external), or at developers maintaining the module (internal)?
>
> User: Internal — for maintainers.
>
> Agent: Understood. Internal maintainer documentation for the auth module.
> Confirm before I proceed?
