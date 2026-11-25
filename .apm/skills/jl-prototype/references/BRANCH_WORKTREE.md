---
description: "Parent branch and child worktree hierarchy for delegated prototype work"
---

# Branch & Worktree Management

Detailed workspace management for jl-prototype. Delegated prototype subtasks
must stay grouped under the parent prototype branch.

## Parent branch

- Parent branch: `prototype/<slug>`

### Child worktrees

Each delegated subtask gets:

- worktree name:
  `worktree-proto-{subtask-id}-{unix-seconds}`
- child branch under the parent prototype branch namespace, for example:
  `prototype/<slug>/<subtask-id>`

This preserves a clear hierarchy:

```text
prototype/<slug>                      parent prototype branch
  ├─ prototype/<slug>/design-auth     delegated design branch
  ├─ prototype/<slug>/impl-api        delegated implementation branch
  └─ prototype/<slug>/tests-smoke     delegated test branch
```

### Rules

- Never reuse the user's pre-existing working branch for delegated prototype
  work.
- Keep each delegated experiment isolated to its own child worktree.
- Record the worktree path, child branch, owning subtask, and cleanup status in
  the prototype report.
- When the parent prototype closes, offer to clean up child worktrees.
- If the prototype is kept and evolved, keep the parent branch and only remove
  child worktrees whose results have been merged or intentionally discarded.
- If the prototype is discarded, offer to remove the parent branch and all
  child worktrees together.

## See Also

- [SKILL.md](../SKILL.md#when-invoked) — Inline step summaries
- [ARTIFACT_COLLECTION.md](ARTIFACT_COLLECTION.md) — Consolidation rules
