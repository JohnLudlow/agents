---
description: "Illustrative warning examples and the components of the standard warning format"
---

# Warning Examples

Illustrative examples of the standard jl-config warning format, plus the
components that make up a warning. Routine consumers implement the format from
SKILL.md; this file shows what warnings look like and how to build them.

## Example Warnings

```text
[WARN] jl-quiz: 'quiz_mode' has invalid value 'c' (must be 'in_chat' or 'questionnaire')
  File: CONTRIBUTING.md [line 5]
  Fix: Change quiz_mode to 'in_chat' or 'questionnaire' in the jl_quiz_requirements config block
```

```text
[WARN] jl-recon: 'decision_gates' must be an object, not a list
  File: AGENTS.md [line 12]
  Fix: Ensure 'decision_gates' is a YAML object with boolean-valued keys
```

```text
[WARN] jl-issue-management: required setting 'plan_destination' not found
  File: (checked AGENTS.md and CONTRIBUTING.md)
  Fix: Add 'plan_destination: github_issue' to AGENTS.md or CONTRIBUTING.md under jl_issue_management
```

## Warning Components

**\[WARN\] prefix** — all config warnings use this prefix for easy filtering in logs

**agent-or-skill-name** — the name of the agent or skill emitting the warning (e.g., `jl-quiz`, `jl-recon`)

**specific issue** — a one-line description of what is wrong, written for the user to understand:

- State what the problem is (e.g., "invalid enum value", "type mismatch", "required setting missing")
- Avoid jargon; state values concretely
- If applicable, mention what was found vs. what was expected

**File and line number** (optional):

- Include if the error is in a file and location is known
- Omit if the issue is "not found" or no specific location applies
- Format: `File: <filename> [line-number]`

**Fix** — actionable guidance:

- Suggest the exact change the user should make
- If configuration is required for progress, guide the user to the right file
- If the issue is in the syntax, explain what the correct format is
- Be concise but complete

## Example: jl-quiz Warning Documentation

In the jl-quiz skill's SKILL.md, add a "Configuration Warnings" section:

```markdown
## Configuration Warnings

jl-quiz validates its configuration at startup and emits warnings for:

**Type Mismatch**
\`\`\`
[WARN] jl-quiz: 'quiz_mode' must be a string, not a boolean
  Fix: Change the value to 'in_chat' or 'questionnaire' (keep quotes)
\`\`\`

**Enum Violation**
\`\`\`
[WARN] jl-quiz: 'plan_destination' has invalid value 'slack'
  (must be one of: github_issue, azure_devops_work_item, local_file,
  inline_message)
  Fix: Change to one of the allowed values
\`\`\`

**Missing Required Setting**
\`\`\`
[WARN] jl-quiz: required setting 'plan_destination' not found
  in AGENTS.md or CONTRIBUTING.md
  Fix: Add to CONTRIBUTING.md or AGENTS.md under jl_quiz_requirements or jl_quiz_understanding:
    plan_destination: github_issue
\`\`\`

**Invalid File Path**
\`\`\`
[WARN] jl-quiz: 'file_storage_location' must be repository-relative (no leading / or drive letters)
  File: AGENTS.md [line 8]
  Fix: Change '/docs/plans' to 'docs/plans' or use a relative path
\`\`\`
```

The agent then implements warnings using these templates, adapting the language
to match its schema and reporting the line number if known.
