---
description: "Machine-readable validation schema and examples for agent configuration YAML"
---

# Validation Rules Reference

This document defines validation rules for agent configuration YAML blocks in
`CONTRIBUTING.md` and `AGENTS.md`. It is the source of truth for both runtime
agents and CI linters.

## Validation Layers

Validation operates in three layers, applied in order:

1. **YAML Syntax** — YAML parses without errors (indentation, quoting, key duplication)
2. **Schema Shape** — Agent config key exists; if present, it is the correct type (object)
3. **Semantic Validation** — Setting values conform to documented enums and constraints

If a layer fails, validation stops and reports the failure. Later layers are not
evaluated until earlier layers pass.

---

## Layer 1: YAML Syntax

**Rule:** Extract and parse YAML from the config block. All YAML syntax must be valid.

**Failures:**

- Indentation error (inconsistent or non-multiples of 2 spaces)
- Duplicate keys in mapping
- Invalid quoting (unmatched quotes, invalid escape sequences)
- Invalid YAML type (e.g., leading zeros in numbers, unquoted colons in strings)
- Mixing tabs and spaces

**Example (INVALID — duplicate key):**

```yaml
jl_quiz:
  quiz_mode: a
  quiz_mode: b
```

**Example (VALID):**

```yaml
jl_quiz:
  quiz_mode: a
```

---

## Layer 2: Root Shape Validation

**Rule:** After parsing, check that each agent config key is an object (mapping).

**Per-agent key names:**

- `jl_quiz`
- `jl_recon`
- `jl_issue_management`

**Failures:**

- Agent config key is a scalar (string, number, boolean) instead of an object
- Agent config key is an array instead of an object

**Example (INVALID — scalar):**

```yaml
jl_quiz: true
```

**Example (INVALID — array):**

```yaml
jl_quiz:
  - mode: a
  - mode: b
```

**Example (VALID — object):**

```yaml
jl_quiz:
  quiz_mode: a
```

**Success case (missing key):**
If the agent config key is missing entirely (not present in either file or in both),
this is not a Layer 2 failure — it falls through to defaults or prompting at runtime.
Layer 2 only validates *if the key is present*.

---

## Layer 3: Semantic Validation

### 3.1 jl-quiz Validation

Agent key: `jl_quiz`

#### Required Settings

- **`plan_destination`** (string)
  - Allowed values: `github_issue`, `azure_devops_work_item`, `local_file`, `inline_message`
  - Failure if: value is not one of these strings
  - Failure if: value is present but is not a string (e.g., boolean, number)
  - Default: none (required; runtime must prompt if unresolved after config resolution)

#### Recommended Settings

- **`quiz_mode`** (string)
  - Allowed values: `a`, `b`
  - Failure if: value is not one of these strings
  - Failure if: value is present but is not a string
  - Default: `a`

- **`file_storage_location`** (string)
  - Allowed values: any repository-relative path
  - Failure if: value is not a string
  - Failure if: value is an absolute path (starts with `/` or drive letter on Windows)
  - Failure if: value contains `..` (parent directory traversal)
  - Failure if: value is an empty string
  - Default: `docs/plans/`

#### Example (VALID)

```yaml
jl_quiz:
  quiz_mode: a
  plan_destination: github_issue
  file_storage_location: docs/plans/
```

#### Example (INVALID — enum violation)

```yaml
jl_quiz:
  plan_destination: slack_thread  # not in allowed list
```

#### Example (INVALID — type mismatch)

```yaml
jl_quiz:
  quiz_mode: 1  # must be string "a" or "b"
```

#### Example (INVALID — missing required)

```yaml
jl_quiz:
  quiz_mode: a
  # plan_destination missing — required
```

---

### 3.2 jl-recon Validation

Agent key: `jl_recon`

#### Optional Settings

All jl-recon settings are optional; defaults apply if missing.

- **`decision_gates.destination_confirmation`** (boolean)
  - Allowed values: `true`, `false`
  - Failure if: value is not a boolean (e.g., string `"true"`, number `1`)
  - Default: `false`

- **`decision_gates.inciting_issue_confirmation`** (boolean)
  - Allowed values: `true`, `false`
  - Failure if: value is not a boolean
  - Default: `false`

- **`decision_gates.research_afk`** (boolean)
  - Allowed values: `true`, `false`
  - Failure if: value is not a boolean
  - Default: `false`

- **`uncertainty_tracking.pattern`** (string)
  - Allowed values: any markdown heading string (e.g., `## Fog of War`, `### Unknowns`)
  - Failure if: value is not a string
  - Failure if: value is an empty string
  - Failure if: value does not start with one or more `#` characters
  - Default: `## Not Yet Specified (Fog of War)`

#### Example (VALID)

```yaml
jl_recon:
  decision_gates:
    destination_confirmation: true
    inciting_issue_confirmation: false
    research_afk: true
  uncertainty_tracking:
    pattern: "## Unknowns (TBD)"
```

#### Example (INVALID — type mismatch)

```yaml
jl_recon:
  decision_gates:
    destination_confirmation: "true"  # must be boolean, not string
```

#### Example (INVALID — heading format)

```yaml
jl_recon:
  uncertainty_tracking:
    pattern: "Not Yet Specified"  # missing # prefix
```

#### Example (VALID — all defaults applied)

```yaml
jl_recon:
  decision_gates:
    destination_confirmation: true
  # inciting_issue_confirmation, research_afk, and uncertainty_tracking use defaults
```

---

### 3.3 jl-issue-management Validation

Agent key: `jl_issue_management`

#### Required Settings

