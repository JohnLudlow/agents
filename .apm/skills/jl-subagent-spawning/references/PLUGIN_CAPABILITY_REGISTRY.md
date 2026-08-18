# Plugin Capability Registry: The Capability Manifest

This reference documents how a delegation target — a skill, agent, or
plugin — declares which delegation-relevant capabilities it supports, and how
a parent agent discovers that declaration before delegating to it.

Resolves the "Plugin capability registry" fog item from
[#110](https://github.com/JohnLudlow/agents/issues/110).

## The Problem This Solves

The Harness Capability Matrix (`HARNESS_FALLBACK.md`) answers one axis: what
the *runtime environment* (CLI, Browser, Azure DevOps) can do. It says
nothing about the other axis: what the *specific delegation target* — the
skill, agent, or plugin the parent wants to delegate to — itself supports or
requires. A harness that can spawn subagents is still the wrong choice if the
target plugin doesn't support running inside a worktree, or only knows how to
run on one model family. Without a declared answer to that second axis,
parent agents either hard-code per-plugin exceptions or guess.

## The Capability Manifest

Every skill or agent that participates in delegation declares a
`capabilities` block in its own frontmatter — the same file that already
carries its `name`, `description`, and `disable-model-invocation`. There is
no separate registry file to keep in sync: the artifact's own frontmatter is
the single source of truth for what it supports, exactly as it already is
the source of truth for its own name and invocation mode.

```yaml
---
name: some-plugin
description: ...
capabilities:
  subagent_spawning: true      # can this artifact itself spawn bounded subagents
  fleet_mode: false            # exposes or prefers fleet-mode-style parallel dispatch
  worktree_isolation: true     # can run inside an isolated worktree
  supported_models: [claude-sonnet-5, gpt-5.4]   # optional; omit to inherit the model hierarchy
---
```

- Every field is a boolean except `supported_models`, following the same
  boolean-first convention as `jl_approval_gates` — no enum or `_mode`
  variant.
- `supported_models` is optional. When present, it narrows model resolution
  to models the target actually knows how to run; when absent, resolution
  falls through the existing hierarchy in `HARNESS_FALLBACK.md` unchanged.
- A `capabilities` block is itself optional. A skill or agent with no block
  is **capability-unknown**, not capability-denied: treat every field as
  `false`/absent and apply the existing "Fallback when delegation is
  unavailable" rule from `SKILL.md`. No migration is required for existing
  skills and agents.

## Discovery

A parent agent reads the `capabilities` block from the specific target's own
frontmatter at the moment it is about to delegate to that target — the same
frontmatter it already has open to resolve the target's name and
description. There is no separate always-loaded registry to scan; the
manifest rides along with the artifact it describes, so it can never drift
out of sync with what the artifact actually does.

## Relating the Manifest to the Harness Capability Matrix

A delegation may proceed only when both axes agree:

1. The current harness supports the required mechanism (Harness Capability
   Matrix in `HARNESS_FALLBACK.md` — e.g., can it spawn subagents at all,
   can it create worktrees).
2. The target's capability manifest doesn't declare a requirement the
   harness can't meet (e.g., the target's manifest sets
   `worktree_isolation: true` as a hard requirement, but the current harness
   cannot create worktrees).

If either axis fails, apply the same fallback and warning behavior already
documented in `SKILL.md` → "Fallback when delegation is unavailable": warn
in plain language, offer the supported inline path, and record that
delegation was unavailable — do not invent a second fallback vocabulary.

### Worked example

```text
Parent wants to delegate a Prototype ticket to `jl-prototype`.

1. Harness = Copilot CLI. Harness Capability Matrix: subagent spawning = full support,
   worktree creation = supported.
2. Read jl-prototype's capabilities manifest:
     subagent_spawning: false   (jl-prototype does not itself spawn further subagents)
     worktree_isolation: true   (jl-prototype requires its own branch/worktree)
     supported_models: unset    (inherits the model hierarchy)
3. Both axes agree: harness can create the worktree jl-prototype requires.
4. Delegation proceeds; model resolution falls through the existing hierarchy
   unchanged because supported_models was unset.
```

## Out of Scope for This Reference

- Changing the six-candidate model resolution cascade in
  `HARNESS_FALLBACK.md`. `supported_models` is an additional filter applied
  before that cascade runs, not a new precedence level — the cascade itself
  is unchanged.
- Validating `capabilities` blocks in `scripts/validate-config.js`. That
  script validates repository-level configuration
  (`jl_approval_gates`, `jl_subagent_models`, `jl_subagent_delegation`); a
  `capabilities` block lives in a skill or agent's own frontmatter, a
  different validation surface. Extending skill/agent metadata validation to
  cover it is a natural follow-up, not part of this reference.
- A central plugin discovery index. This reference deliberately keeps
  discovery co-located with each artifact rather than centralizing it; see
  "Discovery" above.

## Related

- `SKILL.md` → "Fallback when delegation is unavailable" — the shared
  warning and fallback behavior this reference reuses rather than
  duplicating.
- `HARNESS_FALLBACK.md` → Harness Capability Matrix — the runtime-environment
  axis this reference's target-capability axis complements.
- `HARNESS_FALLBACK.md` → Model Resolution Pseudocode — the cascade
  `supported_models` filters ahead of, without altering.
