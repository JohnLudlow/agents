---
name: jl-quiz
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

## Configuration

jl-quiz reads settings from `jl_quiz` configuration in `CONTRIBUTING.md`
and `AGENTS.md`. It uses `jl-config` only for the generic resolution
mechanism; jl-quiz itself owns this schema, its defaults, and its
validation.

### Schema

| Setting | Type | Allowed values | Default | Sensitivity |
| --- | --- | --- | --- | --- |
| `quiz_mode` | string | `a`, `b` | `a` | recommended |
| `plan_destination` | string | `github_issue`, `azure_devops_work_item`, `local_file`, `inline_message` | none | required |
| `file_storage_location` | string | repository-relative path | `docs/plans/` | recommended |

### Validation and defaults

- validate that `jl_quiz`, if present, is an object
- validate `quiz_mode` against the `a` / `b` enum
- validate `plan_destination` against the documented destination enum
- validate `file_storage_location` as a repository-relative string when present
- use defaults for recommended settings when absent
- prompt the user only if required `plan_destination` is still unresolved or
  unusable for the current session

### Example configuration

In `CONTRIBUTING.md`:

```yaml
jl_quiz:
  quiz_mode: a
  plan_destination: github_issue
  file_storage_location: docs/plans/
```

In `AGENTS.md`:

```yaml
jl_quiz:
  quiz_mode: b
```

## When This Skill is Invoked

When this skill is invoked, follow these steps:

### ✓ BLOCKER 0: Resolve `jl_quiz` Configuration via `jl-config`

Before proceeding with interviews or questionnaires, resolve setup
preferences through `jl-config`.

**Settings this skill consumes from `jl_quiz`:**

- `quiz_mode`
  - `a` = in-chat interview
  - `b` = questionnaire/document-first workflow
- `plan_destination`
  - `github_issue`
  - `azure_devops_work_item`
  - `local_file`
  - `inline_message`
- `file_storage_location`
  - repository-relative path used when artifacts must be written locally

**Resolution logic (deterministic):**

1. Read `AGENTS.md` if it exists.
2. Read `CONTRIBUTING.md` if it exists.
3. Call `jl-config`'s generic resolution mechanism for the `jl_quiz` key:
   - start from jl-quiz's documented defaults
   - merge `CONTRIBUTING.md`
   - merge `AGENTS.md`
4. Validate the resolved `jl_quiz` object against jl-quiz's own schema:
   - `quiz_mode` must be `a` or `b`
   - `plan_destination` must be one of the documented destination values
   - `file_storage_location`, if present, must be a repository-relative path
5. Use the resolved values for `quiz_mode`, `plan_destination`, and
   `file_storage_location`.
6. If a required value still cannot be used safely in the current session,
   ask the user with explicit options and continue with their session answer.

**Graceful fallback rules:**

- Do not treat a missing config file as an error; use the `jl-config`
  mechanism with jl-quiz's own defaults first.
- Do not keep hardcoded config logic outside this documented `jl_quiz`
  schema; jl-config only resolves, while jl-quiz owns defaults and
  validation.
- If `plan_destination` resolves to `local_file`, use the resolved
  `file_storage_location`; if that path is missing or unusable in the current
  harness, ask the user where to place the file.
- If the resolved destination is provider-native and the current task still
  needs human approval before a write, pause for that approval as normal.
- If the user gives a session override, use it for this session and treat the
  config value as the repository default rather than the live instruction.

**Completion criterion:** The skill has resolved usable values for
`quiz_mode`, `plan_destination`, and `file_storage_location` from
resolved `jl_quiz` config, or has asked the user only for the still-missing
choice needed to proceed safely.

### Configuration Warnings

jl-quiz validates its configuration at startup and emits warnings (in the
format defined by jl-config) for:

#### Enum Violation — quiz_mode

```text
[WARN] jl-quiz: 'quiz_mode' has invalid value "c" (must be "a" or "b")
  File: AGENTS.md [line 8]
  Fix: Change to one of: a, b
```

#### Enum Violation — plan_destination

```text
[WARN] jl-quiz: 'plan_destination' has invalid value "slack_thread"
  (must be one of: github_issue, azure_devops_work_item, local_file,
  inline_message)
  File: CONTRIBUTING.md [line 12]
  Fix: Change to one of the allowed destination types
```

#### Missing Required Setting

```text
[WARN] jl-quiz: required setting 'plan_destination' not found
  in AGENTS.md or CONTRIBUTING.md
  File: (checked both config files)
  Fix: Add to CONTRIBUTING.md under jl_quiz: plan_destination: github_issue
```

#### Invalid File Path — absolute path

```text
[WARN] jl-quiz: 'file_storage_location' must be repository-relative
  (no leading /)
  File: AGENTS.md [line 10]
  Fix: Change "/docs/plans" to "docs/plans"
```

#### Type Mismatch — quiz_mode

```text
[WARN] jl-quiz: 'quiz_mode' must be a string ("a" or "b"), not a boolean
  File: CONTRIBUTING.md [line 5]
  Fix: Change the value to a string: quiz_mode: a
```

#### Invalid File Path — parent directory

```text
[WARN] jl-quiz: 'file_storage_location' must not contain ".."
  (parent directory traversal)
  File: CONTRIBUTING.md [line 9]
  Fix: Use a simple repository-relative path like "docs/plans"
```

#### Root Shape Error

```text
[WARN] jl-quiz: 'jl_quiz' config block must be an object, not a list
  File: AGENTS.md [line 5]
  Fix: Change the jl_quiz block to use YAML object syntax (key: value pairs)
```

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
   - If `jl_quiz.quiz_mode` resolves to a mode, continue
     in that mode until instructed otherwise, continue to step 4
   - If the ***Scope*** is ***small***, AND the ***Complexity*** is
     ***simple***, AND the ***shared understanding*** is ***deep*** AND
     ***complete***, use an in-chat interview (Mode A)
   - If the ***Scope*** is ***large***, OR the ***Complexity*** is
     ***complex***, OR the ***shared understanding*** is ***shallow*** OR
     ***nonexistent***, use a separate questionnaire document (Mode B),
     unless the resolved config or the user's active session instruction says
     otherwise.

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
   been resolved in BLOCKER 0 via `jl-config`. Use the resolved preferences
   to determine:
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
  MUST call `jl-config` to resolve `jl_quiz` from `CONTRIBUTING.md` and
  `AGENTS.md`, using jl-quiz's own schema, defaults, and validation. If the
  resolved values are still insufficient for safe progress, MUST ask the user
  only for the missing session choice and then continue.
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

See **[DEPENDENCIES.md](references/DEPENDENCIES.md)** for relationships to jl-issue-management,
jl-markdown-standards, jl-planning-workflow, and jl-subagent-spawning.

## Examples

For concrete examples of Mode A (chat interview) and Mode B (questionnaire
document) across planning, implementation, documentation, and testing contexts,
see **[EXAMPLES.md](references/EXAMPLES.md)**.
