---
name: jl-subagent-spawning
description: Reference guide for spawning subagents, resolving delegation models, and coordinating planning work across Copilot harnesses (CLI, browser, Azure DevOps). Explains fleet mode limitations, model fallback rules, and harness-specific workarounds.
---

# jl-subagent-spawning

Reference guide for spawning subagents, selecting their models, and
coordinating parent-child workflows across Copilot harnesses.

## When This Skill Applies

This reference is relevant when:

- your agent or the user needs to spawn a subagent such as
  `jl-feature-planner`
- you need to choose which model the delegated subagent should use
- you need to honor repository or per-task model preferences
- you need to coordinate multiple agents across harnesses
- you encounter harness or fleet-mode limitations
- you are implementing or documenting Phase 3 delegation behavior

## The Core Problem

Subagent delegation needs two separate decisions:

1. **Should delegation happen?** — controlled by `jl_approval_gates`
2. **Which model should run the child task?** — controlled by
   `jl_subagent_models`

Before this refinement, `DelegateToSubagent` had no documented way to request a
model, report the model actually used, or fall back when the requested model
was unavailable in the current harness.

## Design Intent

This skill preserves the existing separation of concerns:

- **Agents** are autonomous entry points users launch directly or that parent
  agents delegate to
- **Skills** are domain expertise called within an agent context
- **Approval gates** decide whether delegation is allowed
- **Model selection** decides which model powers the delegated task

## Approval Gates: `jl_approval_gates`

This is the shared contract for whether delegation may happen at all, before
model selection or spawning is considered.

### Schema and defaults

Each delegating skill or agent defines one or more boolean gates under the
shared `jl_approval_gates` namespace, following a unified pattern:

```yaml
jl_approval_gates:
  test_approval_required: true              # jl-feature-tester
  documentation_approval_required: true     # jl-documenter
  prototype_approval_required: true         # jl-prototype
  plan_approval_required: true              # jl-planner
  implementation_approval_required: true    # jl-feature-implementer
```

- Every gate is a boolean (`true`/`false`); there is no enum or `_mode`
  variant. Cascading and fallback behavior is expressed as workflow rules,
  not as additional configuration keys.
- If a gate is missing from config, the delegating skill defaults to `true`
  (human-in-the-loop by default).
- `jl_approval_gates` is distinct from `jl_recon.decision_gates`, which
  governs Recon-only gates (destination confirmation, inciting-issue
  confirmation, Research AFK). Delegation workflows always use
  `jl_approval_gates`.
- See each delegating skill's own Configuration section for its specific
  gate names (for example, `jl-feature-tester` also defines
  `test_ci_required` and `test_coverage_threshold`).

### Session-level vs. per-task confirmation

- Resolve the relevant gate once per session, then re-apply it at every
  delegation decision point in that session — do not re-resolve config on
  every single call.
- A parent agent invoked from `jl-recon` (or another orchestrating skill)
  inherits the parent session's already-resolved approval decision instead of
  re-prompting for the same bounded delegation.
- A declined gate does not retype or cancel the ticket/task itself; it means
  the work continues inline in the parent, with the gap recorded for later
  review.

### Fallback when delegation is unavailable

If the current harness cannot spawn a subagent at all (see the Harness
Capability Matrix below):

- warn the user in plain language that delegation is unavailable in this
  harness;
- offer the supported inline path as the fallback; and
- do not silently drop the work — record that delegation was unavailable for
  this session.

## DelegateToSubagent API

Use the following conceptual API when a parent agent delegates a bounded child
task.

### `DelegationRequest`

```text
DelegationRequest {
  targetAgent: string
  delegationType: string
  taskKey?: string
  prompt: string
  model?: string
  worktreePath?: string
  branchName?: string
  contextArtifacts?: string[]
}
```

#### Fields

- `targetAgent` — the bounded child agent to invoke
- `delegationType` — canonical delegation category such as `research`,
  `implementation`, `test-generation`, or `documentation`
- `taskKey` — optional stable task identifier used for
  `jl_subagent_models.overrides.<taskKey>`
- `prompt` — the child task instruction payload
- `model` — optional explicit per-task model override; this has the highest
  precedence when valid and available
- `worktreePath`, `branchName`, `contextArtifacts` — optional execution and
  context metadata already used by parent workflows

### `DelegationResult`

```text
DelegationResult {
  targetAgent: string
  delegationType: string
  modelRequested?: string
  modelResolved: string
  modelResolutionSource: "explicit" | "task-override" | "per-type" | "per-agent" | "global" | "fallback"
  harness: string
  warnings?: string[]
  artifacts?: string[]
  summary: string
}
```

#### Fields

- `modelRequested` — the explicit or config-requested model that started the
  resolution attempt
- `modelResolved` — the actual model used after hierarchy resolution and
  harness availability checks
- `modelResolutionSource` — which level provided the final winning model
- `warnings` — includes any model substitution warning caused by harness
  constraints or invalid configuration

## Worktree Lifecycle

