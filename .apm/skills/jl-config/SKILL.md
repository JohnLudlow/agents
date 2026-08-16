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
repository-specific conventions. Configuration schema and defaults belong in the
individual agents/skills that consume them.

## Generic Configuration Model

Repository configuration is expressed as YAML embedded in `AGENTS.md` and/or
`CONTRIBUTING.md`. Each agent or skill defines its own configuration section
and documents its own keys and defaults.

Example (from a hypothetical jl-quiz skill):

```yaml
jl_quiz:
  interview_mode: a
  plan_destination: github_issue
  file_storage_location: docs/plans/
```

Example (from a hypothetical jl-recon skill):

```yaml
jl_recon:
  decision_gates:
    destination_confirmation: true
    research_afk: true
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
// Example: jl-quiz defines defaults for jl_quiz config
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

### Setting-Level Merge Example

If `CONTRIBUTING.md` contains:

```yaml
jl_quiz:
  interview_mode: a
  plan_destination: github_issue
```

And `AGENTS.md` contains:

```yaml
jl_quiz:
  interview_mode: b
```

Then the resolved result is:

```yaml
jl_quiz:
  interview_mode: b
  plan_destination: github_issue
```

`AGENTS.md` overrides only `interview_mode`; it does not erase sibling settings
supplied by `CONTRIBUTING.md`.

## Validation Pattern

Validation is the responsibility of the consuming agent/skill. Each agent
defines its own validation rules for its configuration keys.

jl-config provides guidance on implementing portable validation:

### Generic Validation Checklist

1. **YAML syntax validity**
   - the extracted YAML must parse successfully
   - malformed indentation, duplicate mappings, and invalid quoting are failures

2. **Root shape**
   - the agent-specific key (e.g., `jl_quiz`, `jl_recon`) must be an object if present
   - if the key is not present, resolution falls back to defaults

3. **Type validation**
   - check that each setting has the expected type (string, boolean, number, object, etc.)
   - if a setting is present but has the wrong type, reject or coerce with a warning

4. **Enum validation** (if applicable to your agent)
   - if a setting has an enumerated set of allowed values, validate against them
   - reject values not in the enum

5. **Portable rules**
   - do not require repository-specific absolute paths; use repository-relative paths
   - do not make validation depend on unrelated files existing
   - allow configuration to be partial (missing optional settings should not fail)

### Validation Pseudocode (Generic Pattern)

```text
function validate(config):
  errors = []

  // Check basic types
  for each setting in config:
    if value exists and type does not match expected type:
      errors.add("setting '<name>' has wrong type")

  // Check enum values (if applicable)
  for each enum-valued setting:
    if value exists and value not in allowed_enum:
      errors.add("setting '<name>' has invalid enum value")

  // Check constraints
  for each constrained setting:
    if constraint violated:
      errors.add("setting '<name>' violates constraint")

  return errors
```

Each consuming agent documents its own schema, defaults, types, and enums in its
own skill documentation. jl-config validates only the mechanism (YAML syntax,
type shapes); agents validate their own semantics.

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

Example:

- jl-quiz may require `plan_destination` to know where to write output

### Recommended

Declare a setting **recommended** when a default exists and work can continue,
but explicit repo guidance would materially improve consistency.

Behavior:

- use the resolved config if present
- if missing, use the documented default
- optionally tell the user which default was applied
- prompt only if the missing choice is likely to cause churn

Example:

- jl-quiz may recommend `file_storage_location` to guide artifact placement

### Optional

Declare a setting **optional** when it only affects ergonomics or formatting and
the absence of the setting should not interrupt work.

Behavior:

- use the resolved config if present
- otherwise use the default silently unless surfacing it adds value

Example:

- a custom `pattern` setting for marking uncertainty may be optional if a portable
  default already works well

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
I could not find plan_destination in jl_quiz config 
(checked AGENTS.md and CONTRIBUTING.md).
I need this to know where to place the plan.
Please choose one: github_issue, azure_devops_work_item, local_file, inline_message.
```

### Authoring Guidance for Repositories

