---
description: "Illustrative warnings for jl_issue_management config problems"
---

# Warning Examples

Illustrative warnings in the standard jl-config format. The normative policy
and obligations stay in SKILL.md; use these as templates for the same cases.

## Type Mismatch — plan_destination

```text
[WARN] jl-issue-management: 'plan_destination' must be a string, not a boolean
  File: CONTRIBUTING.md [line 5]
  Fix: Change the value to a string: plan_destination: github_issue
```

## Enum Violation — plan_destination

```text
[WARN] jl-issue-management: 'plan_destination' has invalid value "slack"
  (must be one of: github_issue, azure_devops_work_item, local_file,
  inline_message)
  File: AGENTS.md [line 8]
  Fix: Change to one of the allowed destination types
```

## Missing Required Setting

```text
[WARN] jl-issue-management: required setting 'plan_destination' not found
  in AGENTS.md or CONTRIBUTING.md
  File: (checked both config files)
  Fix: Add to CONTRIBUTING.md under jl_issue_management:
    plan_destination: github_issue
```

## Invalid File Path — absolute path

```text
[WARN] jl-issue-management: 'file_storage_location' must be
  repository-relative (no leading /)
  File: AGENTS.md [line 10]
  Fix: Change "/docs/plans" to "docs/plans"
```

## Invalid File Path — parent directory

```text
[WARN] jl-issue-management: 'file_storage_location' must not contain ".."
  (parent directory traversal)
  File: CONTRIBUTING.md [line 9]
  Fix: Use a simple repository-relative path like "docs/plans"
```

## Type Mismatch — decision gate

```text
[WARN] jl-issue-management: 'decision_gates.destination_confirmation'
  must be a boolean (true/false), not a string
  File: AGENTS.md [line 12]
  Fix: Change the value to a boolean: destination_confirmation: true
```

## Root Shape Error

```text
[WARN] jl-issue-management: 'jl_issue_management' config block must be
  an object, not a list
  File: AGENTS.md [line 5]
  Fix: Change to YAML object syntax (key: value pairs)
```
