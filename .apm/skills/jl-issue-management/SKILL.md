---
name: jl-issue-management
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
- how to validate ticket structure before publishing to external trackers

This skill is cross-provider and cross-harness. It should work for agents used
in Copilot CLI, OpenCode, or other compatible environments.

## Load contract

Routine consumers read SKILL.md for the core rules. Load [references/PROVIDERS.md](references/PROVIDERS.md)
when mapping or structuring a provider artifact, [references/EXAMPLES.md](references/EXAMPLES.md) for
scenario interpretations, [references/CONFIGURATION_EXAMPLES.md](references/CONFIGURATION_EXAMPLES.md) for
config examples, [references/WARNING_EXAMPLES.md](references/WARNING_EXAMPLES.md) for warning
illustrations, and [references/TICKET_VALIDATION.md](references/TICKET_VALIDATION.md) for the publish gate.

## Configuration

jl-issue-management reads settings from `jl_issue_management`
configuration in `CONTRIBUTING.md` and `AGENTS.md`. It uses `jl-config`
only for the generic resolution mechanism; jl-issue-management owns this
schema, its defaults, and its validation.

### Schema

| Setting | Type | Allowed values | Default | Sensitivity |
| --- | --- | --- | --- | --- |
| `plan_destination` | string | `github_issue`, `azure_devops_work_item`, `local_file`, `inline_message` | none | required |
| `file_storage_location` | string | repository-relative path | `docs/plans/` | recommended |
| `decision_gates.destination_confirmation` | boolean | `true`, `false` | `false` | optional |
| `decision_gates.inciting_issue_confirmation` | boolean | `true`, `false` | `false` | optional |
| `decision_gates.research_afk` | boolean | `true`, `false` | `false` | optional |

### Validation and defaults

- validate that `jl_issue_management`, if present, is an object
- validate `plan_destination` against the documented destination enum
- validate `file_storage_location` as a repository-relative string when present
- validate `decision_gates`, if present, as an object of booleans
- default `file_storage_location` to `docs/plans/`
- default each missing decision gate to `false`
- prompt the user only if required `plan_destination` is still unresolved or
  unusable for the current session

Worked examples: [references/CONFIGURATION_EXAMPLES.md](references/CONFIGURATION_EXAMPLES.md).

## Configuration via `jl-config`

Resolve repository defaults through `jl-config` before deciding where planning
artifacts should live or which confirmation gates apply. This skill consumes
`jl_issue_management.plan_destination`, `file_storage_location` and the
`decision_gates` settings, and validates the resolved object against its own
schema and enums.

Resolution rules: read `CONTRIBUTING.md` and `AGENTS.md` if they exist, call
`jl-config`'s generic resolution for the `jl_issue_management` key, validate
against this skill's schema, treat the result as the repository default rather
than an immutable session command, and let explicit user session overrides
supersede it for the current task only.

Graceful fallback:

- Missing config files are not an error; continue with defaults.
- Keep all defaults in this skill's documented `jl_issue_management` schema.
- If the resolved destination is `local_file` and cannot be used safely in the
  current harness, ask the user for a session path.
- If the resolved destination is provider-native and not yet approved, stop at
  the approval boundary and ask.

### Configuration Warnings

jl-issue-management validates its configuration at startup and emits warnings
(in the format defined by jl-config) for:

- type/shape problems: `plan_destination` not a string, `jl_issue_management`
  not an object, decision gates not boolean
- enum violations: `plan_destination` outside `github_issue`,
  `azure_devops_work_item`, `local_file`, `inline_message`; `file_storage_location`
  absolute or containing `..`
- unresolved required setting: `plan_destination` not found in either file

Illustrative examples: [references/WARNING_EXAMPLES.md](references/WARNING_EXAMPLES.md).

## Core Principles

### Human-in-the-loop

All planning and issue-management work is collaborative. Agents must:

- keep the human user in control
- ask clarifying questions when destination, hierarchy, or level of detail is unclear
- avoid silent provider-native writes
- confirm the effective instruction when session overrides are present

### Provider-agnostic first

Start with provider-neutral reasoning before applying provider-specific details.
The core questions are: what is the plan target, source of record, parent item,
child item, session override, and has shared understanding been reached?

### One source of record

It is acceptable to use both markdown plans and provider-native records, but one
must be the clear source of record. If the relationship between artifacts is not
explicit, the agent should stop and ask the user to clarify.

## Provider-Neutral Vocabulary

Definitions (examples: [references/EXAMPLES.md](references/EXAMPLES.md)).

