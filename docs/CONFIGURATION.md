# Configuration Guide

This guide covers the two configuration surfaces used across this package's agents and skills:
**repository-level configuration** (settings a downstream repository overrides in `AGENTS.md` or
`CONTRIBUTING.md`) and the **plugin capability manifest** (settings a skill or agent declares about
itself, in its own frontmatter).

## Repository-Level Configuration

Each skill or agent defines its own configuration options, documented in that skill's own
`SKILL.md`. See the README's [Agent and Skill Configuration](../README.md#agent-and-skill-configuration)
section for the current list, and [`jl-config`](../.apm/skills/jl-config/SKILL.md) for the shared
resolution mechanism (`AGENTS.md`/`CONTRIBUTING.md` merge rules, precedence, and validation).

Notable repository-level namespaces:

- `jl_quiz`, `jl_recon`, `jl_issue_management` — per-skill workflow settings
  - `jl_recon.model_selection` — configure model preferences for delegated recon flows and quality checks
  - `jl_recon.title_format` — customize issue title formatting for maps and tickets (see [jl-recon Title Format Configuration](./jl-recon-title-format.md))
- `jl_approval_gates` — boolean gates controlling whether delegation may happen at all
  (see [`jl-subagent-spawning`](../.apm/skills/jl-subagent-spawning/SKILL.md#approval-gates-jl_approval_gates))
- `jl_subagent_models` — model selection hierarchy for delegated subagents
  (see [`jl-subagent-spawning`](../.apm/skills/jl-subagent-spawning/SKILL.md#hierarchical-model-selection))
- `jl_subagent_delegation.max_nesting_depth` — circular-delegation depth limit, default `3`; must
  be a positive integer (see [`jl-subagent-spawning`](../.apm/skills/jl-subagent-spawning/SKILL.md#circular-delegation-prevention)
  for enforcement and `npm run validate` for the config check)

## Plugin Capability Manifest

Unlike the settings above, the **capability manifest** isn't something a downstream repository
configures in `AGENTS.md`. It's a declaration a skill, agent, or plugin makes about itself, in its
own frontmatter — the same file that already carries its `name` and `description`. There's no
separate registry file to keep in sync: the artifact's own frontmatter is the single source of
truth for what it supports.

A parent agent reads this manifest before delegating to a target, to decide whether that specific
target can run inside a worktree, spawn further subagents, prefer fleet mode, or only run on
certain models — independently of what the runtime harness (CLI, browser, Azure DevOps) itself
supports.

The full schema, discovery mechanism, and relationship to the harness capability matrix are
documented in
[`jl-subagent-spawning/references/PLUGIN_CAPABILITY_REGISTRY.md`](../.apm/skills/jl-subagent-spawning/references/PLUGIN_CAPABILITY_REGISTRY.md).
This section walks through worked examples for common cases.

### Example 1: A plugin that requires its own worktree

`jl-prototype` checks out its own branch and needs an isolated worktree, but never spawns further
subagents itself:

```yaml
---
name: jl-prototype
description: Build a throwaway prototype to answer a design question.
capabilities:
  subagent_spawning: false
  fleet_mode: false
  worktree_isolation: true
---
```

A parent agent delegating a Prototype ticket reads this manifest and only proceeds if the current
harness can create a worktree. If the harness can't, the parent falls back to the existing
"Fallback when delegation is unavailable" behavior — warn the user, offer the inline path, and
record that delegation was unavailable for this session.

### Example 2: A plugin with no manifest (capability-unknown)

Most existing skills predate this mechanism and have no `capabilities` block at all:

```yaml
---
name: jl-markdown-standards
description: Markdown and documentation standards (rumdl, structure, links, code blocks).
---
```

No migration is required. A missing manifest means **capability-unknown, not
capability-denied** — every field is treated as absent, and a parent agent delegating to this
skill applies the same delegation-unavailable fallback it would for a declared `false`.

### Example 3: A plugin that narrows its own model support

A plugin that only knows how to run reliably on specific models can declare that directly, rather
than relying on the repository's `jl_subagent_models` hierarchy alone:

```yaml
---
name: some-plugin
description: A third-party plugin with narrow model support.
capabilities:
  subagent_spawning: true
  fleet_mode: false
  worktree_isolation: false
  supported_models: [claude-sonnet-5, gpt-5.4]
---
```

`supported_models` filters the candidate list *before* the existing six-candidate model resolution
cascade runs (see
[`HARNESS_FALLBACK.md`](../.apm/skills/jl-subagent-spawning/references/HARNESS_FALLBACK.md)) — it
narrows which models are eligible; it does not change the cascade's precedence order.

## Related

- [`jl-subagent-spawning/SKILL.md`](../.apm/skills/jl-subagent-spawning/SKILL.md) — the full
  delegation contract, including the Plugin Capability Registry summary
- [`PLUGIN_CAPABILITY_REGISTRY.md`](../.apm/skills/jl-subagent-spawning/references/PLUGIN_CAPABILITY_REGISTRY.md) —
  the canonical schema and discovery mechanism
- [`jl-config/SKILL.md`](../.apm/skills/jl-config/SKILL.md) — repository-level configuration
  resolution, for the settings that aren't part of a plugin's own manifest
