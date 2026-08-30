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

### Example configuration

In `CONTRIBUTING.md`:

```yaml
jl_issue_management:
  plan_destination: github_issue
  file_storage_location: docs/plans/
  decision_gates:
    destination_confirmation: false
    inciting_issue_confirmation: false
    research_afk: false
```

In `AGENTS.md`:

```yaml
jl_issue_management:
  plan_destination: local_file
  file_storage_location: docs/plans/
```

## Configuration via `jl-config`

Resolve repository defaults through `jl-config` before deciding where planning
artifacts should live or which confirmation gates apply.

This skill consumes:

- `jl_issue_management.plan_destination`
- `jl_issue_management.file_storage_location`
- `jl_issue_management.decision_gates.destination_confirmation`
- `jl_issue_management.decision_gates.inciting_issue_confirmation`
- `jl_issue_management.decision_gates.research_afk` when coordinating with skills that may launch
  AFK research from issue-management workflows

Resolution rules:

1. Read `CONTRIBUTING.md` if it exists.
2. Read `AGENTS.md` if it exists.
3. Call `jl-config`'s generic resolution mechanism for the
   `jl_issue_management` key using this skill's defaults and the precedence
   defined by the `jl-config` skill.
4. Validate the resolved `jl_issue_management` object against this skill's
   own schema and enums.
5. Treat the resolved config as the repository default, not as an immutable
   session command.
6. Allow explicit user session overrides to supersede the resolved config for
   the current task only.

Graceful fallback:

- Missing config files are not an error; continue with `jl-config`
  resolution plus jl-issue-management's defaults.
- Do not keep separate hardcoded config defaults in this skill outside the
  documented `jl_issue_management` schema.
- If the resolved destination is `local_file`, use the resolved
  `file_storage_location`; if it cannot be used safely in the current harness,
  ask the user for a session path.
- If the resolved destination is provider-native but the human has not yet
  approved a write, stop at the approval boundary and ask.

### Configuration Warnings

jl-issue-management validates its configuration at startup and emits warnings
(in the format defined by jl-config) for:

#### Type Mismatch — plan_destination

```text
[WARN] jl-issue-management: 'plan_destination' must be a string, not a boolean
  File: CONTRIBUTING.md [line 5]
  Fix: Change the value to a string: plan_destination: github_issue
```

#### Enum Violation — plan_destination

```text
[WARN] jl-issue-management: 'plan_destination' has invalid value "slack"
  (must be one of: github_issue, azure_devops_work_item, local_file,
  inline_message)
  File: AGENTS.md [line 8]
  Fix: Change to one of the allowed destination types
```

#### Missing Required Setting

```text
[WARN] jl-issue-management: required setting 'plan_destination' not found
  in AGENTS.md or CONTRIBUTING.md
  File: (checked both config files)
  Fix: Add to CONTRIBUTING.md under jl_issue_management:
    plan_destination: github_issue
```

#### Invalid File Path — absolute path

```text
[WARN] jl-issue-management: 'file_storage_location' must be
  repository-relative (no leading /)
  File: AGENTS.md [line 10]
  Fix: Change "/docs/plans" to "docs/plans"
```

#### Invalid File Path — parent directory

```text
[WARN] jl-issue-management: 'file_storage_location' must not contain ".."
  (parent directory traversal)
  File: CONTRIBUTING.md [line 9]
  Fix: Use a simple repository-relative path like "docs/plans"
```

#### Type Mismatch — decision gate

```text
[WARN] jl-issue-management: 'decision_gates.destination_confirmation'
  must be a boolean (true/false), not a string
  File: AGENTS.md [line 12]
  Fix: Change the value to a boolean: destination_confirmation: true
```

#### Root Shape Error

```text
[WARN] jl-issue-management: 'jl_issue_management' config block must be
  an object, not a list
  File: AGENTS.md [line 5]
  Fix: Change to YAML object syntax (key: value pairs)
```

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

Unless resolved `jl_issue_management` settings or a session override say otherwise,
use this decision order:

1. Check for session-specific user instructions.
2. Check resolved `jl_issue_management` repository defaults.
3. Check repository contribution or planning guidance that further explains
   the resolved destination.
4. If the destination is still unclear, ask the user.
5. Do not guess when issue hierarchy or provider choice affects team workflow.

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

- `decision_gates.destination_confirmation` requires confirmation before the
  chosen destination is acted on
- `decision_gates.inciting_issue_confirmation` requires confirmation before
  linking or basing work on an inciting issue or parent source of record
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

## Label and Tag Application

Maps and tickets may be labeled or tagged according to repository configuration. jl-issue-management provides
provider-specific scripts and a decision model for consistent label application across GitHub, Azure DevOps, and
markdown:

- **Decision model**: see [Label Inheritance](references/LABEL_INHERITANCE.md)
- **Helper scripts**: see [Label Application Helpers](references/LABEL_APPLICATION_HELPERS.md)

### Overview

**Maps** receive configured labels for the map type.

**Tickets** receive configured labels + inherited map labels + a type classification label (`recon:quiz`,
`recon:research`, etc.).

