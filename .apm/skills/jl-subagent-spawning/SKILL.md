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

```text
resolveDelegationModel(request, config, delegatingAgent, harness):
  candidates = []

  if request.model exists:
    candidates.append({ source: "explicit", model: request.model })

  if request.taskKey exists and config.jl_subagent_models.overrides[taskKey] exists:
    candidates.append({
      source: "task-override",
      model: config.jl_subagent_models.overrides[taskKey]
    })

  typeKey = mapDelegationTypeToConfigKey(request.delegationType)
  if config.jl_subagent_models[typeKey] exists:
    candidates.append({ source: "per-type", model: config.jl_subagent_models[typeKey] })

  if delegatingAgent.perAgentDefaultModel exists:
    candidates.append({ source: "per-agent", model: delegatingAgent.perAgentDefaultModel })

  if config.jl_subagent_models.default exists:
    candidates.append({ source: "global", model: config.jl_subagent_models.default })

  candidates = removeUnknownModelsWithWarnings(candidates)
  candidates = removeDuplicatesPreservingOrder(candidates)

  for candidate in candidates:
    if harnessSupportsModel(harness, candidate.model):
      return {
        modelResolved: candidate.model,
        modelResolutionSource: candidate.source,
        warnings: collectSubstitutionWarningsIfNeeded(request.model, candidate.model)
      }

  return {
    modelResolved: delegatingAgent.hardFallbackModel,
    modelResolutionSource: "fallback",
    warnings: ["No configured candidate model was available in this harness; used hard fallback."]
  }
```

## Example Resolution Flows

### Example 1 — research request with no explicit model

```text
request.delegationType = "research"
request.model = unset
config.jl_subagent_models.research = "claude-sonnet-5"
delegating skill per-agent default = "claude-sonnet-5"
config.jl_subagent_models.default = "claude-sonnet-5"

Result:
  modelResolved = "claude-sonnet-5"
  source = "per-type"
```

### Example 2 — explicit override for a complex task

```text
request.model = "claude-opus-4.5"
request.delegationType = "research"

If the harness supports "claude-opus-4.5":
  modelResolved = "claude-opus-4.5"
  source = "explicit"
```

### Example 3 — browser harness fallback

```text
request.model = "gpt-4-turbo"
request.delegationType = "documentation"
browser harness does not support "gpt-4-turbo"
config.jl_subagent_models.documentation = "claude-sonnet-5"

Result:
  modelResolved = "claude-sonnet-5"
  source = "per-type"
  warning = "Requested model 'gpt-4-turbo' unavailable in browser harness; using 'claude-sonnet-5' instead."
```

## Harness Model Availability and Constraints

Different harnesses can expose different model sets.

### Copilot CLI

**Status:** best overall support.

- typically exposes the widest model inventory
- preferred harness for explicit model control and true subagent spawning
- still validate availability rather than assuming every model name is enabled

### Browser / OpenCode

**Status:** partial support.

- may expose only a subset of models
- may support skills but not full subagent spawning
- should warn when a requested model is unavailable and a fallback model is
  selected instead

### Azure DevOps / Copilot Extensions

**Status:** harness-dependent.

- task-tool availability and model inventory may vary by host integration
- parent agents should treat model support as runtime data, not a static
  guarantee

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

## Why Not Use Fleet Mode Directly?

Fleet mode still coordinates agents, not skills. That design limitation does
not change with model selection. The recommended workaround remains direct
subagent spawning where supported, or inline execution and agent fallback where
it is not.

## Decision Table

| Need | Harness | Recommended | Fallback |
| --- | --- | --- | --- |
| Spawn subagent with explicit model | CLI | `DelegateToSubagent` + model resolution | per-type or per-agent fallback |
| Spawn subagent with explicit model | Browser | inline or limited delegation + fallback warning | per-type or global fallback |
| Spawn planning subagent | CLI | task tool (native) | skill inline |
| Spawn planning subagent | Browser | skill inline | feature-reviewer agent |
| Invoke adversarial review | Any | adversarial-review skill | feature-reviewer agent |

## Requirements

Parent agents using `DelegateToSubagent` MUST:

- resolve approval before attempting delegation
- resolve the model hierarchy before spawning the child task
- validate candidate model names
- validate harness availability before selecting the final model
- record `modelResolved` in the delegation result
- warn when harness constraints force a different model than requested

Parent agents MUST NOT:

- assume model availability without checking the current harness
- silently ignore an explicit model override
- silently keep an invalid or misspelled model name
- report a requested model as used when a fallback model actually ran

## Related Skills & Agents

See `references/DEPENDENCIES.md` for relationships to `jl-planner`,
`jl-feature-planner`, `jl-adversarial-review`, `jl-feature-reviewer`, and
`jl-planning-workflow`.
