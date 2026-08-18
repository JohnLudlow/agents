# Harness Fallback Algorithm: Model Resolution, Capability Matrix, and Decision Tree

This reference documents the cascading model-fallback algorithm, the harness
capability matrix, and the decision tree parent agents use when resolving
which model a delegated subagent should run on.

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

The six candidate levels, in priority order, are: explicit request, task
override, per-delegation-type default, per-agent default, global default, and
hard fallback. See `SKILL.md` → Hierarchical Model Selection for the
short-form summary of this precedence.

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

## Harness Capability Matrix

| Harness | Status | Models | Subagent Spawning | Notes |
|---------|--------|--------|-------------------|-------|
| **Copilot CLI** | Best support | Widest inventory | Full support | Validate availability at runtime |
| **Browser / OpenCode** | Partial support | Subset of models | Limited | May support skills but not full spawning; warn on fallback |
| **Azure DevOps / Copilot Extensions** | Harness-dependent | Variable | Variable | Task-tool availability varies by host; treat as runtime data |

### Copilot CLI

- Typically exposes the widest model inventory.
- Preferred harness for explicit model control and true subagent spawning.
- Still validate availability rather than assuming every model name is
  enabled.

### Browser / OpenCode

- May expose only a subset of models.
- May support skills but not full subagent spawning.
- Should warn when a requested model is unavailable and a fallback model is
  selected instead.

### Azure DevOps / Copilot Extensions

- Task-tool availability and model inventory may vary by host integration.
- Parent agents should treat model support as runtime data, not a static
  guarantee.

## Decision Tree Example (Browser Harness Unavailability)

1. User requests `gpt-4-turbo` for documentation.
2. Browser harness doesn't support `gpt-4-turbo`.
3. Walk candidates: none match.
4. Fallback to `config.jl_subagent_models.documentation = "claude-sonnet-5"`.
5. Browser supports `claude-sonnet-5`.
6. Result: model resolved to `claude-sonnet-5`, source = `per-type`, warning
   issued.

## Required Warning Behavior

When the resolved model differs from the requested or configured preferred
model because of harness constraints:

- Continue if a valid fallback exists.
- Record the substitution in `DelegationResult.warnings`.
- Tell the user in plain language when the substitution materially affects
  the delegated task.

Recommended wording:

> Requested model `{requested}` is unavailable in this harness. Delegation
> will continue with `{resolved}`.

## Decision Table

| Need | Harness | Recommended | Fallback |
| --- | --- | --- | --- |
| Spawn subagent with explicit model | CLI | `DelegateToSubagent` + model resolution | per-type or per-agent fallback |
| Spawn subagent with explicit model | Browser | inline or limited delegation + fallback warning | per-type or global fallback |
| Spawn planning subagent | CLI | task tool (native) | skill inline |
| Spawn planning subagent | Browser | skill inline | feature-reviewer agent |
| Invoke adversarial review | Any | adversarial-review skill | feature-reviewer agent |

## Related

- `SKILL.md` → Hierarchical Model Selection — the short-form precedence list
  this algorithm implements.
- `SKILL.md` → `DelegateToSubagent` API — the `DelegationRequest` /
  `DelegationResult` contract this algorithm populates.
