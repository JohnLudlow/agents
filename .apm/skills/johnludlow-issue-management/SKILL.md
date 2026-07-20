---
name: johnludlow-issue-management
description: "Provider-agnostic issue-management guidance for markdown plans, GitHub Issues, and Azure DevOps work items"
---

# Issue Management

## Overview

This skill gives agents a provider-agnostic vocabulary and decision model for
planning work that may live in markdown documents, GitHub Issues, or Azure
DevOps work items.

Use this skill when an agent needs to decide:

- where a plan should live
- how parent and child work items should be structured
- when a user instruction overrides repository defaults
- how to maintain shared understanding during planning
- when provider-native create or update actions require human approval

This skill is cross-provider and cross-harness. It should work for agents used
in Copilot CLI, OpenCode, or other compatible environments.

## Core Principles

### Human-in-the-loop

All planning and issue-management work is collaborative.

Agents must:

- keep the human user in control
- ask clarifying questions when destination, hierarchy, or level of detail is
  unclear
- avoid silent provider-native writes
- confirm the effective instruction when session overrides are present

### Provider-agnostic first

Start with provider-neutral reasoning before applying provider-specific details.

The core questions are:

- What is the **plan target**?
- What is the **source of record**?
- Is there a **parent item**?
- Are there **child items**?
- Is there a **session override**?
- Has **shared understanding** been reached?

### One source of record

It is acceptable to use both markdown plans and provider-native records, but one
must be the clear source of record.

If the relationship between artifacts is not explicit, the agent should stop and
ask the user to clarify.

## Provider-Neutral Vocabulary

### Plan target

The destination where the current planning artifact should live.

Examples:

- `docs/plans/feature-x.md`
- a GitHub issue
- an Azure DevOps work item

### Source of record

The artifact the team treats as authoritative.

Examples:

- a markdown plan that is still being shaped before issue creation
- a GitHub parent issue with child issues
- an Azure DevOps parent work item with linked child work items

### Parent item

The higher-level artifact that defines the overall objective or umbrella scope.

Examples:

- a parent markdown plan linking to smaller child plans
- a GitHub parent issue
- an Azure DevOps parent work item

### Child item

A smaller artifact derived from the parent item and scoped so it can be worked,
reviewed, and tracked independently.

Examples:

- a child markdown plan for one workstream
- a GitHub child issue or sub-issue
- an Azure DevOps child work item

### Session override

A user instruction that changes repository defaults for the current session
only.

Examples:

- “Keep this in markdown for now.”
- “Use Azure DevOps instead of GitHub.”
- “Do not create any provider-native items yet.”

### Shared understanding

A confirmed mutual understanding between the human and the agent about:

- the problem being solved
- the destination for the plan
- the level of detail expected
- the relationship between parent and child items
- whether provider-native creation or updates should happen now

If the agent detects uncertainty or contradiction, shared understanding has not
yet been reached.

## First-Class Provider Mappings

### Markdown plan documents

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

### GitHub Issues

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

### Azure DevOps work items

Use Azure DevOps when the team tracks work in Azure Boards.

Typical target:

- parent work item
- child work items
- optional linked markdown plan for richer supporting detail

Strengths:

- native Azure Boards workflow
- supports structured work hierarchy
- useful when the team’s tracking system is outside GitHub

Expected structure:

- concise summary
- scope
- acceptance criteria
- implementation outline or phases
- explicit parent/child relationships
- links to markdown plans if supporting documents exist

Parent/child pattern:

- prefer native parent/child work item relationships

## Choosing a Provider

Unless repository guidance or a session override says otherwise, use this
decision order:

1. Check for session-specific user instructions.
2. Check repository contribution or planning guidance.
3. If the destination is still unclear, ask the user.
4. Do not guess when issue hierarchy or provider choice affects team workflow.

Heuristics:

- choose markdown when the work is still being discovered or refined
- choose GitHub Issues when the repo is the visible tracking system
- choose Azure DevOps when the team uses Azure Boards as the work system
- use both only when the source of record is explicit

## Fallback Behavior When Provider-Specific Skills Are Unavailable

If provider-specific community skills are not available, agents should still be
able to reason correctly using this skill.

Fallback rules:

- continue using provider-neutral concepts
- ask the user for missing provider details rather than inventing them
- prefer read-only inspection before any write action
- if the agent cannot safely perform the provider-native action, stop and ask
  the user for the next step

Examples:

- If GitHub issue-creation guidance is unavailable, the agent can still draft
  issue-ready content in markdown.
- If Azure DevOps helper skills are unavailable, the agent can still prepare
  work-item-ready content and ask the user before any write attempt.

## Mandatory Human Approval Points

Human approval is required before:

- creating a new GitHub issue
- editing an existing GitHub issue
- creating a new Azure DevOps work item
- updating an existing Azure DevOps work item
- changing the intended source of record
- splitting a parent plan into multiple child items when the hierarchy is not
  already agreed

Agents should also pause for confirmation when:

- repository defaults and session instructions conflict
- the provider is ambiguous
- the requested level of detail is unclear
- a provider-native hierarchy would materially change how the work is managed

## Referencing Provider-Specific Community Skills

When available, agents may use provider-specific community skills for execution
details while keeping this skill as the decision model.

Examples of relevant provider-specific skills include:

- `github-issues`
- `azure-devops-cli`

These skills should be treated as optional helpers, not as required dependencies
for basic planning or issue-management reasoning.

## Recommended Agent Behavior

When applying this skill, agents should:

1. identify the likely plan target
2. determine whether a repository default already exists
3. check for a session override
4. confirm whether shared understanding has been reached
5. decide whether the work needs a parent item, child items, or both
6. pause for approval before provider-native writes
7. keep the source of record explicit

## Examples

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
