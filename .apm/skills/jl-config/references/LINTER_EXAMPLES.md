---
description: "Example error messages from the YAML config linter"
---

# Configuration Linter Examples

This document shows example error messages from the `validate-config.js` linter,
which validates agent configuration YAML in `CONTRIBUTING.md` and `AGENTS.md`.

## Running the Linter

The linter runs automatically as part of `npm run validate`:

```bash
npm run validate
```

Or run it directly:

```bash
node scripts/validate-config.js
```

## Success Examples

### Valid jl_quiz Configuration

**Input (CONTRIBUTING.md or AGENTS.md):**

```yaml
jl_quiz:
  quiz_mode: a
  plan_destination: github_issue
  file_storage_location: docs/plans/
```

**Output:**

```text
✓ CONTRIBUTING.md agent config is valid
```

### Valid jl_recon Configuration

**Input:**

```yaml
jl_recon:
  decision_gates:
    destination_confirmation: true
    research_afk: false
  uncertainty_tracking:
    pattern: "## Unknowns"
```

**Output:**

```text
✓ CONTRIBUTING.md agent config is valid
```

### Missing Optional Config (Not an Error)

**Input:**

```yaml
jl_recon:
  decision_gates:
    destination_confirmation: true
  # Other settings use defaults
```

**Output:**

```text
✓ CONTRIBUTING.md agent config is valid
```

## Error Examples

### Error: Missing Required Setting

**Input (jl_quiz without plan_destination):**

```yaml
jl_quiz:
  quiz_mode: a
  file_storage_location: docs/plans/
  # Missing: plan_destination (required)
```

**Output:**

```text
✗ CONTRIBUTING.md: [WARN] jl_quiz: missing required setting 'plan_destination'
  Fix: Check value types and allowed values. See .apm/skills/jl-config/validation-rules.md Layer 3
```

### Error: Invalid Enum Value

**Input (invalid plan_destination):**

```yaml
jl_quiz:
  plan_destination: slack_thread
  quiz_mode: a
```

**Output:**

```text
✗ CONTRIBUTING.md: [WARN] jl_quiz.plan_destination: 'slack_thread' is not valid. 
Allowed: github_issue, azure_devops_work_item, local_file, inline_message
  Fix: Check value types and allowed values. See .apm/skills/jl-config/validation-rules.md Layer 3
```

### Error: Type Mismatch (Boolean Instead of String)

**Input (quiz_mode as number instead of string):**

```yaml
jl_quiz:
  plan_destination: github_issue
  quiz_mode: 1
```

**Output:**

```text
✗ CONTRIBUTING.md: [WARN] jl_quiz.quiz_mode: must be string, got number
  Fix: Check value types and allowed values. See .apm/skills/jl-config/validation-rules.md Layer 3
```

### Error: Invalid Path (Absolute Path)

**Input (file_storage_location with absolute path):**

```yaml
jl_quiz:
  plan_destination: github_issue
  file_storage_location: /absolute/path/to/docs
```

**Output:**

```text
✗ CONTRIBUTING.md: [WARN] jl_quiz.file_storage_location: cannot be absolute path (got '/absolute/path/to/docs')
  Fix: Check value types and allowed values. See .apm/skills/jl-config/validation-rules.md Layer 3
```

### Error: Invalid Path (Parent Directory Traversal)

**Input (file_storage_location with ..):**

```yaml
jl_quiz:
  plan_destination: github_issue
  file_storage_location: ../../docs/
```

**Output:**

```text
✗ CONTRIBUTING.md: [WARN] jl_quiz.file_storage_location: cannot contain '..' (got '../../docs/')
  Fix: Check value types and allowed values. See .apm/skills/jl-config/validation-rules.md Layer 3
```

### Error: Invalid Shape (Agent Config is Not an Object)

**Input (jl_quiz as array instead of object):**

```yaml
jl_quiz:
  - quiz_mode: a
  - plan_destination: github_issue
```

**Output:**

```text
✗ CONTRIBUTING.md: [WARN] jl_quiz: Config key 'jl_quiz' must be an object, got array
  Fix: Ensure 'jl_quiz' is an object (mapping). See .apm/skills/jl-config/validation-rules.md Layer 2
```

### Error: Invalid Boolean Type (String "true" Instead of Boolean true)

**Input (decision_gates.destination_confirmation as string):**

```yaml
jl_recon:
  decision_gates:
    destination_confirmation: "true"
```

**Output:**

```text
✗ CONTRIBUTING.md: [WARN] jl_recon.decision_gates.destination_confirmation: must be boolean, got string
  Fix: Check value types and allowed values. See .apm/skills/jl-config/validation-rules.md Layer 3
```