- Prefer `AGENTS.md` for agent-facing overrides and tighter local behaviour.
- Use `CONTRIBUTING.md` for broader repository defaults shared by humans and agents.
- Keep values portable and repository-relative.
- Override only the settings you need; omitted settings inherit from lower
  precedence sources or defaults.

### Authoring Guidance for Agents and Skills

Each agent or skill should document its own configuration in its own skill `SKILL.md`:

1. **Configuration section heading**: name your config section clearly (e.g., `jl_quiz` for jl-quiz)
2. **Schema table**: document each setting with type, enum values (if any), and defaults
3. **Setting sensitivity**: mark each setting required, recommended, or optional
4. **Examples**: show how the config looks in CONTRIBUTING.md and AGENTS.md
5. **Prompting guidance**: explain how missing settings are handled

Example (in jl-quiz SKILL.md):

```markdown
## Configuration

jl-quiz reads settings from `jl_quiz` configuration in AGENTS.md or CONTRIBUTING.md.

### Schema

| Setting | Type | Allowed values | Default | Sensitivity |
| --- | --- | --- | --- | --- |
| `interview_mode` | string | `a` or `b` | `a` | recommended |
| `plan_destination` | string | github_issue, local_file, ... | (none) | required |
| `file_storage_location` | string | repository-relative path | `docs/plans/` | recommended |

### Defaults

If jl_quiz config is not found, jl-quiz uses:

- interview_mode: a
- plan_destination: (prompts user if required and missing)
- file_storage_location: docs/plans/

### Examples

In CONTRIBUTING.md:
\`\`\`yaml
jl_quiz:
  plan_destination: github_issue
  interview_mode: a
\`\`\`

In AGENTS.md (overrides interview_mode only):
\`\`\`yaml
jl_quiz:
  interview_mode: b
\`\`\`
```

## Examples

### Example 1: No Config Files

Repository state:

- no `AGENTS.md`
- no `CONTRIBUTING.md`

Resolved config (any agent):

- all default values apply (defined by the consuming agent)
- the agent remains usable without repository setup

### Example 2: Only CONTRIBUTING.md

`CONTRIBUTING.md` contains (for jl-quiz):

```yaml
jl_quiz:
  interview_mode: b
  plan_destination: github_issue
```

Resolved config:

- `interview_mode: b` (from CONTRIBUTING.md)
- `plan_destination: github_issue` (from CONTRIBUTING.md)
- any other jl-quiz settings use defaults

### Example 3: Only AGENTS.md

`AGENTS.md` contains (for jl-recon):

```yaml
jl_recon:
  destination_confirmation: true
```

Resolved config:

- `destination_confirmation: true` (from AGENTS.md)
- any other jl-recon settings use defaults

### Example 4: Both Files with Precedence

`CONTRIBUTING.md` contains:

```yaml
jl_quiz:
  interview_mode: a
  plan_destination: github_issue
```

`AGENTS.md` contains:

```yaml
jl_quiz:
  interview_mode: b
```

Resolved config:

- `interview_mode: b` (AGENTS.md overrides CONTRIBUTING.md)
- `plan_destination: github_issue` (from CONTRIBUTING.md, not in AGENTS.md)
- any other jl-quiz settings use defaults

## Portability Contract

For `jl-config` to remain portable across repositories and agents:

- the resolution mechanism (precedence, merging) must remain stable
- individual agents define their own schemas, not jl-config
- validation depends on the consuming agent's schema, not jl-config's
- examples demonstrate zero-config through full-override cases
- consuming agents tolerate absent files and partial configs
- no agent-specific code appears in jl-config itself

## Completion Standard

A repository adoption of `jl-config` (by an agent or skill) is considered healthy when:

- the agent resolves its config with zero ambiguity across all file-presence states
- the agent validates its own settings against its own schema
- missing required settings trigger prompts rather than silent assumptions
- missing optional/recommended settings fall back to documented defaults
- the agent works correctly in test scenarios with and without config files
- another repository can use the same agent and achieve the same behavior
