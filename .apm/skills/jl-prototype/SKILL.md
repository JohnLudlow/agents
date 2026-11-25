---
name: jl-prototype
description: "Prototyping skill: generates a time-boxed, stack-agnostic prototype on its own branch after running jl-quiz to confirm shared understanding. Use when the user wants to sanity-check an idea, try out a technique, or build a throwaway demo before committing to real implementation."
---

# Prototype

## Overview

This skill produces a time-boxed prototype — runnable code, an IaC deployment,
a visual/UX mockup, a docs sample, or an architecture sketch — that
demonstrates one technique against one stated requirement set. It never starts
generating without first running `jl-quiz` to confirm what is actually being
tried and why; a prototype built on an assumption is wasted effort twice over.

A prototype is not a first draft of production code. It exists to answer one
question — "does this technique work / feel right / meet the requirement?" —
and then either evolves or gets discarded. Keep that framing: the `jl-quiz`
questions exist to pin down the question before any artifact gets written.

This skill also supports nested subagent delegation when a prototype session
surfaces work that is too broad, benefits from parallel execution, or needs a
specialist agent. Delegation is additive, not a replacement for the prototype
flow: `jl-prototype` owns the parent quiz, branch strategy, artifact
consolidation, and final handoff.

## Core Model

- **Objective** — the one question the prototype exists to answer.
- **Technique** — the specific approach, pattern, or idea demonstrated.
- **Stack** — the language, framework, or tooling the prototype is built in.
- **Keep-vs-discard intent** — whether the user expects to evolve this into
  real work or throw it away once the question is answered.
- **Branch** — the git branch the prototype lives on; never the user's
  pre-existing working branch.
- **Parent prototype branch** — the session's top-level `prototype/<slug>` branch.
- **Delegated subtask** — a bounded child task spun out for separation or parallel
  execution; its artifacts are consolidated by the parent flow.
- **Prototype report** — the roll-up of quiz decisions, delegated results,
  self-check outcomes, and keep/discard or merge recommendations.

## Load contract

Routine consumers read SKILL.md for the core rules. Read
[references/DELEGATION_WORKFLOWS.md](references/DELEGATION_WORKFLOWS.md) for
delegation pseudocode and examples,
[references/BRANCH_WORKTREE.md](references/BRANCH_WORKTREE.md) for child worktree
hierarchy, [references/ARTIFACT_COLLECTION.md](references/ARTIFACT_COLLECTION.md)
for expected child outputs and consolidation rules, and
[references/EXAMPLES.md](references/EXAMPLES.md) for scenarios.

## Configuration

`jl-prototype` reads settings from `jl_approval_gates` configuration in
`CONTRIBUTING.md` and `AGENTS.md`, or inherits an already-resolved parent
session decision when invoked from `jl-recon`.

### Schema

| Setting | Type | Allowed values | Default | Meaning |
| --- | --- | --- | --- | --- |
| `jl_approval_gates.prototype_approval_required` | boolean | `true`, `false` | `true` | Controls whether delegated prototype subtasks require an approval prompt |

### Resolution rules

Resolve config before delegating any child task: prompt when
`prototype_approval_required` is `true`, skip the prompt when `false`, and
default to `true` when config is missing or malformed (human-in-the-loop by
default). The gate governs native delegation calls; it does not require a
second prompt after the child is approved for the same bounded subtask.

### Approval prompt

When `prototype_approval_required` is `true`, use this exact pattern:

`Delegate {task_type} to {target_agent}? [Approve] [Decline]`

If declined, record the gap in the prototype report and explain why delegation was needed.

## When Invoked

Follow these steps in order. Do not skip ahead to Generation while any step
below remains open. Read [references/DELEGATION_WORKFLOWS.md](references/DELEGATION_WORKFLOWS.md)
for the full pseudocode.

### 1. Run jl-quiz

Load and run `jl-quiz` now. Its BLOCKER 0 (preference resolution) and
mode selection apply unchanged — this skill does not duplicate or override
them.

Surface these decisions through the quiz (fold synonyms together; do not ask
about the same decision twice): Requirements, Interesting technique, Tech
stack, Audience & purpose, Keep vs discard, Acceptance criteria, Output
location — confirm the branch-based convention (step 2) fits.

If the quiz surfaces a design subquestion that is too large to resolve inside
the current prototype conversation, or clearly needs specialist expertise,
delegation is allowed at that point. The parent prototype flow still owns the
decision record and must fold the child result back into the session before
continuing.

**Completion criterion:** the quiz has reached and the user has confirmed shared
understanding — objective plus every resolved decision restated back to them —
exactly as `jl-quiz` requires; do not proceed to Generation until this is
confirmed unless the unresolved item was spun out as an approved delegated
subtask.

### 2. Create the branch

