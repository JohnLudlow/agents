---
description: "Delegation pseudocode for design, implementation, test, and parent control"
---

# Delegation Workflows

Full pseudocode for jl-prototype delegation. The entry point keeps workflow
names and summaries inline; read this for the full steps.

## Design subquestion workflow

```text
Run jl-quiz
  -> surface design subquestion
  -> decide if scope exceeds inline quiz handling
  -> resolve prototype approval gate
  -> if approval required, ask:
       "Delegate design to {target_agent}? [Approve] [Decline]"
  -> if approved, call DelegateToSubagent(design)
  -> collect child design decisions into prototype report
  -> resume parent quiz with updated shared understanding
```

### Implementation workflow

```text
Prototype scaffold planned
  -> detect implementation slice too large for one session
  -> partition into bounded child task
  -> resolve prototype approval gate or inherited parent gate
  -> if approved, call DelegateToSubagent(implementation)
       on child branch/worktree
  -> collect code artifacts, notes, and self-check outputs
  -> integrate accepted result into parent prototype branch
```

### Test generation workflow

```text
Prototype artifact exists
  -> determine test or verification gap
  -> resolve per-task approval override for test delegation
  -> if approved, call DelegateToSubagent(test)
       using polyglot-test-agent or jl-feature-tester
  -> collect generated tests, test results, and gaps
  -> summarize pass/fail status in prototype report
```

### Parent control pseudocode

```text
for each surfaced subtask:
  classify subtask type
  resolve effective approval mode
  if mode requires prompt:
    ask "Delegate {task_type} to {target_agent}? [Approve] [Decline]"
  if approved:
    create child worktree + child branch
    DelegateToSubagent(subtask)
    collect returned artifacts
  else if fallback == inline:
    continue inline
  else:
    mark subtask manual
finalize consolidated prototype report
```

### Concrete examples

1. Research delegation with override:
   delegate a difficult design spike with `model: "claude-opus-4.5"`; if the
   harness supports it, use Opus instead of the prototype defaults.
2. Test generation with per-type model:
   use `jl_subagent_models.test_generation: "claude-opus-4.5"` for reasoning
   about edge-case unit tests while leaving implementation on `gpt-4-turbo`.
3. Harness fallback:
   if browser harness cannot honor `gpt-4-turbo` for an implementation subtask,
   fall back to `claude-sonnet-5` or the global default and record the warning.

## See Also

- [SKILL.md](../SKILL.md#when-invoked) — Inline step summaries
- [BRANCH_WORKTREE.md](BRANCH_WORKTREE.md) — Child worktree isolation
- [ARTIFACT_COLLECTION.md](ARTIFACT_COLLECTION.md) — Consolidation rules