User overrides replace the computed set entirely (not additive).

All label sets are:

- Automatically deduplicated
- Sorted alphabetically
- Formatted appropriately for the provider (GitHub: comma-separated; Azure DevOps: semicolon-separated)

### Provider Support

| Provider | Support | Mechanics |
| --- | --- | --- |
| **GitHub** | Full | Bash and PowerShell scripts use `gh CLI` |
| **Azure DevOps** | Full | PowerShell scripts use `az boards` |
| **Markdown** | Full | PowerShell scripts write YAML frontmatter |

### Asset Scripts

Ready-to-use label application scripts are included in the `scripts/` subdirectory:

**GitHub (maps and tickets):**

- `scripts/apply-ticket-labels.sh` — Bash/Linux/macOS
- `scripts/apply-ticket-labels.ps1` — PowerShell/Windows

**Azure DevOps (maps and tickets):**

- `scripts/apply-ado-map-tags.ps1` — Map work items
- `scripts/apply-ado-ticket-tags.ps1` — Ticket work items

**Markdown (maps and tickets):**

- `scripts/record-markdown-map-labels.ps1` — Map frontmatter
- `scripts/record-markdown-ticket-labels.ps1` — Ticket frontmatter

All scripts follow the same resolution logic and validation patterns.

## Recommended Agent Behavior

When applying this skill, agents should:

1. identify the likely plan target
2. resolve `jl-config` and determine whether a repository default already
   exists
3. check for a session override
4. confirm whether shared understanding has been reached
5. decide whether the work needs a parent item, child items, or both
6. pause for approval before provider-native writes
7. keep the source of record explicit

When applying labels:

1. Determine the configured label set for the artifact type (map or ticket)
2. For tickets, resolve inherited labels from the parent map
3. Apply user overrides if provided; otherwise, compute the deterministic set
4. Call the appropriate provider-specific script
5. Validate the exit code and report any errors

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

## Ticket Template Validation

When jl-issue-management publishes issues to a native provider (GitHub, Linear, Azure DevOps, etc.),
it validates ticket structure against the jl-ticket-templates schema for the ticket type
(quiz, research, prototype, task, map). This is the final validation gate before tickets
reach the external tracker.

### Validation workflow

1. **Determine ticket type** from frontmatter `type` field
2. **Load the appropriate validator** from jl-ticket-templates (QUIZ_VALIDATION_GUIDE, RESEARCH_VALIDATION_GUIDE, etc.)
3. **Validate the ticket content** against the type-specific contract (frontmatter, required sections, SMC criteria)
4. **Report validation result**:
   - If valid: proceed to provider-native publish
   - If invalid: report errors with remediation guidance; offer user override option
5. **Log the outcome** — success, validation failure, or override acceptance for audit trail

### Validation applies to

- **All ticket types** — quiz, research, prototype, task, map
- **All destinations** — GitHub Issues, Azure DevOps work items, Linear issues, and other provider-native tickets
- **Both creation and update** — when publishing new or modified tickets

### Validation scope

When validating a ticket for provider-native publish:

1. **Frontmatter contract** — required fields per type (title, type, status, author, date from SHARED_BASE_SCHEMA)
2. **Type-specific sections** — Quiz uses Decision/Options/Reasoning; Research uses Investigation Goal/Scope/Findings/Recommendation;
   Task uses Work Scope/Criteria; Map uses Destination/Decisions/Fog/Frontier/Blocked
3. **Acceptance Criteria format** — every type must include 3+ Specific/Measurable/Checkable criteria
4. **Optional override flag** — if user has explicitly approved invalid content for publication, record the approval in provider-native comment or metadata

See jl-ticket-templates skill for type-specific validation details:

- `references/SHARED_BASE_SCHEMA.md` — shared frontmatter contract
- `references/QUIZ_VALIDATION_GUIDE.md` — quiz validation contract and errors
- `references/RESEARCH_VALIDATION_GUIDE.md` — research validation contract and errors
- `references/PROTOTYPE_VALIDATION_GUIDE.md` — prototype validation contract and errors
- `references/TASK_VALIDATION_GUIDE.md` — task validation contract and errors
- `references/MAP_VALIDATION_GUIDE.md` — map validation contract and errors

### User override workflow

If validation fails but the user wants to publish anyway:

1. **Report the error** — show the validation error message with location and remediation guidance
2. **Offer override** — ask "Override validation and publish anyway? [Yes] [No]"
3. **Record the override** — if user approves:
   - Publish the ticket as-is
   - Add a comment in provider-native tracker: "⚠️ Validation override by [user]: [error title]. Reason: [user input]"
   - Log override in session for audit trail
4. **Proceed only after explicit approval** — do not publish invalid content silently

### Integration points

When jl-issue-management publishes a ticket to a provider:

1. Call the appropriate type-specific validator from jl-ticket-templates
2. If validation fails, report the error with remediation guidance
3. If user approves override, record the approval in the provider-native ticket comment
4. Publish the ticket only after validation passes or override is explicitly approved
5. Log the validation outcome (valid, invalid-override-approved) for debugging and audit
