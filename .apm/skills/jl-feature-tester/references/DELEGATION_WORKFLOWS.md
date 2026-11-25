---
description: "Delegation pseudocode for test generation, verification, and parent control"
---

# Delegation Workflows

Full pseudocode for jl-feature-tester delegation. The entry point keeps
workflow names and summaries inline; read this for the full steps.

## Test generation workflow

```text
discover changed components and existing tests
  -> identify testable component or missing coverage
  -> choose inline vs delegated generation
  -> resolve test approval gate for generation
  -> if approval required, ask:
       "Generate tests for {component} using {agent}? [Approve] [Decline]"
  -> if approved, create child worktree/branch
  -> native delegation of generation in the current harness
  -> collect generated test files and child run results
  -> run or queue parent validation and CI checks
  -> accept, revise, or fall back inline
```

### Verification workflow

```text
tests executed
  -> inspect pass/fail, coverage, regressions, or noisy failures
  -> decide if inline analysis is enough
  -> if not, resolve test approval gate for verification
  -> if approved, native delegation of verification
  -> collect findings, likely root causes, and recommended next steps
  -> fold result into consolidated test report
```

### Parent control pseudocode

```text
discover()
for each component or test gap:
  classify task_type
  select target agent
  resolve effective approval mode
  if prompt required:
    ask for approval
  if approved:
    create child worktree + child branch
    native delegation of the task_type subtask
    collect artifacts and child findings
  else:
    apply fallback
run parent validation and CI checks
consolidate generated files, coverage, results, and recommendations
report accept / reject / revise outcome
```

## See Also

- [SKILL.md](../SKILL.md#delegation-workflows) — Workflow summaries inline
- [AGENT_SELECTION.md](AGENT_SELECTION.md) — Target agent selection
- [WORKTREE_BRANCH.md](WORKTREE_BRANCH.md) — Child worktree isolation
- [ARTIFACT_COLLECTION.md](ARTIFACT_COLLECTION.md) — Consolidation rules
- [CI_INTEGRATION.md](CI_INTEGRATION.md) — CI gating and async flow
