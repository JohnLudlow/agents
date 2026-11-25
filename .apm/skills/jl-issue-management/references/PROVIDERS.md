---
description: "Detailed mappings for the three first-class providers: structure, strengths, typical targets, and parent/child patterns"
---

# Providers

Detailed provider mappings for jl-issue-management. The entry point keeps the
three first-class providers inline (see
[SKILL.md](../SKILL.md#first-class-providers)); read the section for the
provider you plan to use before drafting or structuring its artifact.

## Markdown plan documents

Use markdown plans when the work is exploratory, speculative, or still being
shaped.

Typical target:

- `docs/plans/`

Strengths:

- easy to draft and revise
- suitable before formal issue creation
- good for detailed implementation planning

Expected structure:

- YAML frontmatter
- clear heading hierarchy
- problem, scope, constraints, phases, risks, and acceptance criteria
- links to related provider-native records when they exist

Parent/child pattern:

- parent markdown plan may link to smaller child plans

## GitHub Issues

Use GitHub Issues when the work should be tracked in GitHub as part of the
repository workflow.

Typical target:

- parent issue
- child issues or sub-issues
- linked markdown plan when deeper detail is needed

Strengths:

- native GitHub tracking
- easy cross-linking with pull requests
- useful for visible implementation planning and execution

Expected structure:

- concise summary
- scope
- acceptance criteria
- implementation outline or phases
- links to parent and child issues
- links to markdown plans if used as supporting detail

Parent/child pattern:

- prefer parent issue plus child issues or sub-issues
- avoid hiding substantial planning detail only in long comments unless the
  user explicitly asks for that format

## Azure DevOps work items

Use Azure DevOps when the team tracks work in Azure Boards.

Typical target:

- parent work item
- child work items
- optional linked markdown plan for richer supporting detail

Strengths:

- native Azure Boards workflow
- supports structured work hierarchy
- useful when the team's tracking system is outside GitHub

Expected structure:

- concise summary
- scope
- acceptance criteria
- implementation outline or phases
- explicit parent/child relationships
- links to markdown plans if supporting documents exist

Parent/child pattern:

- prefer native parent/child work item relationships

## See Also

- [SKILL.md](../SKILL.md#first-class-providers) — Provider list and decision order
- [EXAMPLES.md](EXAMPLES.md) — Scenario interpretations by provider
