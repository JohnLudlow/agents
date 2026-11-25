---
description: "Worktree and branch naming and rules for delegated test generation"
---

# Worktree & Branch Management

Detailed workspace management for jl-feature-tester delegation.

## Naming

- child worktree:
  `worktree-test-{component}-{unix-seconds}`
- child branch:
  `test/{component}/{unix-seconds}`

If a parent feature branch exists, the child branch may nest under it; the
important rule is isolation plus traceability.

### Rules

- Do not generate delegated test code directly on the user's active feature branch first.
- Keep each delegated component or major verification stream in its own worktree initially.
- Track each child worktree by component, language, framework, and intended coverage level.
- Merge accepted generated test files back into the feature branch only after review and validation.
- Auto-clean child worktrees after merge when the workflow allows it, or retain them temporarily when the user wants reviewable isolation.
- Record cleanup status in the consolidated test report.

## See Also

- [SKILL.md](../SKILL.md#worktree--branch-management) — Routine policy
- [ARTIFACT_COLLECTION.md](ARTIFACT_COLLECTION.md) — Consolidation rules
