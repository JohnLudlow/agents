---
description: "Branch and worktree management for parallel documenter work"
---

# Branch & Worktree Management

Detailed workspace management for jl-documenter delegation. The entry point
keeps branch names, worktree names and coordination rules inline where they
are routine; read this for the full detail.

## Branch naming

- Parent documentation branch: choose the session's main documentation branch as the coordination root.

- Child section branch pattern: `docs/{doc-id}/{section}-{agent-id}`

- Each child branch must track back to the main documentation branch used by the parent `jl-documenter` session.

### Worktree naming

Use this naming pattern for section worktrees:

`worktree-docs-{section}-{unix-seconds}`

### Coordination rules

- one delegated section per child branch

- keep section scope bounded to its assigned branch

- merge completed sections back into the parent documentation branch only after review

- offer manual review before cleanup of child worktrees and branches

### Merge strategy

Choose a merge strategy that matches the documentation set:

- single PR or single review artifact when the document only makes sense as one coordinated publish event

- separate PRs per section when review ownership differs or when sections can land independently without confusing readers

In both cases, the parent documentation branch remains the roll-up point for consistency checks and publication readiness.

## See Also

- [SKILL.md](../SKILL.md#branch--worktree-management) — Routine branch naming and coordination rules