When a delegated task involves source changes and gets an isolated worktree
(see Recon's Decision 11 in `jl-recon` for which ticket types trigger one),
the worktree's creation, naming, and cleanup follow this lifecycle.

### Creation and naming

- Baseline: a per-agent isolated worktree, named `worktree-{ticket-id}-{timestamp}`.
- A per-caller override may run the delegated task in the shared repository
  instead, when isolation is unnecessary or impractical.

### Cleanup triggers

All four outcomes below attempt cleanup; the actual worktree removal is
gated on the preservation step succeeding first (see Rollback):

- **Success** — the delegated task completed and its result was accepted.
- **Timeout** — the delegated task exceeded its allotted time.
- **Error** — the delegated task failed.
- **User cancellation** — the human stopped the delegated task early.

### Preservation before removal

Before removing a worktree, preserve any work it contains:

1. If the delegated task already committed its changes to the delegation's
   branch, no extra preservation step is needed — removing a worktree does
   not delete the branch it was checked out on; the branch and its commits
   survive.
2. If the worktree has uncommitted changes, export a diff patch to a
   session-durable location (not a `git stash`, which is easy to lose track
   of once the worktree that created it is gone) before removing the
   worktree.

### Rollback on preservation failure

If the diff-export step itself fails (for example, disk or permission
errors):

- abort the cleanup;
- leave the worktree in place; and
- warn the user in plain language rather than force-removing the worktree
  and risking silent data loss.

### Completion messaging

When cleanup completes (or is aborted), tell the user:

- the worktree name that was removed (or left in place, if aborted);
- whether the work was already committed to a branch, diff-exported, or
  neither; and
- where to find the preserved work (branch name or diff-patch location) if
  it wasn't already merged.

Recommended wording:

> Worktree `{worktree-name}` removed (or left in place if preservation
> failed — see warning above). Changes were either committed to
> `{branch}` or, if uncommitted, exported to `{diff-patch-path}`.

## DelegateToSubagent API Status: Pseudocode vs. Callable Implementation

**IMPORTANT CLARIFICATION**: The `DelegationRequest` and `DelegationResult` types
shown above represent a **reference specification**, not a callable interface
available today.

### Current Reality (Phase 1–3, as of August 2026)

Agents currently delegate using harness-specific mechanisms:

- **Copilot CLI**: call `task` tool directly, passing bounded agent and prompt
- **Browser / Copilot Chat**: call skills inline; subagent spawning unavailable
- **Azure DevOps**: delegate via provider-native work item assignment or call
  skills inline

Each harness has different capabilities and constraints. There is no unified
`DelegateToSubagent` function yet.

### Phase 4 Plan (Future)

In Phase 4, GitHub Copilot will introduce a unified `DelegateToSubagent` API
that:

- accepts a `DelegationRequest` with bounded agent, model preference, and task
  prompt
- abstracts harness differences (CLI task tool vs. browser skills vs. provider
  delegation)
- returns a `DelegationResult` with model resolution details
- handles approval gates, model fallbacks, and worktree/branch lifecycle

Until Phase 4 ships:

- Model selection (jl_subagent_models hierarchy) is documented here for
  future-proofing agents
- Agents should still resolve model preferences and record them in delegation
  results, even if Phase 1–3 harnesses don't yet support per-delegation model
  selection
- This allows graceful adoption when Phase 4's unified API becomes available

## Canonical Delegation Types

Use these standard delegation-type keys across all agents and configuration.
Do not invent new delegation types; propose additions to the maintainers if
your workflow needs a new category.

- `research` — information gathering, API exploration, dependency analysis
- `implementation` — code generation for one or more components
- `test_generation` — test suite generation or expansion
- `documentation` — documentation writing or updates
- `prototype` — throwaway exploratory code or mockups
- `review` — code review, quality audit, adversarial feedback

Additional types may be added later, but must remain `snake_case`, stable,
and documented in `CONTRIBUTING.md` before use in repository configuration.

## When NOT to Delegate: Anti-Patterns

Delegation is not always the right choice. Avoid delegating when a task is
too small to benefit from parallelism (under ~5 minutes on a simple path), no
exploration or decision-making is needed, a synchronous result is needed
immediately, no human input or clarification is possible mid-task, or the
delegation chain risks unbounded depth or nesting.

See `references/DELEGATION_HEURISTICS.md` for the full anti-pattern list,
the ~5-minute overhead threshold rationale, and worked examples for each
case.

## Circular Delegation Prevention

Agents must guard against infinite delegation loops and unbounded nesting.

### Configuring the Depth Limit

`maxNestingDepth` is configurable per session via `jl_subagent_delegation.max_nesting_depth`
in `CONTRIBUTING.md` or `AGENTS.md`; see `CONTRIBUTING.md` → Subagent Delegation
Depth for the schema. If unset or invalid, agents fall back to the documented
default of `3`.

### Algorithm

Before spawning a subagent, validate:

```text
parentAgentStack = []  // Track the chain: planner -> feature-planner -> ...
maxNestingDepth = resolve(jl_subagent_delegation.max_nesting_depth, default: 3)

BEFORE spawning child:
  if targetAgent in parentAgentStack:
    ERROR("Circular delegation: " + formatChain(parentAgentStack) + " -> " + targetAgent)
    => "Cannot delegate to {targetAgent}: already in parent chain"

  if len(parentAgentStack) >= maxNestingDepth:
    ERROR("Max nesting depth exceeded: would create " + targetAgent + " at depth " + (len + 1))
    => "Cannot delegate: maximum nesting depth {maxNestingDepth} reached"

  parentAgentStack.push(targetAgent)

AFTER child completes (success or failure):
  parentAgentStack.pop()
```

### Rationale

- **Depth 3 limit**: planner spawns feature-planner, feature-planner spawns
  feature-tester (one review step). This covers most realistic workflows.
- **Circular detection**: prevents `planner -> feature-planner -> planner`
  loops
- **Failure recovery**: shallow call stacks are easier to debug and recover from
- **Token budget**: each nesting level consumes model tokens; deep chains
  exhaust budgets faster

### Example: Valid delegation chain (OK)

```text
User launches jl-planner
  -> jl-planner delegates to jl-feature-planner (depth 1)
    -> jl-feature-planner delegates to jl-feature-tester (depth 2)
      [no further delegation]
  -> jl-feature-tester returns results
-> jl-feature-planner consolidates and returns
-> jl-planner consolidates and presents to user
```

### Example: Invalid delegation (BLOCKED)

```text
User launches jl-planner
  -> jl-planner delegates to jl-feature-planner (depth 1)
    -> jl-feature-planner tries to delegate to jl-planner
      [ERROR: circular dependency detected]
```

## Hierarchical Model Selection

Model selection resolves with this precedence:

1. **Per-task override**
   - explicit `DelegationRequest.model`
   - then optional `jl_subagent_models.overrides.<taskKey>`
2. **Per-delegation-type default**
   - `delegationType: "research"` -> `jl_subagent_models.research`
   - `delegationType: "implementation"` -> `jl_subagent_models.implementation`
   - `delegationType: "test-generation"` -> `jl_subagent_models.test_generation`
   - `delegationType: "documentation"` -> `jl_subagent_models.documentation`
3. **Per-agent default**
   - the delegating skill's documented preferred model
4. **Global default**
   - `jl_subagent_models.default`

If a candidate model is unavailable in the current harness, continue falling
through the hierarchy until an available model is found.

## Model Resolution Pseudocode

The full six-candidate cascade (explicit → task-override → per-type →
per-agent → global → hard fallback) and its resolution pseudocode are
documented in `references/HARNESS_FALLBACK.md`, along with worked resolution
examples for common cases (research request, explicit override, browser
fallback).

## Example Resolution Flows

Worked examples (research request, explicit override, browser fallback) are
in `references/HARNESS_FALLBACK.md`.

## Harness Model Availability and Constraints

Different harnesses expose different model sets — Copilot CLI has the
broadest support, Browser/OpenCode is partial, and Azure DevOps/Copilot
Extensions is harness-dependent. See `references/HARNESS_FALLBACK.md` for
the full capability matrix and per-harness notes.

## Required Warning Behavior

When the resolved model is different from the requested or configured preferred
model because of harness constraints:

- continue if a valid fallback exists
- record the substitution in `DelegationResult.warnings`
- tell the user in plain language when the substitution materially affects the
  delegated task

Recommended wording:

> Requested model `{requested}` is unavailable in this harness. Delegation will
> continue with `{resolved}`.

See `references/HARNESS_FALLBACK.md` for a full decision-tree walkthrough.

## Why Not Use Fleet Mode Directly?

Fleet mode still coordinates agents, not skills. That design limitation does
not change with model selection. The recommended workaround remains direct
subagent spawning where supported, or inline execution and agent fallback where
it is not.

## Decision Table

See `references/HARNESS_FALLBACK.md` for the authoritative decision table
mapping delegation needs, harness, recommended approach, and fallback.

## Requirements

Parent agents using `DelegateToSubagent` MUST:

- resolve approval before attempting delegation
- resolve the model hierarchy before spawning the child task
- validate candidate model names
- validate harness availability before selecting the final model
- record `modelResolved` in the delegation result
- warn when harness constraints force a different model than requested
- preserve any uncommitted worktree changes before removing a worktree, and
  abort cleanup rather than force-remove if preservation fails
- tell the user what was preserved and where, when a worktree is cleaned up

Parent agents MUST NOT:

- assume model availability without checking the current harness
- silently ignore an explicit model override
- silently keep an invalid or misspelled model name
- report a requested model as used when a fallback model actually ran
- force-remove a worktree when its preservation step has failed

## Related Skills & Agents

See `references/DEPENDENCIES.md` for relationships to `jl-planner`,
`jl-feature-planner`, `jl-adversarial-review`, `jl-feature-reviewer`, and
`jl-planning-workflow`. See `references/DELEGATION_HEURISTICS.md` for the
full "When NOT to delegate" anti-pattern list and overhead threshold. See
`references/HARNESS_FALLBACK.md` for the full model-fallback algorithm,
capability matrix, and decision table.
