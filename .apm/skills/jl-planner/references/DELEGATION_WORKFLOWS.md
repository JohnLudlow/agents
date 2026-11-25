---
description: "Delegation pseudocode for breakdown, research, specialist planning, and parent control"
---

# Delegation Workflows

Full pseudocode for jl-planner delegation. The entry point keeps workflow
names and summaries inline; read this for the full steps.

## Breakdown workflow

```text
Run jl-planning-workflow BLOCKERs
  -> reach shared understanding via jl-quiz-requirements
  -> evaluate planning scope
  -> if scope fits one session:
       continue inline
  -> if scope is too large:
       partition into bounded components

       resolve plan approval gate for breakdown
       if approval required:
         ask "Delegate Breakdown of {component} to {target_agent}? [Approve] [Decline]"
       if approved:
         create child plan artifact target
         create child worktree/branch if code or prototype work is involved
         native delegation in the current harness (breakdown)
         collect returned plan sections, risks, and dependencies
       else:
         use configured inline/manual fallback
  -> merge accepted child outputs into master plan
  -> present consolidated plan for acceptance or revision
```

### Research workflow

```text
Run jl-planning-workflow BLOCKERs
  -> identify unanswered planning questions
  -> classify research questions that can run independently
  -> resolve plan approval gate for research
  -> if approval required:
       ask "Delegate research of {subject} to {target_agent}? [Approve] [Decline]"
  -> if approved:
       native delegation in the current harness (research) in parallel where practical
       collect findings, recommendations, and unresolved risks
  -> else:
       use configured inline/manual fallback
  -> fold accepted findings into sequencing, assumptions, and risk sections
  -> present updated master plan for acceptance or revision
```

### Specialist planning workflow

```text
Clarification or breakdown reveals a specialist planning need
  -> select bounded target agent
  -> resolve specialist-planning approval mode
  -> if approved, native delegation in the current harness (specialist-planning)
  -> collect returned plan section and assumptions
  -> validate against parent scope and constraints
  -> merge into master plan
```

### Parent control pseudocode

```text
for each surfaced planning subtask:
  classify task_type
  choose bounded target_agent
  resolve effective approval mode
  if prompt required:
    ask for approval
  if approved:
    prepare child artifact target
    if code or prototype work may occur:
      create and register child worktree/branch
    native delegation of the task_type subtask
    collect returned artifacts
  else:
    apply configured fallback

consolidate all accepted child outputs
verify no contradictions remain
present consolidated plan to user
```

### Concrete examples

1. Research delegation with override:
   a complex dependency comparison can request `claude-opus-4.5` explicitly for
   one task while ordinary planning research stays on Sonnet.
2. Test-generation by type:
   if planning includes delegated validation spikes, `test_generation` can map
   to Claude by default while performance-sensitive test prototypes override to
   `gpt-4-turbo`.
3. Harness fallback:
   if browser harness lacks the requested model, fall back through per-type,
   per-agent, then global defaults and tell the user which model actually ran.

## See Also

- [SKILL.md](../SKILL.md#delegation-workflows) — Workflow summaries inline
- [WORKTREE_BRANCH.md](WORKTREE_BRANCH.md) — Child artifact isolation
- [CONSOLIDATION.md](CONSOLIDATION.md) — Merging child outputs
