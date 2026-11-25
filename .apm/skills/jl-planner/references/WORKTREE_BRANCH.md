---
description: "Worktree and branch naming, lifecycle, and merge strategy for delegated planning"
---

# Worktree and Branch Management

Detailed workspace management for jl-planner. Delegated planning is primarily
a planning-artifact flow, but some delegated tasks may create bounded prototype
or proof-of-concept artifacts; when code or prototype work is involved, isolate
it.

## Naming

Each delegated breakdown or planning task that needs its own artifact set gets:

- a plan document or plan artifact identifier named
  `plan-{component}-{ticket-id}-{unix-seconds}`
- a matching worktree or branch name when code or prototype work is involved

Use kebab-case for `{component}` and keep `{ticket-id}` aligned with the
inciting issue, parent issue, or equivalent tracking identifier.

### Lifecycle

1. Parent planner creates or reserves the child artifact target.
2. If code or prototype work is expected, create a dedicated child worktree and
   branch before delegating.
3. Register the child worktree/branch in the parent plan notes or coordination
   record.
4. Child agent writes its outputs only within its bounded artifact area.
5. Parent planner collects accepted outputs and notes any remaining cleanup.
6. When the delegated task closes, cleanup or archive the child worktree per
   repository or harness closure rules.

### Merge and consolidation strategy

- Treat the master plan as the source of record.
- Merge child plans by section, not by blindly concatenating full documents.
- Preserve component-local detail where useful, but normalize scope,
  dependencies, sequencing, risks, and acceptance criteria.
- Link to retained child artifacts when they remain useful as supporting detail.
- Summarize or archive transient child branches/worktrees once their outputs are
  consolidated.

## See Also

- [SKILL.md](../SKILL.md) — Routine artifact naming notes
- [CONSOLIDATION.md](CONSOLIDATION.md) — Collect, verify, consolidate, present
