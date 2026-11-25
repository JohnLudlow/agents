---
description: "Multi-author coordination: review expectations, conflict resolution, and workflow"
---

# Multi-Author Coordination

Detailed multi-author coordination for jl-documenter. The entry point keeps a
short policy inline; read this for review expectations, conflict resolution and
the review workflow.

## Review expectations

Every delegated section must be reviewed by one or more of:

- the section author

- a subject-matter expert

- a human reviewer

- the parent `jl-documenter` during consolidation

Review for:

- tone consistency

- technical accuracy

- completeness against the agreed outline

- clarity for the intended audience

- consistency with adjacent sections

## Conflict resolution

If two sections overlap or contradict one another:

- mediate scope boundaries in the parent outline

- request revision from the affected delegated author when that preserves expertise and accountability

- rewrite inline only when faster and safer than a second delegation round

- record unresolved conflicts as publication blockers

## Review workflow

```text
delegated agent provides draft
  -> parent checks structure and metadata
  -> reviewer or subject-matter expert checks accuracy and clarity
  -> approve or request revision
  -> repeat until accepted or intentionally deferred
```

### Coordination with `jl-feature-documenter`

When `jl-feature-documenter` owns implementation-facing feature docs:

- avoid duplicating the same behavior description in a second general section

- let implementation docs carry detailed feature mechanics

- let broader product or platform docs link to the feature section instead of repeating it

## See Also

- [SKILL.md](../SKILL.md#multi-author-coordination) — Short policy inline
- [ARTIFACT_COLLECTION.md](ARTIFACT_COLLECTION.md) — Consolidation checks
