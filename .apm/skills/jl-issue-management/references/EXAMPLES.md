---
description: "Illustrative vocabulary examples for plan target, source of record, parent/child items, session override, and shared understanding"
---

# Examples

Vocabulary examples moved out of SKILL.md. Usage scenarios live in this file
too; read it for planning scenarios or unclear artifact relationships.

## Plan target examples

- `docs/plans/feature-x.md`
- a GitHub issue
- an Azure DevOps work item

## Source of record examples

- a markdown plan that is still being shaped before issue creation
- a GitHub parent issue with child issues
- an Azure DevOps parent work item with linked child work items

## Parent item examples

- a parent markdown plan linking to smaller child plans
- a GitHub parent issue
- an Azure DevOps parent work item

## Child item examples

- a child markdown plan for one workstream
- a GitHub child issue or sub-issue
- an Azure DevOps child work item

## Session override examples

- "Keep this in markdown for now."
- "Use Azure DevOps instead of GitHub."
- "Do not create any provider-native items yet."

## Usage scenarios

### Example: markdown-first planning

User says:

> This is still speculative. Keep it local for now.

Effective interpretation:

- plan target: markdown plan
- source of record: `docs/plans/...`
- provider-native writes: not allowed without later confirmation

### Example: GitHub-tracked planning

User says:

> Break this into a parent issue with child issues in GitHub.

Effective interpretation:

- plan target: GitHub Issues
- source of record: GitHub parent issue
- child items: GitHub child issues
- approval required before issue creation or edits

### Example: Azure Boards tracking

User says:

> We track this in Azure DevOps. Draft the work-item structure first.

Effective interpretation:

- plan target: Azure DevOps work items
- source of record: Azure DevOps parent work item
- child items: Azure DevOps child work items
- approval required before work-item creation or updates

## See Also

- [SKILL.md](../SKILL.md) — Decision model and vocabulary
- [PROVIDERS.md](PROVIDERS.md) — Detailed provider mappings
