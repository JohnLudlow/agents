---
name: jl-planner
description: "Planning skill for top-level planner behaviour. Use when defining how jl-planner should clarify scope, choose plan destinations, delegate bounded planning or research subtasks, and consolidate multi-agent planning outputs."
---

# jl-planner

## Overview

This skill defines the planning workflow used by the `jl-planner` agent. It
keeps the human in control, requires shared understanding before a planning
artifact is created, and supports bounded subagent delegation when a planning
session becomes too large, too parallel, or too specialized for one agent pass.

Delegation is additive, not a replacement for planning ownership. `jl-planner`
still owns the parent workflow, decision record, provider workflow checks,
artifact consolidation, and final acceptance loop.

## Core Model

Every `jl-planner` session carries the same state:

- **Planning objective** — the problem to plan, the intended outcome, and the
  decision horizon.
- **Plan target** — markdown plan, GitHub issue, Azure DevOps work item, or
  another approved destination.
- **Shared understanding** — the clarified scope, constraints, assumptions,
  non-goals, and acceptance criteria collected through `jl-quiz`.
- **Master plan** — the canonical parent planning artifact for the session.
- **Delegated planning subtask** — a bounded child task delegated for
  breakdown, research, risk analysis, or specialist planning.
- **Delegated artifact set** — returned child plan sections, research notes,
  recommendations, risks, and optional prototype/code artifacts.
- **Consolidated plan** — the merged planning output presented back to the user
  for acceptance or revision.

## Modes

`jl-planner` supports the same high-level planning intent in several shapes:

1. **Inline planning** — one agent can carry the scope end-to-end.
2. **Delegated breakdown planning** — the top-level planner splits a large epic
   or feature into bounded component-planning subtasks.
3. **Delegated research planning** — the planner runs independent research
   subtasks in parallel, then folds the results back into the parent plan.
4. **Delegated specialist planning** — the planner asks a bounded specialist
   agent for detailed language-, framework-, or domain-specific planning.

Use delegation when it lowers ambiguity or reduces total planning latency
without reducing human control.

## Relationship to `jl-planning-workflow`

Load `jl-planning-workflow` first. Its five BLOCKERs remain the mandatory
preconditions for any planning artifact. This skill extends that workflow with
delegation-specific decision points after shared understanding has been reached
and before the final plan is accepted.

`jl-planner` MUST NOT use delegation to bypass:

- template compliance
- clarification via `jl-quiz`
- plan target confirmation
- provider workflow confirmation
- human approval for provider-native writes

## When to Delegate

Delegate only when the child task is bounded, reviewable, and materially
benefits from separation.

### Delegate Breakdown tasks when

- the requested feature or epic is too broad for one planning session
- different components can be planned independently, then merged
- a parent plan needs parallel component decomposition
- a child planner can produce a more detailed plan section than the parent
  should inline

Typical target: `jl-feature-planner`

### Delegate Research subtasks when

- API, dependency, library, or platform questions are independent
- multiple research questions can run in parallel
- evidence gathering would block the parent plan if done serially
- the top-level planner needs summarized findings, not raw exploration

Typical target: a bounded research-capable agent appropriate to the harness and
task, or inline fallback when subagent spawning is unavailable.

### Delegate Specialist planning when

- a component benefits from language-specific or framework-specific planning
- architecture detail would overwhelm the parent planning thread
- a nested planner can own a focused quiz and return a sharper component plan

Typical target: `jl-feature-planner` or another bounded planning-capable agent

### Delegate Risk or security review subtasks when

- a component needs explicit risk analysis before the master plan is finalized
- security-sensitive work would benefit from a specialist review pass
- the planner needs a bounded risk memo rather than a full inline audit

Typical target: a risk-, review-, or security-capable specialist agent

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

- The session-level gate applies to every delegated planning subtask in the session.
- If the user declines, record the gap in the parent plan and explain why delegation was proposed.
- Do not silently drop delegated work when declined.
  the planning session.
- The human may still approve or decline a specific delegated task even when
  session defaults would normally allow it.
- A per-task override is stronger than the session default.
- Human direction in the current session is stronger than config defaults.

### Double-approval avoidance

- `jl-planner` owns the approval gate for the delegation act itself.
- Once a child task is approved and spawned, do not ask again merely because
  the child agent also has internal gates.
