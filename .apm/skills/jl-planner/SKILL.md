---
name: jl-planner
description: "Planning skill for top-level planner behaviour. Use when defining how jl-planner should clarify scope, choose plan destinations, delegate bounded planning or research subtasks, and consolidate multi-agent planning outputs."
---

# jl-planner

## Overview

This skill defines the planning workflow used by the `jl-planner` agent. It
keeps the human in control, requires shared understanding before a planning
artifact is created, and supports bounded subagent delegation when a planning
session is too large, too parallel, or too specialized for one agent pass.

Delegation is additive, not a replacement for planning ownership: `jl-planner`
still owns the parent workflow, decision record, provider workflow checks,
artifact consolidation, and final acceptance loop.

## Core Model

Every `jl-planner` session carries the same state:

- **Planning objective** — the problem to plan, the intended outcome, and the
  decision horizon.
- **Plan target** — markdown plan, GitHub issue, Azure DevOps work item, or
  another approved destination.
- **Shared understanding** — the clarified scope, constraints, assumptions,
  non-goals, and acceptance criteria collected through the Requirements Quiz
  (`/jl-quiz-requirements`).
- **Master plan** — the canonical parent planning artifact for the session.
- **Delegated planning subtask** — a bounded child task for breakdown,
  research, risk analysis, or specialist planning.
- **Delegated artifact set** — returned child plan sections, research notes,
  recommendations, risks, and optional prototype/code artifacts.
- **Consolidated plan** — the merged planning output presented for acceptance
  or revision.

## Modes

1. **Inline planning** — one agent carries the scope end-to-end.
2. **Delegated breakdown planning** — splits a large epic or feature into bounded
   component-planning subtasks.
3. **Delegated research planning** — runs independent research subtasks in
   parallel, then folds results back into the parent plan.
4. **Delegated specialist planning** — asks a bounded specialist agent for
   detailed language-, framework-, or domain-specific planning.

## Load contract

Read [references/DELEGATION_WORKFLOWS.md](references/DELEGATION_WORKFLOWS.md)
for delegation pseudocode and examples, [references/WORKTREE_BRANCH.md](references/WORKTREE_BRANCH.md)
for child artifact isolation, [references/CONSOLIDATION.md](references/CONSOLIDATION.md)
for consolidation checks, [references/CONFIGURATION.md](references/CONFIGURATION.md)
for config example and workflow behaviour, [references/EXAMPLES.md](references/EXAMPLES.md)
for scenarios.

## Relationship to `jl-planning-workflow`

Load `jl-planning-workflow` first. Its five BLOCKERs remain the mandatory
preconditions for any planning artifact. This skill extends that workflow with
delegation-specific decision points after shared understanding has been reached
and before the final plan is accepted.

`jl-planner` MUST NOT use delegation to bypass:

- template compliance
- clarification via the Requirements Quiz (`/jl-quiz-requirements`)
- plan target confirmation
- provider workflow confirmation
- human approval for provider-native writes

## When to Delegate

Delegate only when the child task is bounded, reviewable, and materially
benefits from separation.

### Delegate Breakdown tasks when

- the feature or epic is too broad for one planning session
- components can be planned independently, then merged
- a parent plan needs parallel component decomposition
- a child planner returns a more detailed section than the parent inlines

Target: `jl-feature-planner`

### Delegate Research subtasks when

- API, dependency, library, or platform questions are independent
- research can run in parallel
- evidence gathering would block the parent plan if done serially
- the planner needs summarized findings, not raw exploration

Target: a research-capable agent for the harness and task, or inline fallback
when subagent spawning is unavailable.

### Delegate Specialist planning when

- a component benefits from language- or framework-specific planning
- architecture detail would overwhelm the parent thread
- a nested planner can own a focused quiz and return a sharper component plan

Target: `jl-feature-planner` or another bounded planning-capable agent

### Delegate Risk or security review subtasks when

- a component needs risk analysis before the master plan is finalized
- security-sensitive work benefits from a specialist review pass
- the planner needs a bounded risk memo rather than a full inline audit

Target: a risk-, review-, or security-capable specialist agent

## Approval Gate Integration

Delegation approval is controlled by `jl_approval_gates` configuration in
`CONTRIBUTING.md` or `AGENTS.md`.

### Configuration schema

| Setting | Type | Allowed values | Default | Meaning |
| --- | --- | --- | --- | --- |
| `jl_approval_gates.plan_approval_required` | boolean | `true`, `false` | `true` | Controls whether delegated planning subtasks require an approval prompt |

### Resolution rules

- Resolve config before any delegation decision point.
- When `plan_approval_required` is `true`, prompt before delegation.
- When `plan_approval_required` is `false`, delegation is pre-authorized.
- If config is missing or malformed, default to `plan_approval_required: true` (human-in-the-loop by default).

### Approval prompt

When `plan_approval_required` is `true`, use this exact pattern:

`Delegate {task_type} of {subject} to {target_agent}? [Approve] [Decline]`

### Session-level behaviour

- The session-level gate applies to every delegated subtask.
- Declined delegation: record the gap in the parent plan, explain why it was
  proposed, and do not silently drop the work.
- The human may approve or decline a specific task even when session defaults
  would allow it.

### Double-approval avoidance

- `jl-planner` owns the gate for the delegation act itself; do not re-ask
  because the child agent has internal gates.
- Record the parent approval so later summaries do not treat it as missing
  consent.

### Graceful fallback

