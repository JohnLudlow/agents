---
description: "Illustrative repository configuration examples in CONTRIBUTING.md and AGENTS.md"
---

# Configuration Examples

Worked examples for `jl_issue_management` configuration. Read these when
authoring config or checking repository defaults.

**In `CONTRIBUTING.md`**

```yaml
jl_issue_management:
  plan_destination: github_issue
  file_storage_location: docs/plans/
  decision_gates:
    destination_confirmation: false
    inciting_issue_confirmation: false
    research_afk: false
```

**In `AGENTS.md`**

```yaml
jl_issue_management:
  plan_destination: local_file
  file_storage_location: docs/plans/
```
