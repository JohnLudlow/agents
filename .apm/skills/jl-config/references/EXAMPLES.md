---
description: "Worked examples showing how to write ## Agent config YAML blocks in CONTRIBUTING.md and AGENTS.md"
---

# Agent Config Examples

This document provides worked examples for repository maintainers who want to configure agents and skills using the
portable `## Agent config` pattern.

For technical details on resolution rules, validation schema, and error handling, see:

- [SKILL.md](../SKILL.md) — the config mechanism
- [validation-rules.md](../validation-rules.md) — the schema reference
- [LINTER_EXAMPLES.md](../references/LINTER_EXAMPLES.md) — error messages and fixes

## Example 1: Minimal Config

**Scenario**: A small repository that wants to configure a single agent with defaults for everything else.

**CONTRIBUTING.md**:

```yaml
## Agent config

my_agent:
  interview_mode: b
```

**AGENTS.md**: (not present in this repository)

**Resolution result** (what the agent reads at startup):

```yaml
my_agent:
  interview_mode: b
  plan_destination: github_issue    # default
  file_storage_location: docs/plans/ # default
```

**What happened**:

1. `my_agent` block read from CONTRIBUTING.md
2. `interview_mode: b` set explicitly
3. `plan_destination` and `file_storage_location` filled in by defaults (not in any file)
4. Result: agent runs with one custom setting + two defaults

---

## Example 2: Override Precedence

**Scenario**: A team repository where the default team config is in CONTRIBUTING.md, but individual harnesses override
it via AGENTS.md.

**CONTRIBUTING.md** (team-wide defaults):

```yaml
## Agent config

my_agent:
  interview_mode: a
  plan_destination: github_issue
  file_storage_location: docs/plans/
```

**AGENTS.md** (this harness overrides one setting):

```yaml
# AGENTS.md — Claude harness specific config

my_agent:
  interview_mode: b
```

**Resolution result** (what the agent reads at startup):

```yaml
my_agent:
  interview_mode: b              # from AGENTS.md (override)
  plan_destination: github_issue # from CONTRIBUTING.md (fallback)
  file_storage_location: docs/plans/ # from CONTRIBUTING.md (fallback)
```

**What happened**:

1. Start with defaults
2. Merge CONTRIBUTING.md onto defaults → sets all three settings
3. Merge AGENTS.md onto result → overrides `interview_mode` only
4. Result: AGENTS.md wins for `interview_mode`, CONTRIBUTING.md provides fallback for the rest

**Why this pattern matters**:

- Team can define baseline config in CONTRIBUTING.md
- Individual harnesses (CLI, web, VS Code) can override *specific settings* without repeating the whole block
- No need to copy/paste the entire config into AGENTS.md

---

## Example 3: Multi-Agent Config with Partial Override

**Scenario**: A repository configuring multiple agents, with some overrides for a specific harness.

**CONTRIBUTING.md** (team defaults):

```yaml
## Agent config

my_quiz_agent:
  interview_mode: a
  plan_destination: github_issue

my_planning_agent:
  decision_gates:
    destination_confirmation: false
    research_afk: false
  uncertainty_tracking:
    pattern: "## Not Yet Specified (Fog of War)"
```

**AGENTS.md** (CLI harness, selective overrides):

```yaml
# AGENTS.md — GitHub Copilot CLI harness

my_quiz_agent:
  plan_destination: markdown    # override: store plans as markdown

my_planning_agent:
  decision_gates:
    destination_confirmation: true  # override: require explicit confirmation
```

**Resolution result**:

```yaml
my_quiz_agent:
  interview_mode: a            # from CONTRIBUTING.md
  plan_destination: markdown   # from AGENTS.md (override)

my_planning_agent:
  decision_gates:
    destination_confirmation: true # from AGENTS.md (override)
    research_afk: false            # from CONTRIBUTING.md (fallback)
  uncertainty_tracking:
    pattern: "## Not Yet Specified (Fog of War)" # from CONTRIBUTING.md (fallback)
```

**What happened**:

- Precedence is **per setting**, not per agent or per file
- `my_quiz_agent.plan_destination` came from AGENTS.md
- `my_quiz_agent.interview_mode` came from CONTRIBUTING.md
- `my_planning_agent.decision_gates.destination_confirmation` came from AGENTS.md
- `my_planning_agent.decision_gates.research_afk` came from CONTRIBUTING.md
- `my_planning_agent.uncertainty_tracking` came entirely from CONTRIBUTING.md (not overridden)

---

## Example 4: Missing Files, Graceful Fallback

**Scenario**: A repository with no CONTRIBUTING.md or AGENTS.md; agent uses only defaults.

**CONTRIBUTING.md**: (not present)

**AGENTS.md**: (not present)

**Resolution result** (what the agent reads at startup):

```yaml
my_agent:
  interview_mode: a                   # default
  plan_destination: github_issue      # default
  file_storage_location: docs/plans/  # default
```

**What happened**:

1. Check AGENTS.md → doesn't exist, skip
2. Check CONTRIBUTING.md → doesn't exist, skip
3. Apply agent defaults for every setting
4. Result: agent runs with documented defaults

**Why this works**:

- Missing config files are not errors
- Agent always has a working config (defaults are the fallback)
- Optional config is truly optional

---

## Example 5: Validation Error — Invalid Type

**Scenario**: A maintainer writes incorrect YAML and wants to understand the error.

**CONTRIBUTING.md** (❌ INVALID):

```yaml
## Agent config

my_agent:
  interview_mode: ["a", "b"]  # Wrong! Should be a string, not a list
```

**What the validator reports**:

```text
✗ CONTRIBUTING.md: [ERROR] my_agent.interview_mode must be a string or valid enum
  File: CONTRIBUTING.md [line 4]
  Got: list (["a", "b"])
  Fix: Change to a single value: interview_mode: a
```

**How to fix**:

```yaml
## Agent config

my_agent:
  interview_mode: a  # Correct: string value, not a list
```

For more validation errors and how to fix them, see [LINTER_EXAMPLES.md](LINTER_EXAMPLES.md).

---

## Pattern Summary

### Resolution Order

1. Read agent defaults (defined in the agent/skill documentation)
2. Merge CONTRIBUTING.md settings (if file exists)
3. Merge AGENTS.md settings (if file exists)
4. **Precedence**: AGENTS.md > CONTRIBUTING.md > defaults (per setting)

### File Presence States (All Valid)

| CONTRIBUTING.md | AGENTS.md | Behavior |
|:---|:---|:---|
| ❌ Missing | ❌ Missing | Use agent defaults for everything |
| ✅ Present | ❌ Missing | Use CONTRIBUTING.md + defaults |
| ❌ Missing | ✅ Present | Use AGENTS.md + defaults |
| ✅ Present | ✅ Present | Merge both, with AGENTS.md precedence |

### Best Practices

**Use CONTRIBUTING.md for**:

- Team-wide defaults that should apply to all harnesses
- Configuration that doesn't vary per harness (most teams stay here)

**Use AGENTS.md for**:

- Harness-specific overrides (if your repository supports multiple harnesses)
- Settings that vary by IDE or CLI tool

**If you only have one harness** (most common):

- Put config in CONTRIBUTING.md
- You may never need AGENTS.md

---

## See Also

- [SKILL.md](../SKILL.md) — Complete resolution mechanism and model
- [validation-rules.md](../validation-rules.md) — Schema reference (per-agent keys, allowed values)
- [LINTER_EXAMPLES.md](../references/LINTER_EXAMPLES.md) — Error messages and how to fix them
