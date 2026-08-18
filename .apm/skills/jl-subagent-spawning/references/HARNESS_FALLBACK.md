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
| **Copilot CLI** | Best support | Widest inventory | Full support | Validate availability at runtime; see Multi-Harness Presence Routing below for cross-session behavior |
| **Browser / OpenCode** | Partial support | Subset of models | Limited | May support skills but not full spawning; warn on fallback |
| **Azure DevOps (Boards)** | Confirmed: capability-gated | N/A directly — delegates to the GitHub Copilot cloud agent | Not supported for Azure Repos; requires a GitHub-hosted repository | Verified 2026-08-18: see "Azure DevOps" below |
| **Kiro (IDE / CLI)** | Confirmed: full support on IDE/CLI | Inherits the invoking agent's configured models | Full support on IDE/CLI; Web/Mobile limited to Kiro's built-in sub-agents only | Verified 2026-08-18: see "Kiro" below |

### Copilot CLI

- Typically exposes the widest model inventory.
- Preferred harness for explicit model control and true subagent spawning.
- Still validate availability rather than assuming every model name is
  enabled.
- Only harness with `/fleet` mode — a top-level slash command that
  decomposes an entire request into a DAG of parallel subtasks. See
  `SKILL.md` → Fleet Mode Utilization (AC1.5) for when to recommend it. It
  precedes, rather than replaces, individual `DelegateToSubagent` calls.

### Browser / OpenCode

- May expose only a subset of models.
- May support skills but not full subagent spawning.
- Should warn when a requested model is unavailable and a fallback model is
  selected instead.

### Azure DevOps

**Status: confirmed, capability-gated** (previously "harness-dependent" /
deferred; verified 2026-08-18 for
[#126](https://github.com/JohnLudlow/agents/issues/126)).

Azure Boards can trigger the GitHub Copilot cloud agent — including custom
agents — directly from a work item, but only when that work item's linked
repository is hosted on GitHub. Azure Repos (Azure DevOps's own Git hosting)
is explicitly unsupported for this integration:

> "This integration requires GitHub repositories and GitHub App
> authentication. Azure Repos (Azure DevOps Git repositories) aren't
> supported for GitHub Copilot integration."
> — [Use GitHub Copilot with Azure Boards, Microsoft Learn](https://learn.microsoft.com/en-us/azure/devops/boards/github/work-item-integration-github-copilot?view=azure-devops)

Practical implications for `DelegateToSubagent`:

- Treat Azure DevOps as capability-gated on the linked repository's host,
  not on Azure DevOps itself: subagent spawning is available only when the
  Azure Boards work item is linked to a GitHub-hosted repository.
- When the linked repository is an Azure Repos (ADO-hosted) repository,
  there is no subagent-spawning path today; apply the "Fallback when
  delegation is unavailable" rule from `SKILL.md`.
- Model selection in this path is the GitHub Copilot cloud agent's own
  model set, not a separate Azure DevOps model inventory.

Source: [Azure Boards integration with GitHub Copilot includes custom agent support, Azure DevOps Blog](https://devblogs.microsoft.com/devops/azure-boards-integration-with-github-copilot-includes-custom-agent-support/),
[Use GitHub Copilot with Azure Boards, Microsoft Learn](https://learn.microsoft.com/en-us/azure/devops/boards/github/work-item-integration-github-copilot?view=azure-devops).

### Kiro

**Status: confirmed, full support on IDE/CLI** (previously deferred;
verified 2026-08-18 for [#126](https://github.com/JohnLudlow/agents/issues/126)).

Kiro's own documentation publishes a capability matrix across its four
surfaces:

| Capability | IDE | CLI | Web | Mobile |
|---|---|---|---|---|
| Automatic sub-agent invocation | Yes | Yes | Yes | Yes |
| Explicit sub-agent invocation | Yes | Yes | Yes | Yes |
| Custom agents as sub-agents | Yes | Yes | No | No |
| Parallel execution | Yes | Yes | Yes | Yes |

On Web and Mobile, delegation is limited to Kiro's built-in sub-agents
("context gathering" and "general purpose"); custom agents defined in
`.kiro/agents/` can only be invoked as sub-agents from the IDE or CLI.

Practical implications for `DelegateToSubagent`:

- An orchestrator agent must explicitly list `subagent` in its own `tools`
  array, or it cannot spawn sub-agents at all — this is Kiro's own
  documented failure mode ("Main agent can't spawn sub-agents → Add
  `subagent` to the orchestrator agent's `tools` array").
- Kiro supports DAG-based dependent sub-agent chains and looping
  stage-review pipelines natively; this exceeds what this skill's own
  circular-delegation and nesting-depth rules assume, but does not
  conflict with them — `maxNestingDepth` and `parentAgentStack` still apply
  to how *this* delegation contract invokes Kiro sub-agents.
- Model selection follows the invoking agent's own configuration; Kiro does
  not expose a separate model-inventory capability query.

Source: [Invoking as sub-agents, Kiro Docs](https://kiro.dev/docs/custom-agents/subagents/).

## Multi-Harness Presence Routing

Resolves the "Multi-harness presence routing" fog item from #110
([#132](https://github.com/JohnLudlow/agents/issues/132)).

### Why this is narrower than it sounds

A running agent instance only has visibility into its own harness — there
is no built-in mechanism for a Copilot CLI session to detect that the same
human also has a concurrent browser session open, or vice versa. Absent
some external coordinator, "choosing between simultaneously available
harnesses" is not a decision a session can make, because it cannot observe
the other harness exists.

### Default rule: stay in the current harness

A delegation always stays within the harness it is already running in.
There is no default cross-harness routing or handoff. This is not a
capability gap to fill later — it is the correct default given that a
session cannot observe sibling sessions in other harnesses.

### The Herdr exception

When sessions run under Herdr (a terminal multiplexer for coding agents
that recognizes coding agents running inside its managed panes and exposes
them through its own CLI; requires `HERDR_ENV=1`), sibling sessions in
other harnesses *can* become visible and controllable. This is the one case
where cross-harness presence routing is technically possible at all.

Even when Herdr makes a sibling harness visible, prefer the current harness
by default. Only route a delegation to a Herdr-visible sibling harness when
the human **explicitly requests** routing to that specific other
session — never as a default preference, and never merely because the
target's capability manifest would be better satisfied elsewhere (that
capability mismatch is handled by the existing "Fallback when delegation is
unavailable" rule in `SKILL.md`, not by silently jumping harnesses).

This same Herdr exception is also what `SKILL.md` → "Fallback when
delegation is unavailable" offers as the human's alternative to inline
execution when the current harness cannot delegate at all — resolving AC1.4
from #77. The two cases share one rule: Herdr routing only happens on
the human's explicit request, whether the current harness merely lacks the
best-suited option (this section) or lacks delegation entirely (AC1.4).

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
| Spawn subagent from a work item | Azure DevOps (Boards), GitHub-linked repo | GitHub Copilot cloud agent + custom agent selection | skill inline |
| Spawn subagent from a work item | Azure DevOps (Boards), Azure Repos-linked | not available | warn; work continues inline |
| Spawn subagent | Kiro (IDE/CLI) | native `subagent` tool | skill inline |
| Spawn subagent | Kiro (Web/Mobile) | built-in sub-agents only | skill inline |
| Invoke adversarial review | Any | adversarial-review skill | feature-reviewer agent |

## Related

- `SKILL.md` → Hierarchical Model Selection — the short-form precedence list
  this algorithm implements.
- `SKILL.md` → `DelegateToSubagent` API — the `DelegationRequest` /
  `DelegationResult` contract this algorithm populates.