Create `prototype/<slug>` (short kebab-case derivation of the confirmed
objective). The prototype lives on its own branch, never on the branch the
user was already on. If the agent lacks branch-creation permission, stop and
ask the user how to proceed — do not write to the current branch silently.

**Completion criterion:** the branch exists and is checked out, or the user
has explicitly told you how to proceed without one.

### 3. Scaffold the artifact

Build the artifact the quiz-agreed requirements and technique call for in the
confirmed stack — runnable code, an IaC deployment, a visual/UX mockup, a docs
sample, or an architecture sketch, whichever the objective actually needs.

Keep it time-boxed: a prototype demonstrates the technique, it does not
productionise it. Stop scaffolding once the technique is demonstrated against
the confirmed acceptance criteria — resist the pull to keep polishing.

If implementation scope becomes too large for one prototype session, or if
parallel execution would materially improve throughput, delegation is allowed
here. Typical child agents: `jl-feature-implementer`,
`jl-feature-documenter`, `polyglot-test-agent`, `jl-feature-tester`.

### 4. Write the README

Write `README.md` from
[`assets/prototype-readme-template.md`](./assets/prototype-readme-template.md),
populated with the quiz-agreed objective, technique, stack, how to run it, and
keep/discard status.

### 5. Add and run the self-check

Add a self-check — a script, or explicit run/verify steps — that confirms the
technique is actually demonstrated, not just that the code compiles or the
file exists.

Run the self-check if the invoking agent has permission to execute it in this
environment; otherwise hand the exact steps to the user in your response and
wait for confirmation before treating the prototype as done. Expanded test or
verification work may be delegated when a specialist agent can produce better
coverage or run in parallel. **Completion criterion:** the self-check has
been run (by you or the user) and its pass/fail result is known, not merely
written down.

### 6. Route to review, then hand off

If keep-vs-discard was **evolve**, invoke `jl-feature-reviewer` on the
prototype before handoff (a throwaway artifact needs no quality gate when it
was resolved as discard). Hand off with the branch left local; never push or
open a PR unless the user asks in this session. If keep-vs-discard is
discard, offer to delete the branch; if evolve, keep it and say so. Include
child worktrees from delegated subtasks in the handoff and offer cleanup when
the parent prototype closes.

## Subagent Delegation

Delegate when one of these is true: a design subquestion surfaced during the
quiz is large enough to deserve its own bounded investigation; the
implementation work needed to demonstrate the prototype is too large for one
prototype session; test generation, validation, or self-check expansion
would benefit from a specialist testing agent; or the prototype has
independent subtasks that can run in parallel without losing parent control
of scope. The work needs external expertise already embodied in a repository
agent.

Do not delegate merely to avoid owning the prototype flow: `jl-prototype` must
still hold the parent objective, gate and record the delegation decision,
manage the branch and worktree hierarchy, collect child artifacts, and present
one consolidated report to the user.

### Recommended target agents

| Subtask type | Typical trigger | Target agent |
| --- | --- | --- |
| `design` | quiz reveals a deep design fork or specialist question | `jl-feature-planner` or another bounded design-capable agent |
| `implementation` | prototype code is too broad for one session | `jl-feature-implementer` |
| `test` | prototype artifacts need generated tests or broader validation | `polyglot-test-agent` or `jl-feature-tester` |
| `parallel-research` | independent research or validation can proceed concurrently | bounded specialist agent appropriate to the stack |

### Model Selection

Model selection for prototype delegations follows the shared hierarchy:
global default < per-agent default < per-type default < per-task override.

For `jl-prototype`, the per-agent default is: `claude-sonnet-5` for design
and parallel research, `gpt-4-turbo` for implementation, and
`claude-opus-4.5` for test-oriented validation when deeper reasoning matters.

Resolve models in this order: explicit `DelegationRequest.model`, then
`jl_subagent_models.overrides.<task-key>`, then
`jl_subagent_models.<delegation-type>`, then the `jl-prototype` per-agent
default for the current subtask, then `jl_subagent_models.default`.

If the selected model is unavailable in the current harness, fall through to
the next candidate and warn in the parent prototype report.

Example configuration:

```yaml
jl_subagent_models:
  default: "claude-sonnet-5"
  implementation: "gpt-4-turbo"
  test_generation: "claude-opus-4.5"
  overrides:
    prototype-auth-spike: "claude-opus-4.5"
```

## Approval Gate Integration

Approval gates apply at each delegation decision point, not only once at
session start.

### Session-level behaviour

1. Resolve `jl_approval_gates.prototype_approval_required`.
2. If `jl-prototype` was launched from `jl-recon`, inherit the parent
   session's already-resolved approval decision instead of re-prompting for
   the same bounded delegation.
3. If `prototype_approval_required` resolves to `true`, prompt the user
   before calling the target agent's native delegation.