### Error: Invalid Heading Pattern

**Input (uncertainty_tracking.pattern without # prefix):**

```yaml
jl_recon:
  uncertainty_tracking:
    pattern: "Unknowns"
```

**Output:**

```text
✗ CONTRIBUTING.md: [WARN] jl_recon.uncertainty_tracking.pattern: must start with '#' (markdown heading), got 'Unknowns'
  Fix: Check value types and allowed values. See .apm/skills/jl-config/validation-rules.md Layer 3
```

### Error: Empty String Not Allowed

**Input (file_storage_location as empty string):**

```yaml
jl_quiz:
  plan_destination: github_issue
  file_storage_location: ""
```

**Output:**

```text
✗ CONTRIBUTING.md: [WARN] jl_quiz.file_storage_location: cannot be empty string
  Fix: Check value types and allowed values. See .apm/skills/jl-config/validation-rules.md Layer 3
```

## Interpreting Error Messages

Each error message follows this format:

```text
✗ FILENAME: [WARN] agent.setting: specific issue
  Fix: guidance referencing the validation rules
```

### Parts

- **FILENAME**: `CONTRIBUTING.md` or `AGENTS.md`
- **agent.setting**: The agent name and setting path (e.g., `jl_quiz.plan_destination`)
- **specific issue**: The validation failure (type mismatch, enum violation, missing required, etc.)
- **Fix**: Actionable guidance pointing to the validation rules document and the relevant layer

### Validation Layers

Errors are categorized by which validation layer caught them:

- **Layer 1**: YAML Syntax (indentation, duplicate keys, quotes)
- **Layer 2**: Schema Shape (agent config key must be object)
- **Layer 3**: Semantic Validation (value types, enums, constraints)

To understand why a config is invalid, consult:
[.apm/skills/jl-config/validation-rules.md](./.apm/skills/jl-config/validation-rules.md)

## Common Fixes

### "missing required setting"

**Cause:** jl_quiz or jl_issue_management requires `plan_destination` but it's not
in either `CONTRIBUTING.md` or `AGENTS.md`.

**Fix:** Add the required setting:

```yaml
jl_quiz:
  plan_destination: github_issue
```

### "not valid. Allowed: ..."

**Cause:** A setting value is not one of the allowed enum values.

**Fix:** Use one of the listed allowed values:

```yaml
# Before (invalid)
jl_quiz:
  plan_destination: slack_thread

# After (valid)
jl_quiz:
  plan_destination: github_issue
```

### "must be string, got boolean/number"

**Cause:** A string setting was given a boolean or number value instead.

**Fix:** Wrap the value in quotes:

```yaml
# Before (invalid)
jl_quiz:
  quiz_mode: 1

# After (valid)
jl_quiz:
  quiz_mode: a
```

### "must be boolean, got string"

**Cause:** A boolean setting was given a string like `"true"` or `"false"`.

**Fix:** Use unquoted boolean keywords:

```yaml
# Before (invalid)
jl_recon:
  decision_gates:
    destination_confirmation: "true"

# After (valid)
jl_recon:
  decision_gates:
    destination_confirmation: true
```

### "cannot be absolute path"

**Cause:** A file path setting was given an absolute path (starts with `/` or drive letter).

**Fix:** Use a repository-relative path:

```yaml
# Before (invalid)
jl_quiz:
  file_storage_location: /usr/local/docs/

# After (valid)
jl_quiz:
  file_storage_location: docs/plans/
```

### "cannot contain '..'"

**Cause:** A file path setting contains parent directory traversal (`..`).

**Fix:** Use a forward relative path:

```yaml
# Before (invalid)
jl_quiz:
  file_storage_location: ../../docs/

# After (valid)
jl_quiz:
  file_storage_location: docs/plans/
```

## Validation Does Not Run on Code Blocks

The linter ignores YAML inside triple-backtick code blocks (` ``` `). This means
example configurations and templates in documentation are not validated — only
actual, active configuration in plain markdown is checked.

**Example (not validated):**

```yaml
# This configuration is not validated because it's in a code block
jl_quiz:
  plan_destination: slack_thread
```

**Example (validated):**

```text
jl_quiz:
  plan_destination: github_issue
```

The linter only validates the second type (plain markdown config blocks, not inside
code fences).

## Integration with CI

The validator runs as part of the standard CI check:

```bash
npm run validate
```

This command:

1. Validates APM package structure (apm.yml, agent definitions)
2. Validates agent configuration YAML in CONTRIBUTING.md and AGENTS.md

Both must pass for CI to succeed. If configuration is invalid, the error message
will guide you to the specific violation and the validation rules document.
