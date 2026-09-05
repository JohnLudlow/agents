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
- you need to know whether a specific plugin, skill, or agent supports
  subagent spawning, fleet mode, or worktree isolation before delegating to it
- you are implementing or documenting harness-specific delegation mechanics
  (see Delegation Maturity Stages below — distinct from #110's Phase 1–4
  documentation/implementation roadmap)

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
Capability Matrix below), resolves #77's AC1.4: **ask** the user what to
do — do not decide on their behalf:

> Delegation isn't available in this harness. Continue this work inline,
> or use Herdr to multiplex to a sibling session that can delegate, if one
> is available?

- If the human chooses inline, continue in the parent — this is the same
  fallback path described elsewhere in this document.
- If the human chooses Herdr, this is the same mechanism as
  `HARNESS_FALLBACK.md` → Multi-Harness Presence Routing's "Herdr
  exception" — Herdr makes a sibling session in a different, capable
  harness visible and controllable, and routing to it is legitimate here
  because it's the human's **explicit request**, exactly the condition
  that section already requires.
- Either way, do not silently drop the work — record that delegation was
  unavailable for this session, and which option the human chose.

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
  `implementation`, `test_generation`, or `documentation`
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

### Copilot CLI Prototype Usage Example (#195)

The AC5.1 Phase 4 prototype is implemented in:

- `.apm/skills/jl-subagent-spawning/lib/delegate-to-subagent-prototype/index.ts`
- `.apm/skills/jl-subagent-spawning/references/DELEGATE_TO_SUBAGENT_QUICKSTART.md`

Example (prototype call shape):

```ts
const result = await delegateToSubagentPrototype(
  {
    targetAgent: 'project-planning:planner',
    delegationType: 'research',
    taskKey: 'api-spike',
    prompt: 'Compare API options and recommend one with tradeoffs.'
  },
  runtimeContext,
  async (payload) => task(payload)
);
```

The prototype resolves model + mode, emits a decision log, and dispatches
through Copilot CLI semantics (`background` for fleet, `sync` for sequential).
Non-CLI harnesses are intentionally handled as inline fallback in this stage.

When a parent session runs more than one delegation — typically an approved
AFK Research ticket running in parallel with a live Quiz — individual
`DelegationResult` items are combined into an `AggregatedDelegationResult`, a
flat ordered list that also carries a combined `warnings` union and an
optional `totalUsage` rollup. Partial failures use the existing `warnings`
field and the worktree rollback vocabulary rather than a separate mechanism.
See `references/RESULT_AGGREGATION.md` for the per-ticket-type output
shapes, the aggregation and partial-failure rules, and the token/timing
rollup schema.

### Mid-Task Findings Streaming: `DelegationProgressUpdate`