4. If `prototype_approval_required` resolves to `false`, delegate without
   prompting.
5. If the user declines, use the configured fallback (see Resolution rules
   above).

### Double-approval avoidance

- Do not ask twice for the same bounded subtask just because the child agent
  has its own internal approval mechanism.
- The parent prototype gate authorizes the spawn of the child task; record in
  the prototype report that the parent already approved the child delegation.
- Child-agent gates still apply for further nested actions inside that child's
  own workflow that are broader than the approved parent request.

### Decline handling

If the user declines delegation: continue inline when practical, or mark the
subtask as manual with a short reason in the prototype report. Do not silently
drop the work item.

## Decision Gate

This skill's main decision gate is still the quiz-confirmed shared
understanding before generation. Subagent delegation adds narrower approval
gates inside that broader flow: before spinning out a delegated design
subquestion, before delegating a bounded implementation slice, before
delegating test generation or parallel validation.

If the prototype request grows materially, re-run the relevant quiz portion on
the delta rather than treating delegation as permission to expand scope
silently.

## Quiz Modes

`jl-quiz` Mode A and Mode B still apply unchanged. Delegation is an escape
valve when the selected quiz mode surfaces a subquestion that is too broad,
too specialist, or too parallelizable for the current parent prototype thread.

- Use inline quiz progression when the question can be resolved within the
  parent prototype session.
- Use delegation when resolving the subquestion separately will improve
  quality, speed, or clarity without losing parent control of scope.

## Guardrails

Refuse, and explain why, rather than working around: anything outside the quiz
confirmed objective (re-run the quiz on the delta instead); production-grade
deliverables (say so and ask whether they want the prototype skill or a real
implementation flow); mutating a real environment without explicit
action-specific approval; or anything that requires secrets or credentials to
run (a prototype that only works with real credentials has failed to be a
prototype).

## Requirements

The agent MUST:

- Run `jl-quiz` to completion — objective and every decision confirmed by the
  user — before writing any artifact, except for a bounded delegated subtask
  approved through the prototype delegation gate.
- Create and use a dedicated `prototype/<slug>` branch, or get explicit user
  direction when branch creation is unavailable.
- Write `README.md` from `assets/prototype-readme-template.md`.
- Include a self-check and know its result (pass/fail) before calling the
  work done.
- Invoke `jl-feature-reviewer` when keep-vs-discard resolves to evolve.
- Resolve prototype approval-gate configuration before delegating a child task.
- Keep delegated subtasks isolated in child worktrees and branches under the
  parent prototype branch.
- Collect delegated artifacts into one consolidated prototype report.
- Keep the branch local unless the user explicitly asks to push or open a PR.

The agent MUST NOT:

- Generate before shared understanding is confirmed.
- Scaffold anything outside the quiz-confirmed objective.
- Produce a production-grade deliverable under the guise of a prototype.
- Mutate a real environment without explicit, action-specific approval.
- Generate anything that requires secrets or credentials to run or verify.
- Delegate a child task without evaluating the effective prototype approval gate.
- Ask duplicative approval questions for the same bounded child delegation.
- Push, open a PR, or delete the branch without the user asking first.

## Examples

Read [references/EXAMPLES.md](references/EXAMPLES.md) for the three scenarios:
design quiz delegates implementation, prototype code delegates test
generation, and jl-recon prototype ticket delegates nested work.

## Relationship to Other Skills

- **jl-quiz** — mandatory pre-step; this skill's Objective, Technique,
  Stack, Audience & purpose, Keep vs discard, Acceptance criteria, and Output
  location decisions are all surfaced through it, not asked separately.
- **jl-recon** — may invoke this skill for Prototype tickets and may supply
  inherited approval-gate context for delegated prototype work.
- **jl-markdown-standards** — applies to the generated `README.md` and any
  markdown prototype report material.
- **jl-code-quality** — applies to any code the prototype contains,
  scaled to a time-boxed artifact rather than production code.
- **jl-issue-management** — not used directly; a prototype lives on a
  branch, not in an issue tracker.
- **jl-feature-implementer** — typical target for delegated implementation
  slices.
- **jl-feature-tester** — typical target for delegated validation work when a
  dedicated testing flow is needed.
- **jl-feature-reviewer** — invoked only when keep-vs-discard resolves
  to evolve.
- **polyglot-test-agent** — typical target for delegated cross-language test
  generation.
- **Wayfinder** (future) — will reference this skill as one of the paths it
  can route into; this skill remains standalone-referenceable and does not
  depend on Wayfinder.

## References

- [jl-recon](../jl-recon/SKILL.md) — parent ticket routing and AFK delegation
  pattern this skill can inherit from
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) — repository configuration and
  approval-gate defaults

## Assets

- `assets/prototype-readme-template.md` — template for the generated
  `README.md`. See step 4 above for usage.