### Plan target

Where the current planning artifact should live (e.g. `docs/plans/feature-x.md`, a GitHub issue, or an Azure DevOps work item).

### Source of record

The artifact the team treats as authoritative.

### Parent item

The higher-level artifact that defines the overall objective or umbrella scope.

### Child item

A smaller artifact derived from the parent item and scoped for independent work.

### Session override

A user instruction that changes repository defaults for the current session only.

### Shared understanding

A confirmed mutual understanding about the problem being solved, the plan target
and source of record, the level of detail expected, whether parent/child items
are needed, and whether provider-native creation or updates should happen now.
Stop and ask when any of these is ambiguous or contradicted.

## First-Class Providers

The three first-class providers are Markdown plan documents (default for
exploratory or speculative work), GitHub Issues (the repository workflow's
visible tracker), and Azure DevOps work items (the team's tracking system
outside GitHub). Read [references/PROVIDERS.md](references/PROVIDERS.md) for the
selected provider before drafting or structuring its artifact.

## Choosing a Provider

Unless resolved `jl_issue_management` settings or a session override say
otherwise, use this decision order:

1. Check for session-specific user instructions.
2. Check resolved `jl_issue_management` repository defaults.
3. Check repository planning guidance that explains the resolved destination.
4. If still unclear, ask the user.

Heuristics: choose markdown for discovery or refinement, GitHub Issues when the
repo is the visible tracking system, Azure DevOps when the team uses Azure
Boards. Use both only when the source of record is explicit.

## Mandatory Human Approval Points

Human approval is required before: creating or editing GitHub issues;
creating or updating Azure DevOps work items; changing the intended source of
record; and splitting a parent plan into multiple child items when the
hierarchy is not already agreed. Agents should also pause when
`decision_gates.destination_confirmation` or
`decision_gates.inciting_issue_confirmation` are set, when defaults and
session instructions conflict, when the provider is ambiguous, when the
requested detail is unclear, or when a provider-native hierarchy would
materially change how the work is managed.

## Referencing Provider-Specific Community Skills

When available, agents may use provider-specific community skills for execution
details while keeping this skill as the decision model. Examples include
`github-issues` and `azure-devops-cli`. These are optional helpers, not
required dependencies for basic planning or issue-management reasoning.

## Label and Tag Application

Maps and tickets may be labeled or tagged per repository configuration: see
[Label Inheritance](references/LABEL_INHERITANCE.md) (decision model) and
[Label Application Helpers](references/LABEL_APPLICATION_HELPERS.md) (scripts).

- Maps receive configured labels for the map type; tickets receive configured
  labels + inherited map labels + a type label (e.g. `recon:quiz`).
- User overrides replace the computed set entirely; sets are deduplicated,
  sorted alphabetically, and formatted per provider.

Provider support: GitHub (Bash and PowerShell scripts using `gh`), Azure DevOps
(PowerShell scripts using `az boards`), Markdown (PowerShell scripts writing
YAML frontmatter).

### Asset Scripts

Scripts live in the `scripts/` subdirectory: `apply-ticket-labels.sh`,
`apply-ticket-labels.ps1`, `apply-ado-map-tags.ps1`, `apply-ado-ticket-tags.ps1`,
`record-markdown-map-labels.ps1`, `record-markdown-ticket-labels.ps1`. All follow
the same resolution and validation logic.

## Recommended Agent Behavior

When applying this skill, agents should:

1. identify the likely plan target
2. resolve `jl-config` and determine whether a repository default exists
3. check for a session override
4. confirm whether shared understanding has been reached
5. decide whether the work needs a parent item, child items, or both
6. pause for approval before provider-native writes
7. keep the source of record explicit

When applying labels:

1. Determine the configured label set for the artifact type (map or ticket)
2. For tickets, resolve inherited labels from the parent map
3. Apply user overrides if provided; otherwise compute the deterministic set
4. Call the appropriate provider-specific script
5. Validate the exit code and report any errors

## Ticket Template Validation

When jl-issue-management publishes issues to a native provider (GitHub, Linear,
Azure DevOps, etc.), it validates ticket structure against the jl-ticket-templates
schema for the ticket type (quiz, research, prototype, task, map). This is the
final validation gate before tickets reach the external tracker. The publish
gate applies to creation AND update; errors are reported with remediation
guidance, overrides require explicit user approval, and outcomes are logged for
audit. Read [references/TICKET_VALIDATION.md](references/TICKET_VALIDATION.md)
for the full workflow.