- **`plan_destination`** (string)
  - Allowed values: `github_issue`, `azure_devops_work_item`, `local_file`, `inline_message`
  - Failure if: value is not one of these strings
  - Failure if: value is present but is not a string
  - Default: none (required; runtime must prompt if unresolved after config resolution)

#### Recommended Settings

- **`file_storage_location`** (string)
  - Allowed values: any repository-relative path
  - Failure if: value is not a string
  - Failure if: value is an absolute path
  - Failure if: value contains `..`
  - Failure if: value is an empty string
  - Default: `docs/plans/`

#### Optional Settings

- **`decision_gates.destination_confirmation`** (boolean)
  - Allowed values: `true`, `false`
  - Failure if: value is not a boolean
  - Default: `false`

- **`decision_gates.inciting_issue_confirmation`** (boolean)
  - Allowed values: `true`, `false`
  - Failure if: value is not a boolean
  - Default: `false`

- **`decision_gates.research_afk`** (boolean)
  - Allowed values: `true`, `false`
  - Failure if: value is not a boolean
  - Default: `false`

#### Example (VALID)

```yaml
jl_issue_management:
  plan_destination: github_issue
  file_storage_location: docs/plans/
  decision_gates:
    destination_confirmation: false
    research_afk: true
```

#### Example (INVALID — missing required)

```yaml
jl_issue_management:
  file_storage_location: docs/plans/
  # plan_destination missing — required
```

---

## Detecting Invalid vs. Missing Config

### Invalid Config

Config is **invalid** when:

- YAML syntax fails (Layer 1)
- Agent config key is present but is not an object (Layer 2)
- A setting value violates its semantic rules (Layer 3)

**Validator action:** Report the specific failure and the line where it occurred.

**Runtime agent action:** Log a warning at startup with the specific violation,
allowing the agent to continue with defaults.

**CI action:** Fail the validation check with the specific error message.

### Missing Config

Config is **missing** when:

- No `CONTRIBUTING.md` exists
- No `AGENTS.md` exists
- Both files exist but do not contain the agent config key
- A required setting (e.g., `jl_quiz.plan_destination`) is not found in either file
  after config resolution

**Validator action:** This is not a failure — resolution falls back to defaults.
If a required setting has no default, runtime prompts the user.

**Runtime agent action:** Use the documented default or prompt the user.

**CI action:** No failure — missing config is not an error.

---

## Validation Examples by Scenario

### Scenario: All Valid Config

**Input (CONTRIBUTING.md):**

```yaml
jl_quiz:
  quiz_mode: a
  plan_destination: github_issue

jl_recon:
  decision_gates:
    destination_confirmation: false
    research_afk: false
```

**Input (AGENTS.md):**

```yaml
jl_quiz:
  quiz_mode: b
```

**Result:** ✓ VALID

- All keys are objects
- All values conform to their enums and types
- Resolved config (after merge): `quiz_mode: b` (from AGENTS.md override),
  `plan_destination: github_issue` (from CONTRIBUTING.md), all jl-recon defaults applied

---

### Scenario: Invalid Enum Value

**Input (CONTRIBUTING.md):**

```yaml
jl_quiz:
  plan_destination: slack_thread
```

**Result:** ✗ INVALID

- `plan_destination` value `slack_thread` not in allowed enum
- Error: `jl_quiz.plan_destination: 'slack_thread' is not one of [github_issue, azure_devops_work_item, local_file, inline_message]`

---

### Scenario: Type Mismatch

**Input (CONTRIBUTING.md):**

```yaml
jl_recon:
  decision_gates:
    destination_confirmation: "true"
```

**Result:** ✗ INVALID

- `destination_confirmation` value is string `"true"`, not boolean `true`
- Error: `jl_recon.decision_gates.destination_confirmation: expected boolean, got string`

---

### Scenario: Missing Required Setting

**Input (CONTRIBUTING.md):**

```yaml
jl_quiz:
  quiz_mode: a
  # plan_destination missing
```

**Input (AGENTS.md):**

```yaml
jl_quiz:
  quiz_mode: b
```

**Result:** ✓ VALID (Config shape is valid)

- But at runtime: jl-quiz will notice `plan_destination` is still unresolved
- Runtime will prompt the user or apply a session default

---

### Scenario: Missing Files (No Config Present)

**Input:** Neither CONTRIBUTING.md nor AGENTS.md exists

**Result:** ✓ VALID

- No config to validate
- All agents use their documented defaults at runtime
- Agents may prompt if a required setting still cannot be resolved

---

## Machine Consumption

Validators and runtime agents consume this document as follows:

### For Linters

1. Read the agent config key name (e.g., `jl_quiz`)
2. Check if the key is present in CONTRIBUTING.md or AGENTS.md
3. If not present, no error (missing config is not invalid)
4. If present, apply all validation rules in Layer 1, 2, 3 order
5. Report specific failures with line numbers

### For Runtime Agents

1. Load and merge config using jl-config resolution
2. For each setting:
   - If setting is present, check Layer 3 semantic rules
   - If Layer 3 fails, log a warning (don't block execution)
   - If setting is missing and has a default, use the default
   - If setting is missing, required, and has no default, prompt the user
3. Continue execution with resolved config

---

## Related Documentation

- [jl-config SKILL.md](./) — Configuration resolution mechanism
- [jl-quiz SKILL.md](../jl-quiz/SKILL.md) — Quiz agent configuration
- [jl-recon SKILL.md](../jl-recon/SKILL.md) — Recon agent configuration
- [jl-issue-management SKILL.md](../jl-issue-management/SKILL.md) — Issue management configuration
