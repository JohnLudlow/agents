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

### ✓ BLOCKER 0: Preference Resolution

Before proceeding with interviews or questionnaires, resolve any setup
preferences. These are _not_ subject to user assumptions — they MUST be
documented in the repository or explicitly confirmed.

**Setup preferences this skill requires:**

- **Preference 1: Output destination** — Are results recorded as a GitHub
  issue, Azure DevOps work item, local file, or inline message?
- **Preference 2: File storage location** (if using local files) — Which
  directory should questionnaire documents or output files live in?

**Gate logic (deterministic):**

1. Check `CONTRIBUTING.md` (and `AGENTS.md` if present) for documented preferences on
   output destination and file storage paths
2. If preferences are found in repo: use them (no user question needed)
3. If preferences NOT found in repo:
   - MUST ask the user (no silent assumption allowed)
   - MUST present the user with specific choices:
     - Output destination: "GitHub issue", "Azure DevOps work item",
       "Local file", "Inline message"
     - File location (if Local file selected): "docs/plans/" (preferred for planning agents),
       or a custom path under the calling agent's allowed write locations?
   - MUST wait for answer
   - MUST offer to record the preference: "Would you like me to record
     this preference in CONTRIBUTING.md or AGENTS.md for future sessions?
     (Yes / No)" — this is not optional; always offer
   - If user confirms: document the preference in the appropriate file with
     timestamp and context (e.g., "Recorded by johnludlow-quiz on YYYY-MM-DD")

**Completion criterion:** Preferences are resolved AND user has been offered
recording opportunity AND offer was either accepted (preference recorded) OR
explicitly declined (user chose not to record).

---

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
2. Preferences (output destination and file storage location) have already
   been resolved in BLOCKER 0. Use the resolved preferences to determine:
   - Whether to generate a document (if local file selected) or to return
     resolved decisions inline (if inline message selected)
   - Where to save the document (using the file storage location from
     BLOCKER 0)
3. If generating a document: Generate a single markdown file from
   `assets/clarify-questionnaire-template.md` (relative to this skill),
   stored at the location determined in step 2.
4. Populate the Objective, Facts, and Open Decisions sections. Leave
   Resolved Decisions and Deferred / Out of Scope empty unless the session
   already produced some before switching to this mode.
5. Tell the user where the file is and that they can answer inline under
   each question, then hand it back when ready. Do not continue asking
   questions in chat while a questionnaire is outstanding, unless the user
   asks to switch back (see Mode Switching).
6. When the user returns the file, read it, move every answered item from
   Open Decisions to Resolved Decisions with its answer recorded, and treat
   any newly surfaced questions the answers raise as new Open Decisions.
7. Repeat until no open decisions remain, then restate the objective and the
   full set of resolved decisions and stop for confirmation, exactly as in
   Mode A.

## Mode Switching

The user may switch modes at any point in either direction. For details on
switching logic (chat ↔ questionnaire), see **[BRANCHING.md](references/BRANCHING.md)**.

## Requirements

The agent MUST:

- **Preference Resolution (BLOCKER 0):** Before any interview or questionnaire,
  MUST check CONTRIBUTING.md and AGENTS.md for documented preferences (output
  destination, file storage location). If not found, MUST present the user
  with specific choices (GitHub issue, Azure DevOps work item, local file,
  inline message) and wait for answer. MUST offer to record preferences after
  user answer (offer is not optional).
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

See **[DEPENDENCIES.md](references/DEPENDENCIES.md)** for relationships to johnludlow-issue-management,
johnludlow-markdown-standards, johnludlow-planning-workflow, and johnludlow-subagent-spawning.

## Examples

For concrete examples of Mode A (chat interview) and Mode B (questionnaire
document) across planning, implementation, documentation, and testing contexts,
see **[EXAMPLES.md](references/EXAMPLES.md)**.