- Nested gates remain internal to the child workflow and govern only broader or
  further nested actions inside that child session.
- Record that the parent delegation was already approved so later summaries do
  not treat it as missing consent.

### Graceful fallback

If the harness cannot spawn the intended subagent:

- warn the user that delegation is unavailable in the current harness
- offer inline continuation when configured fallback is `inline`
- mark the subtask as manual when configured fallback is `manual`
- avoid silently dropping the planning or research work

Recommended user-facing wording:

> Subagent delegation is unavailable in this harness. I can continue inline or
> leave this as a manual planning task.

## Subagent Delegation

Delegation fits into `jl-planner` at two main points: **Breakdown** and
**Research**. It may also be used for **specialist planning** and
**risk analysis** when those needs surface during clarification or master-plan
construction.

### Breakdown delegation

Use when the parent planner has enough shared understanding to partition the
work, but not enough bandwidth to produce every component plan inline.

Expected child returns:

- detailed component plan
- component scope and non-goals
- dependencies on sibling components
- risks and open questions
- validation or acceptance guidance
- optional prototype or proof-of-concept references if created by an approved
  child workflow

### Research delegation

Use when the parent planner identifies independent questions such as:

- API feasibility
- library capability or limitations
- framework constraints
- dependency compatibility
- prior-art or internal-pattern comparison

Expected child returns:

- concise findings
- evidence-backed recommendations
- unresolved unknowns
- impact on plan scope, sequencing, or risk

### Model Selection

Model selection for planning delegations follows the shared hierarchy:
global default < per-agent default < per-type default < per-task override.

For `jl-planner`, the per-agent default is `claude-sonnet-5` because planning,
breakdown, and research-heavy delegation usually benefit from stronger
reasoning.

Resolve delegation models in this order:

1. explicit `DelegationRequest.model`
2. `jl_subagent_models.overrides.<task-key>`
3. `jl_subagent_models.<delegation-type>`
4. `jl-planner` per-agent default
5. `jl_subagent_models.default`

Canonical mappings:

- `research` -> `jl_subagent_models.research`
- `implementation` -> `jl_subagent_models.implementation`
- `test-generation` -> `jl_subagent_models.test_generation`
- `documentation` -> `jl_subagent_models.documentation`

If the chosen model is unavailable in the current harness, continue down the
hierarchy until an available model is found and warn in the consolidated plan
notes.

Example configuration:

```yaml
jl_subagent_models:
  default: "claude-sonnet-5"
  research: "claude-sonnet-5"
  implementation: "gpt-4-turbo"
  documentation: "claude-sonnet-5"
  overrides:
    epic-risk-analysis: "claude-opus-4.5"
```

## Delegation Workflows

The parent planner owns the following decision points.

### Breakdown workflow

```text
Run jl-planning-workflow BLOCKERs
  -> reach shared understanding via jl-quiz
  -> evaluate planning scope
  -> if scope fits one session:
       continue inline
  -> if scope is too large:
       partition into bounded components
       resolve plan approval gate for breakdown
       if approval required:
         ask "Delegate Breakdown of {component} to {target_agent}? [Approve] [Decline]"
       if approved:
         create child plan artifact target
         create child worktree/branch if code or prototype work is involved
         DelegateToSubagent(breakdown)
         collect returned plan sections, risks, and dependencies
       else:
         use configured inline/manual fallback
  -> merge accepted child outputs into master plan
  -> present consolidated plan for acceptance or revision
```

### Research workflow

```text
Run jl-planning-workflow BLOCKERs
  -> identify unanswered planning questions
  -> classify research questions that can run independently
  -> resolve plan approval gate for research
  -> if approval required:
       ask "Delegate research of {subject} to {target_agent}? [Approve] [Decline]"
  -> if approved:
       DelegateToSubagent(research) in parallel where practical
       collect findings, recommendations, and unresolved risks
  -> else:
       use configured inline/manual fallback
  -> fold accepted findings into sequencing, assumptions, and risk sections
  -> present updated master plan for acceptance or revision
```

### Specialist planning workflow

```text
Clarification or breakdown reveals a specialist planning need
  -> select bounded target agent
  -> resolve specialist-planning approval mode
  -> if approved, DelegateToSubagent(specialist-planning)
  -> collect returned plan section and assumptions
  -> validate against parent scope and constraints
  -> merge into master plan
```

