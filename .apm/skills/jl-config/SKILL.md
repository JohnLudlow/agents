---
name: jl-config
description: "Portable config resolution and validation library for reading repository-defined settings from AGENTS.md and CONTRIBUTING.md"
---

# jl-config

## Overview

This skill provides a reusable mechanism for agents and skills to read
configuration from repository documentation files (`AGENTS.md` and
`CONTRIBUTING.md`) with deterministic precedence and validation.

jl-config is a **configuration library, not a configuration schema**. It defines
how to resolve settings, not what settings exist. Individual agents and skills
document their own settings in their own skill documentation.

Use this skill when you need to:

- resolve settings from `AGENTS.md` and `CONTRIBUTING.md` with clear precedence
- validate configuration YAML for syntax and semantic correctness
- handle missing configuration gracefully across all file-presence states
- apply the same portable resolution logic consistently across agents

The mechanism is intentionally self-contained and portable: any repository can
use jl-config without reading this repository's `CONTRIBUTING.md` or learning
repository-specific conventions. Configuration schema and defaults belong in
the individual agents/skills that consume them.

## Load contract

Routine consumers read SKILL.md for the core rules. Load
[references/EXAMPLES.md](references/EXAMPLES.md) (file-presence and merge
examples), [references/AUTHORING_GUIDE.md](references/AUTHORING_GUIDE.md)
(consumer configuration), [references/WARNING_EXAMPLES.md](references/WARNING_EXAMPLES.md)
(warning illustrations), and `validation-rules.md` (detailed validation).

## Worked Examples

If you're a repository maintainer learning what to write in CONTRIBUTING.md or
AGENTS.md, start with [references/EXAMPLES.md](references/EXAMPLES.md) — worked
examples showing minimal config, override patterns, and resolution precedence
in action.

If you're an agent or skill developer implementing config consumption, read the
[Resolution Pattern](#resolution-pattern) and [Validation Pattern](#validation-pattern)
sections below, and [references/AUTHORING_GUIDE.md](references/AUTHORING_GUIDE.md)
when writing your consumer `SKILL.md` configuration.

## Generic Configuration Model

Repository configuration is expressed as YAML embedded in `AGENTS.md` and/or
`CONTRIBUTING.md`. Each agent or skill defines its own configuration section
and documents its own keys and defaults.

Hypothetical consumer example (file-presence cases in [references/EXAMPLES.md](references/EXAMPLES.md)):

```yaml
jl_quiz_requirements:
  quiz_mode: in_chat
  plan_destination: github_issue
  file_storage_location: docs/plans/
```

Agents may read settings from either file, from both, or from neither. The
resolution mechanism below remains the same in every repository.

## Resolution Pattern

Configuration resolution must work in all portable repository states:

- neither file exists
- only `CONTRIBUTING.md` exists
- only `AGENTS.md` exists
- both files exist
- one or both files exist but define only a subset of settings

### Source Rules

1. Read `AGENTS.md` if it exists.
2. Read `CONTRIBUTING.md` if it exists.
3. Extract configuration YAML from whichever files contain it (agents define their own key paths).
4. Start from the documented defaults (defined by the consuming agent/skill).
5. Merge `CONTRIBUTING.md` settings onto defaults.
6. Merge `AGENTS.md` settings onto the result.
7. Apply precedence at the individual setting level, not only at whole-object level.

Result:

- `AGENTS.md` overrides `CONTRIBUTING.md` per setting
- `CONTRIBUTING.md` fills any setting not defined in `AGENTS.md`
- defaults (from the consuming agent/skill) fill any setting defined in neither file

### Resolution Pseudocode (Generic)

```text
// Consuming agent defines defaults and its own configuration key path
// Example: jl-quiz defines defaults for jl_quiz_requirements config
defaults = <defined by consuming agent/skill>

contributingConfig = {}
agentsConfig = {}

if CONTRIBUTING.md exists:
  contributingConfig = parseYamlFromMarkdown(CONTRIBUTING.md)["<agent-key>"] or {}

if AGENTS.md exists:
  agentsConfig = parseYamlFromMarkdown(AGENTS.md)["<agent-key>"] or {}

resolved = deepMerge(defaults, contributingConfig, agentsConfig)

return resolved
```

## Validation Pattern

Validation is the responsibility of the consuming agent/skill. Each agent
defines its own validation rules for its configuration keys.

jl-config provides guidance on implementing portable validation:

### Generic Validation Checklist

1. **YAML syntax validity** — the extracted YAML must parse successfully; malformed indentation, duplicate mappings, and invalid quoting are failures
2. **Root shape** — the agent-specific key (e.g., `jl_quiz_requirements`) must be an object if present; otherwise resolution falls back to defaults
3. **Type validation** — each setting must have the expected type; reject or coerce with a warning
4. **Enum validation** (when applicable) — reject values not in the allowed set
5. **Portable rules** — use repository-relative paths; allow partial configuration

Each consuming agent documents its own schema, defaults, types, and enums in its
own skill documentation. jl-config validates only the mechanism (YAML syntax,
type shapes); agents validate their own semantics. The generic validation
pseudocode lives in [validation-rules.md](validation-rules.md).

## Setting Sensitivity (Required, Recommended, Optional)

Each consuming agent or skill defines how strongly it depends on its own settings.

### Required

Declare a setting **required** when the agent cannot safely proceed without a
resolved value.

Behavior:

- first try resolved config
- if not configured, ask the user
- do not silently invent a value
- once the user answers, continue with that session value even if the repo does
  not persist it

### Recommended

Declare a setting **recommended** when a default exists and work can continue,
but explicit repo guidance would materially improve consistency.

Behavior:

- use the resolved config if present
- if missing, use the documented default
- optionally tell the user which default was applied
- prompt only if the missing choice is likely to cause churn

### Optional

Declare a setting **optional** when it only affects ergonomics or formatting and
the absence of the setting should not interrupt work.

Behavior:

- use the resolved config if present
- otherwise use the default silently unless surfacing it adds value

Worked sensitivity examples: [references/EXAMPLES.md](references/EXAMPLES.md).

## Guidance for Agents and Skills

### Handling Missing Config Gracefully

Agents and skills should:

- resolve settings using defaults before declaring config missing
- ask the user only for settings that are required for safe progress
- explain the consequence of the choice when prompting
- avoid framing optional preferences as blockers
- keep behaviour portable across repositories with zero setup

### Prompting Pattern

When prompting is required:

1. state which setting is missing
2. explain why it matters
3. provide explicit options when enums exist
4. accept a session-only answer if the repository is not being updated
5. continue without demanding that the user edits config files

Example:

```text
I could not find plan_destination in jl_quiz_requirements config
(checked AGENTS.md and CONTRIBUTING.md).
I need this to know where to place the plan.
Please choose one: github_issue, azure_devops_work_item, local_file, inline_message.
```

## Reporting Configuration Warnings

Agents should warn users about invalid or missing configuration at startup, making
problems visible without blocking execution. This section defines the standard
warning format for all agents using jl-config.

### Warning Occasions

Agents should emit warnings when: 1) **Invalid configuration** is detected
(YAML syntax error, type mismatch, enum violation, or constraint failure), or
2) a **required setting is unresolved** after resolution (no default, not
configured).

