---
description: "Configuration example and workflow-behaviour notes for delegation"
---

# Configuration

Example configuration and workflow behaviour notes for jl-planner delegation.

## Example configuration

```yaml
jl_approval_gates:
  plan_approval_required: true
```

### Workflow behaviour (not configuration)

The following are resolved as workflow rules at each delegation decision
point, not as separate configuration keys, per the repository's boolean-only
approval-gate schema:

- **Per-task nuance** — the planner may still judge that a specific delegated
  task type (e.g. `research`) is lower-risk than another (e.g. `breakdown`);
  it should still resolve the single `plan_approval_required` boolean and
  prompt or skip accordingly, rather than expecting a per-task config
  override.
- **Inheriting a parent Recon decision** — when `jl-planner` is invoked from
  `jl-recon`, it inherits the parent session's already-resolved approval
  decision instead of re-prompting for the same bounded delegation.
- **Fallback on decline** — if the user declines, continue the work inline in
  the parent planner and record the gap; do not silently skip the work.
- **Fallback when delegation is unavailable** — if the harness cannot spawn a
  subagent, warn the user in plain language and offer inline continuation as
  the fallback path.

## See Also

- [SKILL.md](../SKILL.md#configuration) — Schema and resolution rules
