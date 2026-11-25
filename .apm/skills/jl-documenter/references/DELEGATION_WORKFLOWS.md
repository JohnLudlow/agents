---
description: "Delegation pseudocode, decomposition, and review workflows"
---

# Delegation Workflows

Detailed delegation workflows for jl-documenter. The entry point keeps the
pipeline line and compact workflow summaries inline; read this reference for
the full pseudocode and workflow steps.

## Parent control pseudocode

```text
resolve documentation approval config
build outline and section list
for each section:
  classify section type, audience, and complexity
  if section is large or specialist:
    resolve effective approval mode
    choose target agent
    if approval required:
      ask "Delegate {section} documentation to {target_agent}? [Approve] [Decline]"
    if approved:
      create section worktree + branch
      native delegation in the current harness
      collect section draft + metadata
    else:
      apply fallback
  else:
    draft inline
normalize all sections
review consolidated output
if publish gate requires approval:
  ask for publication approval
publish only after all required sections are approved
```

## Decomposition workflow

```text
large documentation request
  -> create outline
  -> break outline into bounded sections
  -> evaluate each section for specialization, size, and audience fit
  -> delegate approved sections
  -> write simple sections inline
  -> consolidate returned drafts into the master document
```

## Review and revision workflow

```text
delegated section draft returned
  -> verify metadata and structure
  -> review for tone, accuracy, completeness, and clarity
  -> if approved, merge into master document
  -> if revision needed, return targeted feedback to the same section owner or rewrite inline
```

## See Also

- [SKILL.md](../SKILL.md#delegation-workflows) — Pipeline and workflow summaries
- [ARTIFACT_COLLECTION.md](ARTIFACT_COLLECTION.md) — Returned artifacts to collect
- [BRANCH_WORKTREE.md](BRANCH_WORKTREE.md) — Workspace setup for delegated sections