Agents should not warn about missing optional/recommended settings, files that
don't exist, or settings that resolve to their defaults.

### Standard Warning Format

Every configuration warning should follow this format:

```text
[WARN] <agent-or-skill-name>: <specific issue>
  File: <filename> [<line-number>] (if applicable; omit if only "not found")
  Fix: <actionable guidance for the user>
```

### When to Log Warnings

Agents should log warnings:

1. **At startup/initialization** — as soon as the agent begins resolving config
2. **To stdout/stderr** — make warnings visible in real time
3. **Before proceeding with work** — do not silently continue with invalid config
4. **Without blocking** — emit warnings but continue execution with defaults

Warnings should flow directly to the user, not be hidden in agent-internal logs.

### Warning Volume and Clarity

To keep warnings actionable:

- emit **one warning per distinct problem**
- do **not** emit cascading warnings (e.g., if an object is malformed, warn about the object,
  not about every field inside it)
- do **not** warn about every default applied; only warn about actual problems
- do **not** repeat the same warning twice in one session

### Consuming Agent Responsibility

Each agent that uses jl-config is responsible for:

1. defining what settings matter and which are required/recommended/optional
2. implementing validation against its own schema (use `.apm/skills/jl-config/validation-rules.md`
   as the reference for validation layers)
3. emitting warnings in the standard format when validation fails or required settings are missing
4. documenting **exactly which warnings** it may emit (see [references/WARNING_EXAMPLES.md](references/WARNING_EXAMPLES.md))

## Portability Contract

For `jl-config` to remain portable across repositories and agents:

- the resolution mechanism (precedence, merging) must remain stable
- individual agents define their own schemas, not jl-config
- validation depends on the consuming agent's schema, not jl-config's
- **warning format is standardized** so users see consistent output across all agents
- examples demonstrate zero-config through full-override cases
- consuming agents tolerate absent files and partial configs
- no agent-specific code appears in jl-config itself

## Completion Standard

A repository adoption of `jl-config` (by an agent or skill) is considered healthy when:

- the agent resolves its config with zero ambiguity across all file-presence states
- the agent validates its own settings against its own schema
- missing required settings trigger prompts or warnings (not silent assumptions)
- missing optional/recommended settings fall back to documented defaults
- **configuration warnings follow the standard format and are visible to the user**
- the agent works correctly in test scenarios with and without config files