If the harness cannot spawn the intended subagent: warn the user, offer inline
continuation when the configured fallback is `inline`, and mark the subtask as
manual when the fallback is `manual` — never silently drop the work.

## Subagent Delegation

Delegation fits into `jl-planner` at two main points: **Breakdown** and
**Research**. It may also be used for **specialist planning** and
**risk analysis** when those needs surface during clarification or master-plan
construction.

### Expected returns

Breakdown delegation (use when the parent has enough shared understanding to
partition the work, but not enough bandwidth for every component inline):

- detailed component plan
- component scope and non-goals
- sibling-component dependencies, risks, and open questions
- validation or acceptance guidance
- optional prototype or proof-of-concept references if created by an approved
  child workflow

Research delegation (use for independent questions: API feasibility, library
capability, framework constraints, dependency compatibility, or
prior-art/internal-pattern comparison):

- concise findings
- evidence-backed recommendations
- unresolved unknowns
- impact on plan scope, sequencing, or risk

## Delegation Workflows

The parent planner owns the following decision points; read
[references/DELEGATION_WORKFLOWS.md](references/DELEGATION_WORKFLOWS.md) for the
full pseudocode of the breakdown, research, specialist planning, and parent
control workflows.

## Worktree and Branch Management

Read [references/WORKTREE_BRANCH.md](references/WORKTREE_BRANCH.md) for child
artifact naming, lifecycle, and merge/consolidation strategy.

## Plan Artifact Consolidation

The parent planner consolidates delegated outputs into one coherent planning
result. Read [references/CONSOLIDATION.md](references/CONSOLIDATION.md) for the
Collect, Verify, Consolidate, and Present checks.

## Interaction with Nested Agents

`jl-planner` may delegate to `jl-feature-planner` for detailed component
planning.

### Precedence rules

- `jl-planner` owns the gate for delegating to the child agent.
- `jl-feature-planner` owns its internal workflow once delegation has begun.
- The parent approval authorizes the spawn.
- The child planner's own internal gates are not a reason to re-ask the user
  about the same top-level delegation.

### Coordination expectations

When delegating to `jl-feature-planner`, the parent should provide the bounded
component scope, parent planning objective, relevant constraints and non-goals,
the selected plan target, and the required output shape for reintegration into
the master plan.

Expected child return: a component-level plan suitable for direct
consolidation, with explicit assumptions, dependencies, and risks; any
child-created artifacts the parent must track.

### Avoiding double-asking

Correct flow: ask
`Delegate Breakdown of auth-service to jl-feature-planner? [Approve] [Decline]`,
user approves, the child runs, the parent consolidates and reports. Do not ask
again merely because the nested planner is capable of its own approval logic.

## Risk Analysis

Risk analysis remains part of the planning workflow even when delegated:
perform it inline for small scopes, delegate bounded risk-analysis subtasks to
a specialist agent, or delegate security-sensitive review subtasks when the
plan surfaces explicit security concerns. Returned risks are normalized into
the master plan's risk, mitigation, and open-question sections before signoff.

## Configuration

This skill reads planning delegation settings from `jl_approval_gates` in
`CONTRIBUTING.md` and `AGENTS.md`. It inherits the repository-wide configuration
resolution approach and should not invent a parallel config mechanism. See
[Approval Gate Integration](#approval-gate-integration) for the boolean schema
(`plan_approval_required`).

Workflow behaviour and the config example live in
[references/CONFIGURATION.md](references/CONFIGURATION.md).

## Examples

Read [references/EXAMPLES.md](references/EXAMPLES.md) for the three scenarios:
large epic split across feature planners, parallel research for complex
dependencies, and harness unavailable inline fallback.

## Requirements

The agent MUST:

- load `jl-planning-workflow` before planning
- reach shared understanding via `jl-quiz-requirements` before delegated planning begins
- evaluate delegation only after the planning context is sharp enough to bound the child task
- resolve `jl_approval_gates` before each delegation decision point
- use the exact approval-prompt pattern for breakdown delegation
- keep the human able to override delegation decisions per task
- use graceful fallback when the harness cannot spawn the intended child agent
- collect, verify, and consolidate child outputs into the master plan
- present the consolidated plan to the user for acceptance or revision

The agent MUST NOT:

- use delegation to skip clarification or provider workflow gates
- silently drop delegated work when approval is declined or the harness is unavailable
- leave critical plan facts only in child artifacts
- ask twice for the same bounded delegation merely because the child agent has internal gates

## Related Skills and Agents

- `jl-planning-workflow` — mandatory planning workflow and BLOCKER logic
- `jl-quiz-requirements` / `jl-quiz-understanding` — shared-understanding and
  clarification mechanisms (Requirements Quiz and Understanding Quiz
  workflows)
- `jl-feature-planner` — primary child agent for delegated breakdown and
  specialist planning
- `jl-recon` — reference pattern for approval-gated AFK or delegated research
- `jl-issue-management` — provider workflow and source-of-record guidance
- `jl-adversarial-review` — review pass before planning completion

## References

- [`../jl-recon/SKILL.md`](../jl-recon/SKILL.md) — approval-gated research and
  graceful delegation pattern
- [`../jl-planning-workflow/SKILL.md`](../jl-planning-workflow/SKILL.md) —
  shared planning BLOCKERs and completion criteria
- [`..\..\..\CONTRIBUTING.md`](..\..\..\CONTRIBUTING.md) — repository planning
  rules and configuration source
