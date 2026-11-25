---
description: "Detailed checks for consolidating delegated child outputs into the master plan"
---

# Plan Artifact Consolidation

Detailed consolidation checks for jl-planner. The entry point keeps
Collect/Verify/Consolidate/Present summaries inline; read this for the full
checks.

## Collect

From each delegated child, collect:

- detailed plan sections
- risk analysis
- research findings
- assumptions and recommendations
- dependencies and sequencing constraints
- optional code, prototype, or proof-of-concept artifact references

### Verify

Before finalizing the master plan, verify:

- no two child plans contradict each other
- cross-component dependencies are explicitly captured
- sequencing still makes sense after research findings are folded in
- risks raised by one child are reflected where they affect other sections
- acceptance criteria remain internally consistent

### Consolidate

Merge returned child outputs into the master implementation plan under the
appropriate sections. Do not leave critical planning facts stranded only in
child outputs.

If contradictions remain:

- surface them explicitly
- propose the smallest decision or follow-up needed to resolve them
- do not pretend consolidation is complete

### Present

Present the consolidated plan to the user for acceptance, revision, or
targeted follow-up on unresolved contradictions or open questions.

## See Also

- [SKILL.md](../SKILL.md#plan-artifact-consolidation) — Inline summaries
- [WORKTREE_BRANCH.md](WORKTREE_BRANCH.md) — Child artifact isolation
