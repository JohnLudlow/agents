---
description: "Illustrative jl_approval_gates configuration in CONTRIBUTING.md and AGENTS.md"
---

# Configuration Examples

Worked examples for the `jl_approval_gates` configuration read by jl-documenter.

In `CONTRIBUTING.md`:

```yaml
jl_approval_gates:
  documentation_approval_required: true
  documentation_publish_approval_required: true
```

In `AGENTS.md`:

```yaml
jl_approval_gates:
  documentation_approval_required: false
```

## See Also

- [SKILL.md](../SKILL.md#configuration) — Schema and resolution rules