Resolves the "Mid-task findings streaming" fog item from #110
([#130](https://github.com/JohnLudlow/agents/issues/130)).

Findings stream to the parent, in the sense that the parent may observe a
running delegation's interim state before it completes — but not through a
push mechanism the child actively sends. A `DelegationProgressUpdate` is
what the parent constructs when it opportunistically inspects a still-running
delegation:

```text
DelegationProgressUpdate {
  targetAgent: string
  status: "running" | "idle"
  observedAt: string             -- timestamp of this check, not the child's
  interimFindings?: string[]     -- notable findings visible at this point
  interimArtifacts?: string[]    -- notable artifacts visible at this point
}
```

`status` describes the delegated agent's own state at the moment of the
check, not whether the overall delegation is complete:

- `"running"` — the delegated agent is actively working on its current
  turn.
- `"idle"` — the delegated agent has finished its current turn and is
  paused between turns (for example, waiting to see if follow-up work
  arrives). This is not completion: an idle child may still receive more
  work or reach true completion later. A delegation the parent still
  considers open can legitimately produce several progress updates over
  time, some `"running"`, some `"idle"`, as the child works through
  multiple turns.

The typical shape of a delegation the parent observes this way is a
sequence of `DelegationProgressUpdate`s — running, idle, running again,
and so on — that eventually culminates in exactly one final
`DelegationResult` once the child (and the parent) consider the work
genuinely done. `DelegationProgressUpdate` is distinct from
`DelegationResult` throughout that sequence: it is never final, never
recorded as a resolution, and never aggregated into an
`AggregatedDelegationResult` — it exists only to give the parent (and,
through it, the human) visibility into a delegation that hasn't produced
its final result yet, no matter how many `"idle"` pauses it passes through
first.

#### When the parent checks

Checks are **opportunistic, never a dedicated polling loop**: the parent
inspects a running delegation's current state when it naturally pauses
between its own other work, or when the human asks for a status update —
never on a fixed interval or in a busy-loop dedicated solely to watching
one delegation.

#### What the parent does with what it finds

When an opportunistic check surfaces an interim finding worth noting, the
parent **proactively tells the human immediately** — it does not hold
interim findings back until the human asks or the delegation completes.

Recommended wording:

> `{targetAgent}` is still running. So far it has found: {interimFindings}.

#### Relationship to the final result

An interim finding surfaced via `DelegationProgressUpdate` does not replace
or pre-empt the final `DelegationResult` when the delegation completes —
the final result is still the authoritative summary, and may supersede or
correct anything shown in an earlier progress update.

## Worktree Lifecycle

When a delegated task involves source changes and gets an isolated worktree
(see Recon's Decision 11 in `jl-recon` for which ticket types trigger one),
the worktree's creation, naming, and cleanup follow this lifecycle.

### Creation and naming

- Baseline: a per-agent isolated worktree, named `worktree-{ticket-id}-{timestamp}`.
- A per-caller override may run the delegated task in the shared repository
  instead, when isolation is unnecessary or impractical.

### Task Ticket Worktree-Trigger Detection

Resolves the "Task worktree-trigger detection mechanism" fog item from #110
([#127](https://github.com/JohnLudlow/agents/issues/127)).

Recon's Decision 11 restricts worktree creation for Task tickets to those
that "involve making source changes directly." Detecting that condition
uses a hybrid rule, checked in this order:

1. **Explicit marker** — if the ticket body contains a standalone
   `worktree: required` line, honor it and create the worktree before
   starting work. There is no `worktree: not-required` marker; omitting the
   marker always means "infer," never "definitely not required."
2. **Inference** — if no marker is present, infer from the task description
   whether it involves direct source changes.
3. **Default to inline when ambiguous** — if inference is genuinely
   ambiguous, default to starting the work inline (no worktree) rather than
   asking upfront. An unnecessary worktree for a mostly-procedural task
   costs more than a possible later switch.
4. **Mid-task discovery** — if the agent discovers partway through inline
   work that source changes are needed after all, pause immediately and ask
   before continuing:

   > This task turned out to need source changes. Switch to an isolated
   > worktree before continuing? [Approve] [Decline]

   If approved, create the worktree, move any already-made changes into it
   using the same preservation vocabulary as cleanup below (already
   committed work needs no extra step; uncommitted work is diff-exported
   and reapplied), then continue in the new worktree. If declined, continue
   inline and record the declined switch in the task's completion report.

This is a distinct axis from the `capabilities.worktree_isolation` field in
`references/PLUGIN_CAPABILITY_REGISTRY.md`: that field says whether a
delegation *target* (a skill or agent) supports running inside a worktree
at all; this detection rule decides whether a *specific Task ticket* needs
one.

### Cleanup triggers

All four outcomes below attempt cleanup; the actual worktree removal is
gated on the preservation step succeeding first (see Rollback):

- **Success** — the delegated task completed and its result was accepted.
- **Timeout** — the delegated task exceeded its allotted time.
- **Error** — the delegated task failed.
- **User cancellation** — the human stopped the delegated task early.

A Timeout or Error trigger here is a delegation failure; see
`references/RESULT_AGGREGATION.md` → Subagent Failure Recovery Policy for
what happens next (no automatic retry, always ask before retrying manually,
falling back to inline, or abandoning the task).

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

## DelegateToSubagent API Status: Reference Contract and #195 Prototype

The `DelegationRequest` and `DelegationResult` types above remain the
authoritative cross-harness contract for agent behavior.

### Current Runtime Reality (Delegation Maturity Stages 1–3)

Agents currently delegate using harness-specific mechanisms:

- **Copilot CLI**: call `task` tool directly, passing bounded agent and prompt
- **Browser / Copilot Chat**: call skills inline; subagent spawning unavailable
- **Azure DevOps**: delegate via provider-native work item assignment or call
  skills inline

Each harness has different capabilities and constraints. There is no unified
`DelegateToSubagent` function for every harness.

### #195 Deliverable: Copilot CLI Prototype (Stage 4 Experiment)

Issue [#195](https://github.com/JohnLudlow/agents/issues/195) adds a concrete
prototype implementation for **Copilot CLI only**:

- `delegateToSubagentPrototype(...)` in
  `.apm/skills/jl-subagent-spawning/lib/delegate-to-subagent-prototype/index.ts`
- unit tests in the same folder (`index.test.ts`)

Prototype behavior:

1. validate a bounded `DelegationRequest`
2. detect runtime harness from passed context
3. resolve model through the documented six-level hierarchy
4. select spawning mode via fallback chain (`fleet -> sequential -> inline`)
5. dispatch using Copilot CLI task semantics for fleet/sequential
6. return a `DelegationResult`-aligned payload with structured decision logs

### Scope Boundaries (Still Not a Product Commitment)

This prototype is intentionally narrow:

- no claim of cross-harness callable parity
- no claim that vendor APIs are stable across all harnesses
- no GitHub Copilot product/roadmap commitment

It is a reference implementation to prove API shape and behavior in one
harness while preserving the existing conservative policy elsewhere.

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

### Subagent Chaining Permissions

Resolves the "Subagent chaining permissions" fog item from #110
([#131](https://github.com/JohnLudlow/agents/issues/131)).

An agent whose `task` permission (see `docs/PERMISSIONS.md`) is set to
`deny` cannot spawn any subagent, full stop — no exceptions or overrides.
This is not a new rule; it follows directly from the existing permission
model's own definition of `deny` ("the action is blocked and cannot run").
`jl-feature-reviewer`'s documented "Cannot delegate to other agents"
restriction is the existing example of this in practice.

This check is the **first** gate in the spawning algorithm below — it runs
before the circular-delegation and nesting-depth checks, because a denied
agent cannot reach the point of pushing onto `parentAgentStack` at all:

```text
BEFORE anything else:
  if delegatingAgent.taskPermission == "deny":
    ERROR("Agent " + delegatingAgent.name + " has task:deny and cannot delegate")
    => "Cannot delegate: this agent's task permission is denied"
```

### Configuring the Depth Limit

`maxNestingDepth` is configurable per session via `jl_subagent_delegation.max_nesting_depth`
in `CONTRIBUTING.md` or `AGENTS.md`; see `CONTRIBUTING.md` → Subagent Delegation
Depth for the schema. If unset or invalid, agents fall back to the documented
default of `3`.

### Algorithm

Before spawning a subagent, validate — in this order: the permission gate
above, then circularity, then depth:

```text
parentAgentStack = []  // Track the chain: planner -> feature-planner -> ...
maxNestingDepth = resolve(jl_subagent_delegation.max_nesting_depth, default: 3)

BEFORE spawning child:
  if delegatingAgent.taskPermission == "deny":
    ERROR("Agent " + delegatingAgent.name + " has task:deny and cannot delegate")
    => "Cannot delegate: this agent's task permission is denied"

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

### Test Coverage

Specification-level test cases validating this algorithm's logic (permission
gate, circularity, depth boundary) are in
`references/CIRCULAR_DELEGATION_TEST_CASES.md`. These validate the
documented pseudocode directly; they are not per-harness integration tests,
because no harness has real `DelegateToSubagent` runtime dispatch yet — see
that reference for the exact scope boundary.

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

## Fleet Mode Utilization and Harness Detection (AC5.1)

**Decision [#186]**: Agents automatically use fleet mode when available, with
graceful fallback. No user opt-in required.

**Rationale**: Each subagent spawns with clean, isolated context containing
only task-relevant information. Automatic fleet mode activation maximizes
parallelization and prevents context depletion that occurs when everything
happens in the same session.

### What Fleet Mode Is

Fleet mode is a top-level coordination mechanism (Copilot CLI: `/fleet`
command) that launches multiple subagents in parallel, each with its own clean
session context. It is distinct from sequential delegation (one subagent at a
time) and from skills invoked inline (no spawning).

**Fleet mode is appropriate when:**

- the work has multiple independent or weakly-dependent subtasks
- each subtask benefits from its own fresh context (parallelization outweighs
  context-splitting overhead)
- results can be easily reassembled after all tasks complete
- the task set is known upfront (not data-dependent discovery)

**Fleet mode is NOT appropriate when:**

- subtasks are tightly sequential or dependent
- you need immediate synchronous results
- the task involves discovering what to do next (single decision tree)
- the current harness doesn't support it

### Harness Capability Matrix (updated by #194 research)

| Harness | Fleet Mode Support | Detection Mechanism | Current activation policy |
|---------|:------------------:|---------------------|---------------------------|
| **Copilot CLI** | ✅ Full | `COPILOT_CLI_MODE` env var | Fleet first, then sequential fallback |
| **Azure DevOps + GitHub** | ✅ Full | Azure DevOps env/globals + GitHub-linked repo detection | Fleet first, then sequential fallback |
| **Azure DevOps + Azure Repos** | ❌ No | Azure DevOps env/globals + Azure Repos detection | Sequential fallback |
| **Browser / Copilot Chat** | ❌ No | `window` object exists | Inline only (no spawning) |
| **Kiro IDE/CLI** | ⚠️ Documented support, policy-gated | `KIRO_CLI_MODE` or `KIRO_IDE_SESSION` env var | Conservative sequential fallback until this integration path is confirmed |
| **OpenCode** | ⚠️ Pending vendor confirmation | `OPENCODE_MODE` env var | Conservative sequential fallback |
| **Pi** | ⚠️ Pending vendor confirmation | `PI_MODE` env var | Conservative sequential fallback |
| **Unknown** | ❌ No | No marker matched | Conservative sequential fallback |

### Activation Strategy: Automatic with Fallback

**Agents never need to ask the user; detection and fallback are silent.**

1. **At session start**, detect the current harness (see Harness Detection Pseudocode below).
2. **When spawning subagents**, choose mode from capabilities:
   - If `fleetModeAvailable`: use fleet mode (`task` with `mode="background"` for parallel dispatch)
   - Else if `sequentialSpawningAvailable`: use sequential dispatch (one subagent at a time)
   - Else: use inline execution
3. **Fallback if fleet unavailable**: Use sequential subagent dispatch (one at a time, each with isolated context).
4. **Fallback if sequential unavailable**: Use inline work.
5. **Always log** when fleet mode falls back, for debugging.

### Harness Detection Pseudocode

```text
AT SESSION START:
  harness = detect_harness()

    if env var COPILOT_CLI_MODE exists:
      return "copilot-cli"

    else if JavaScript window object exists:
      return "browser"

    else if Azure DevOps context exists (env vars or VSS/TFS globals):
      if linked repository host is GitHub:
        return "azure-devops-github"
      else if linked repository host is Azure Repos:
        return "azure-devops-azure-repos"

    else if env var KIRO_CLI_MODE or KIRO_IDE_SESSION exists:
      return "kiro"

    else if env var OPENCODE_MODE exists:
      return "opencode"

    else if env var PI_MODE exists:
      return "pi"

    else:
      return "unknown"

  Derive capability flags from harness:
    fleetModeAvailable, sequentialSpawningAvailable

  Store harness + capabilities in session_state for reference
```

### When to Recommend `/fleet` to the User

**A delegating agent should recommend `/fleet` to the user ONLY for genuinely parallelizable work:**

- Work with 2+ independent subtasks
- Subtasks benefit from isolated context (> ~5 minutes each)
- Results can be reassembled after all complete

**Recommended wording when recommending fleet mode:**

> Multiple independent subtasks detected. Running `/fleet /agent1 /agent2 ...`
> would parallelize this work across isolated sessions, keeping each focused
> and preventing context depletion.

**Do NOT recommend `/fleet` for:**

- Sequential or tightly dependent work
- Single-threaded decision trees
- Immediate synchronous results needed
- Tasks under ~5 minutes (overhead outweighs benefit)

### Fallback Behavior: Graceful Degradation

When fleet mode is unavailable or the user declines it:

1. **Dispatch sequentially**: Spawn each subagent one at a time, each with its own isolated context.
2. **If sequential spawning unavailable**: Continue work inline in the parent session, with a note in the completion report.
3. **If inline is the only option**: Suggest Herdr if the human wants to parallelize across harnesses (expert-only workaround).
4. **Always log**: Record which fallback path was used and why, so the human and future agents understand the constraint.

**Example logging (silent by default):**

> Fleet mode unavailable in this harness. Falling back to sequential dispatch. ([why]: Browser harness)

### Per-Harness Examples

#### Copilot CLI: Native fleet mode (Recommended)

```javascript
// Agent detects:
harness = "copilot-cli" (from COPILOT_CLI_MODE env var)

// User input: "Plan and review my feature"
// Agent recommends to user:
"Multiple independent subtasks. Try: /fleet /planner /reviewer"

// User runs: /fleet /planner /reviewer
// Copilot CLI coordinates both agents in parallel
```

#### Kiro/OpenCode/Pi: Conservative sequential fallback

```javascript
// Agent detects:
harness = "kiro"  // or "opencode" / "pi"

// Vendor capability confirmation is pending for this integration path,
// so fleet stays disabled by policy for now.
fleet_mode_available = false
sequential_spawning_available = true

// Agent falls back to sequential dispatch:
// run subtasks one at a time, preserving isolated context.
```

#### Azure DevOps with GitHub link: Conditional fleet mode

```javascript
// Agent detects:
harness = "azure-devops-github"
linked_repo_is_github = true

// If GitHub-linked:
// Agent can use fleet mode
// If Azure Repos:
// Agent falls back to sequential dispatch
```

#### Browser: No fleet mode, skills inline only

```javascript
// Agent detects:
harness = "browser"
fleet_mode_available = false

// Agent works inline, invoking skills directly:
task("jl-quiz", { prompt: "..." })  // No spawning, just invoke

// Agent mentions to user:
"This session doesn't support subagent spawning; running inline."
```

### Known Fog Items (Post-#194)

Vendor research findings are documented in `references/VENDOR_RESEARCH_HARNESS_DETECTION.md` (#194). Current status:

**Implemented detection signals:**
- ✅ Copilot CLI: `COPILOT_CLI_MODE`
- ✅ Browser: `window` object
- ✅ Azure DevOps: context detection plus GitHub vs Azure Repos host distinction
- ✅ Kiro: `KIRO_CLI_MODE` or `KIRO_IDE_SESSION`
- ✅ OpenCode: `OPENCODE_MODE`
- ✅ Pi: `PI_MODE`

**Remaining uncertainty:**
- ⚠️ **Kiro/OpenCode/Pi marker confirmation** — Environment variable names are implemented from vendor research conventions; final vendor confirmation is still pending.
- ⚠️ **Kiro/OpenCode/Pi capability upgrades** — Fleet mode is intentionally disabled by policy until confirmation of supported spawning semantics in this integration path.
- ⚠️ **Cross-harness parity** — If vendor docs confirm stronger guarantees, upgrade capability flags and tests in lockstep.

**Design-level fog items (beyond detection):**
- [ ] **Result coordination API** — How should agents coordinate results from parallel subagents? (Automatic or manual?)
- [ ] **Sequential fallback refinement** — Should sequential fallback prefer herdr if available, or other mechanism?

For now, agents should:

1. Run the implemented detection sequence once per session.
2. Use fleet only when `fleetModeAvailable` is true.
3. Fall back silently: fleet -> sequential -> inline.
4. Log fallback paths for debugging and auditability.

See `references/VENDOR_RESEARCH_HARNESS_DETECTION.md` for detailed findings, implemented marker signals, and capability-upgrade follow-up policy.

### Relationship to DelegateToSubagent

This section documents fleet mode *usage and activation patterns*. The
`DelegateToSubagent` API (documented earlier in this skill) handles individual
delegations once fleet mode is active or after fallback to sequential/inline.
The two are complementary:

- **Fleet Mode Utilization**: "Should I parallelize this work across harnesses?"
- **DelegateToSubagent**: "Given a single bounded subtask, which model should run it?"

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

## Plugin Capability Registry: The Capability Manifest

The Harness Capability Matrix above answers what the *runtime environment*
can do. It says nothing about what the *specific delegation target* — a
skill, agent, or plugin — itself supports. A skill or agent declares that
separately, in a `capabilities` manifest inside its own frontmatter
(`subagent_spawning`, `fleet_mode`, `worktree_isolation`, optional
`supported_models`) — the same file that already carries its `name` and
`description`, so the manifest can never drift out of sync with the artifact
it describes. A missing manifest means capability-unknown, not
capability-denied: treat every field as absent and apply the "Fallback when
delegation is unavailable" rule above.

A delegation proceeds only when both axes agree — the harness supports the
mechanism *and* the target's manifest doesn't require something the harness
can't meet. See `references/PLUGIN_CAPABILITY_REGISTRY.md` for the full
schema, the discovery mechanism, and a worked example.

## Fleet Mode Utilization (AC1.5)

Resolves the "Fleet mode utilization (AC1.5)" fog item from #110
([#129](https://github.com/JohnLudlow/agents/issues/129)), closing #77's
AC1.5: "Where special provision such as fleet mode is available (Copilot),
make use of it."

### Detection: harness identity, not a runtime capability query

Fleet mode is invoked by prefixing a top-level prompt with `/fleet` — it is
a Copilot CLI slash command the user (or an agent generating a prompt for
the user) types, not a tool a skill calls to spawn one bounded child. There
is no separate runtime API to query "is fleet mode available"; its
availability is exactly the question "is the current harness Copilot CLI?"
— the same harness-identity check `HARNESS_FALLBACK.md` already performs
for other CLI-specific behavior. Browser and Azure DevOps harnesses have no
`/fleet` equivalent.

### Fleet mode and `DelegateToSubagent` operate at different levels

`/fleet` decomposes an entire top-level request into a DAG of subtasks
before any individual delegation happens. `DelegateToSubagent` spawns one
bounded child task once work is already broken into a ticket or task. These
are not competing paths for the same delegation decision — fleet mode is a
*before* step that can precede any number of individual
`DelegateToSubagent` calls, not a replacement for them.

### When to recommend it

A delegating skill or agent should recommend `/fleet` to the user — never
invoke it silently on the user's behalf — when it identifies **two or more
independent bounded subtasks with no sequential dependency between them**
(matching GitHub's own "parallelizable work" guidance for `/fleet`). This
threshold is already latent in this repo's existing "split into parallel
sections" patterns — see `jl-documenter/SKILL.md`'s decomposition-before-drafting
step and `jl-feature-tester/SKILL.md`'s parallel-worktree test generation —
which are exactly the shape of workload `/fleet` targets.

Recommended wording:

> This work splits into {N} independent subtasks with no dependencies
> between them. Running `/fleet` for this request would let Copilot CLI
> dispatch them in parallel — would you like to use it instead of
> delegating them one at a time?

Do not recommend `/fleet` for sequential or tightly dependent subtasks, or
outside the Copilot CLI harness — matching the AI-credit cost tradeoff and
harness limitation documented in "Why Fleet Mode Isn't Always an Option"
below.

## Why Fleet Mode Isn't Always an Option

Fleet mode is a Copilot CLI concept — it doesn't exist in other harnesses at
all (see "Detection: harness identity" above). That's the actual limit on
its use, not a design constraint on what fleet mode can coordinate. When the
current harness is Copilot CLI, recommending `/fleet` for genuinely
parallelizable work is the correct, encouraged behavior — see "Fleet Mode
Utilization (AC1.5)" above for exactly when and how.

The one real technical constraint — `/fleet` addresses fleet members by
agent name, and only agents can be fleet members, not skills directly — no
longer blocks anything here, because a delegating skill never tries to join
a fleet itself; it only recommends that the *user* type `/fleet`. See
`references/DESIGN-RATIONALE.md` for that constraint's history and the
wrapper-agent workaround for the different case of coordinating skills
*as* fleet members.

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
capability matrix, and decision table. See
`references/DELEGATE_TO_SUBAGENT_QUICKSTART.md` for the #195 prototype call
flow and
`references/UNIFIED_DELEGATION_API_RESEARCH.md` for external design inputs.
See
`references/RESULT_AGGREGATION.md` for per-ticket-type output shapes,
multi-delegation result aggregation, partial-failure handling, and
token/timing usage rollup. See `references/PLUGIN_CAPABILITY_REGISTRY.md`
for the capability manifest schema, discovery mechanism, and its
relationship to the Harness Capability Matrix. See
`references/CIRCULAR_DELEGATION_TEST_CASES.md` for specification-level test
cases validating the permission-gate, circularity, and depth-boundary
algorithm.