### Parent control pseudocode

```text
for each surfaced planning subtask:
  classify task_type
  choose bounded target_agent
  resolve effective approval mode
  if prompt required:
    ask for approval
  if approved:
    prepare child artifact target
    if code or prototype work may occur:
      create and register child worktree/branch
    DelegateToSubagent(task_type)
    collect returned artifacts
  else:
    apply configured fallback

consolidate all accepted child outputs
verify no contradictions remain
present consolidated plan to user
```

### Concrete examples

1. Research delegation with override:
   a complex dependency comparison can request `claude-opus-4.5` explicitly for
   one task while ordinary planning research stays on Sonnet.
2. Test-generation by type:
   if planning includes delegated validation spikes, `test_generation` can map
   to Claude by default while performance-sensitive test prototypes override to
   `gpt-4-turbo`.
3. Harness fallback:
   if browser harness lacks the requested model, fall back through per-type,
   per-agent, then global defaults and tell the user which model actually ran.

## Worktree and Branch Management

Delegated planning is primarily a planning-artifact flow, but some delegated
tasks may create bounded prototype or proof-of-concept artifacts. When code or
prototype work is involved, isolate it.

### Naming

Each delegated breakdown or planning task that needs its own artifact set gets:

- a plan document or plan artifact identifier named
  `plan-{component}-{ticket-id}-{unix-seconds}`
- a matching worktree or branch name when code or prototype work is involved

Use kebab-case for `{component}` and keep `{ticket-id}` aligned with the
inciting issue, parent issue, or equivalent tracking identifier.

### Lifecycle

1. Parent planner creates or reserves the child artifact target.
2. If code or prototype work is expected, create a dedicated child worktree and
   branch before delegating.
3. Register the child worktree/branch in the parent plan notes or coordination
   record.
4. Child agent writes its outputs only within its bounded artifact area.
5. Parent planner collects accepted outputs and notes any remaining cleanup.
6. When the delegated task closes, cleanup or archive the child worktree per
   repository or harness closure rules.

### Merge and consolidation strategy

- Treat the master plan as the source of record.
- Merge child plans by section, not by blindly concatenating full documents.
- Preserve component-local detail where useful, but normalize:
  - scope
  - dependencies
  - sequencing
  - risks
  - acceptance criteria
- Link to retained child artifacts when they remain useful as supporting detail.
- Summarize or archive transient child branches/worktrees once their outputs are
  consolidated.

## Plan Artifact Consolidation

The parent planner is responsible for consolidating all delegated outputs into
one coherent planning result.

### Collect

From each delegated child, collect:

- detailed plan sections
- risk analysis
- research findings
- assumptions and recommendations
- dependencies and sequencing constraints
- optional code, prototype, or proof-of-concept artifact references

### Verify

Before finalizing the master plan, verify:

- no two child plans contradict each other
- cross-component dependencies are explicitly captured
- sequencing still makes sense after research findings are folded in
- risks raised by one child are reflected where they affect other sections
- acceptance criteria remain internally consistent

### Consolidate

Merge returned child outputs into the master implementation plan under the
appropriate sections. Do not leave critical planning facts stranded only in
child outputs.

If contradictions remain:

- surface them explicitly
- propose the smallest decision or follow-up needed to resolve them
- do not pretend consolidation is complete

### Present

Present the consolidated plan to the user for:

- acceptance
- revision
- targeted follow-up on unresolved contradictions or open questions

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

When delegating to `jl-feature-planner`, the parent should provide:

- the bounded component scope
- the parent planning objective
- relevant constraints and non-goals
- the selected plan target
- the required output shape for reintegration into the master plan

Expected child return:

- a component-level plan suitable for direct consolidation
- explicit assumptions, dependencies, and risks
- any child-created artifacts the parent must track

### Avoiding double-asking

Correct flow:

1. `jl-planner` asks: `Delegate Breakdown of auth-service to jl-feature-planner? [Approve] [Decline]`
2. User approves.
3. `jl-feature-planner` runs its own bounded planning workflow internally.
4. `jl-feature-planner` returns its plan.
5. `jl-planner` consolidates and reports.

Do not ask the user again merely because the nested planner is capable of its
own approval logic.

## Risk Analysis

Risk analysis remains part of the planning workflow even when delegated.

`jl-planner` may:

- perform risk analysis inline for small scopes
- delegate bounded risk-analysis subtasks to a specialist agent
- delegate security-sensitive review subtasks when the plan surfaces explicit
  security concerns

Returned risks must be normalized into the master plan's risk, mitigation, and
open-question sections before signoff.

## Configuration

This skill reads planning delegation settings from `jl_approval_gates` in
`CONTRIBUTING.md` and `AGENTS.md`. It inherits the repository-wide configuration
resolution approach and should not invent a parallel config mechanism.

### Example configuration

```yaml
jl_approval_gates:
  plan_approval_mode: always
  plan_task_overrides:
    breakdown: always
    research: never
    specialist-planning: always
    risk-analysis: always
  plan_fallback_on_decline: inline
  plan_fallback_when_unavailable: warn
```

### Behaviour summary

- `always` — ask before delegating that class of plan subtask
- `inherit` — use the already-resolved parent planning-session decision if one
  exists; otherwise ask
- `never` — delegate without prompting unless the user overrides in-session
- `inline` fallback — continue the work in the parent planner when practical
- `manual` fallback — leave the task as a manual follow-up item
- `warn` fallback — explain the harness limitation and let the user choose
  inline or manual handling

## Examples

### Example 1: Large epic split across feature planners

A large epic includes authentication, billing, and notification work.

1. `jl-planner` completes clarification and creates the master planning frame.
2. Scope is too large for one agent pass.
3. The planner partitions the work into auth and billing/notifications
   breakdowns.
4. It asks approval for each delegated breakdown.
5. Two `jl-feature-planner` child tasks run in parallel.
6. Returned component plans are merged into the master plan, with dependencies
   normalized into one rollout sequence.

### Example 2: Parallel research for complex dependencies

A migration plan depends on:

- third-party API limits
- framework compatibility
- existing internal library fit

The planner identifies these as independent research questions, approves or
inherits the research gate, delegates them in parallel, then folds the findings
into assumptions, risks, and sequencing before presenting the consolidated plan.

### Example 3: Harness unavailable, inline fallback

The planner is running in a harness without subagent spawning support.

1. It identifies that delegated breakdown would help.
2. It resolves the gate and determines delegation is desirable.
3. Harness support is unavailable.
4. It warns the user and offers inline continuation.
5. The planner continues inline and records that delegation was unavailable for
   this session.

## Requirements

The agent MUST:

- load `jl-planning-workflow` before planning
- use `jl-quiz` to reach shared understanding before delegated planning begins
- evaluate delegation only after the relevant planning context is sharp enough
  to bound the child task
- resolve `jl_approval_gates` before each delegation decision point
- use the exact approval-prompt pattern for breakdown delegation
- keep the human able to override delegation decisions per task
- use graceful fallback when the harness cannot spawn the intended child agent
- collect, verify, and consolidate child outputs into the master plan
- present the consolidated plan to the user for acceptance or revision

The agent MUST NOT:

- use delegation to skip clarification or provider workflow gates
- silently drop delegated work when approval is declined or the harness is
  unavailable
- leave critical plan facts only in child artifacts
- ask twice for the same bounded delegation merely because the child agent has
  internal gates

## Related Skills and Agents

- `jl-planning-workflow` — mandatory planning workflow and BLOCKER logic
- `jl-quiz` — shared-understanding and clarification mechanism
- `jl-feature-planner` — primary child agent for delegated breakdown and
  specialist planning
- `jl-subagent-spawning` — delegate-to-subagent protocol, harness limits, and
  fallback patterns
- `jl-recon` — reference pattern for approval-gated AFK or delegated research
- `jl-issue-management` — provider workflow and source-of-record guidance
- `jl-adversarial-review` — review pass before planning completion

## References

- [`../jl-subagent-spawning/SKILL.md`](../jl-subagent-spawning/SKILL.md) —
  DelegateToSubagent protocol and harness support guidance
- [`../jl-recon/SKILL.md`](../jl-recon/SKILL.md) — approval-gated research and
  graceful delegation pattern
- [`../jl-planning-workflow/SKILL.md`](../jl-planning-workflow/SKILL.md) —
  shared planning BLOCKERs and completion criteria
- [`..\..\..\CONTRIBUTING.md`](..\..\..\CONTRIBUTING.md) — repository planning
  rules and configuration source
