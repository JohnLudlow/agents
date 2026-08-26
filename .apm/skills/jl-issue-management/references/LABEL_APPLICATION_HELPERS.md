# Label Application Helpers

This document describes the platform-specific label and tag application scripts provided by jl-issue-management. These
scripts implement the deterministic label resolution logic described in the [label inheritance](./LABEL_INHERITANCE.md)
reference.

## Overview

Label application helpers are provided for three scenarios:

1. **GitHub Issues** — Apply labels to maps and tickets
2. **Azure DevOps work items** — Apply tags to maps and tickets
3. **Markdown documents** — Record labels in YAML frontmatter

All helpers follow the same resolution logic:

- **Map application**: resolved configured labels only
- **Ticket application**: configured labels + inherited map labels + `recon:<type>` label
- **User override**: if provided, replaces the entire computed set

## GitHub Label Helpers

### apply-ticket-labels.sh (Bash/Linux/macOS)

Apply GitHub labels to a single ticket issue. Located in `scripts/apply-ticket-labels.sh`.

```bash
./scripts/apply-ticket-labels.sh \
  --repo owner/repo \
  --ticket-number 42 \
  --type task \
  --configured-labels "enhancement,triage" \
  --inherited-labels "map,recon" \
  [--user-override "custom-label"] \
  [--verbose] \
  [--dry-run]
```

**Parameters:**

- `--repo REPO` — GitHub repository (owner/name)
- `--ticket-number N` — Issue number
- `--type TYPE` — Ticket type: `quiz`, `research`, `prototype`, `task`
- `--configured-labels LABELS` — Comma-separated configured labels for this type
- `--inherited-labels LABELS` — Comma-separated labels inherited from map
- `--user-override LABELS` — Optional override; if provided, replaces entire set
- `--verbose` — Print diagnostic output
- `--dry-run` — Show labels without applying

**Requirements:**

- GitHub CLI (`gh`) installed and authenticated
- Issue write access

**Exit codes:**

- `0` — Success
- `1` — Validation error, missing CLI, or GitHub API error

### apply-ticket-labels.ps1 (PowerShell/Windows)

Windows equivalent of the Bash script, with identical parameter names and behavior. Located in `scripts/apply-ticket-labels.ps1`.

```powershell
.\scripts\apply-ticket-labels.ps1 `
  -Repo owner/repo `
  -TicketNumber 42 `
  -Type task `
  -ConfiguredLabels "enhancement,triage" `
  -InheritedLabels "map,recon" `
  [-UserOverride "custom-label"] `
  [-VerboseOutput] `
  [-DryRun]
```

**Parameters:** Same as Bash version, using PowerShell naming conventions (PascalCase, `-` prefix).

## Azure DevOps Tag Helpers

Azure DevOps uses semicolon-delimited tags (no spaces). All tag values are automatically joined with `;` before being
written to `System.Tags`.

### apply-ado-map-tags.ps1

Apply tags to an Azure DevOps map work item. Maps receive configured tags only (no ticket-type classification). Located
in `scripts/apply-ado-map-tags.ps1`.

```powershell
.\scripts\apply-ado-map-tags.ps1 `
  -Organization https://dev.azure.com/contoso `
  -Project Agents `
  -WorkItemId 123 `
  -ConfiguredTags "map,recon" `
  [-UserOverride "custom-tag"] `
  [-VerboseOutput] `
  [-DryRun]
```

**Parameters:**

- `-Organization URL` — Azure DevOps organization URL
- `-Project NAME` — Azure DevOps project name
- `-WorkItemId ID` — Work item ID to update
- `-ConfiguredTags TAGS` — Comma-separated configured tags
- `-UserOverride TAGS` — Optional override; if provided, replaces entire set
- `-VerboseOutput` — Print diagnostic output
- `-DryRun` — Show tags without applying

**Requirements:**

- Azure CLI (`az`) installed and authenticated
- Azure DevOps extension: `az boards` available
- Work item write access

**Exit codes:**

- `0` — Success
- `1` — Validation error, missing CLI, or Azure API error

### apply-ado-ticket-tags.ps1

Apply tags to an Azure DevOps ticket work item. Tickets receive configured tags + inherited map tags + `recon:<type>`
tag. Located in `scripts/apply-ado-ticket-tags.ps1`.

```powershell
.\scripts\apply-ado-ticket-tags.ps1 `
  -Organization https://dev.azure.com/contoso `
  -Project Agents `
  -WorkItemId 456 `
  -Type task `
  -ConfiguredTags "task,triage" `
  -InheritedTags "map,recon" `
  [-UserOverride "custom-tag"] `
  [-VerboseOutput] `
  [-DryRun]
```

**Parameters:** Same as map script, plus:

- `-Type TYPE` — Ticket type: `quiz`, `research`, `prototype`, `task`
- `-InheritedTags TAGS` — Comma-separated tags inherited from map

## Markdown Label Helpers

### record-markdown-ticket-labels.ps1

Write labels to a markdown ticket file's YAML frontmatter. Used when markdown is the plan target. Located in `scripts/record-markdown-ticket-labels.ps1`.

```powershell
.\scripts\record-markdown-ticket-labels.ps1 `
  -FilePath "docs/plans/tickets/ticket-1.md" `
  -Labels "task,triage" `
  -Type task `
  -Parent "docs/plans/map.md" `
  -BodyNote "Additional context" `
  [-UserOverride "custom-label"] `
  [-Title "Ticket Title"] `
  [-VerboseOutput] `
  [-DryRun] `
  [-Backup]
```

**Parameters:**

- `-FilePath PATH` — Path to markdown file (required; created if missing)
- `-Labels LABELS` — Comma-separated configured labels
- `-Type TYPE` — Ticket type: `quiz`, `research`, `prototype`, `task` (required)
- `-Parent PATH` — Path to parent map file (stored in frontmatter)
- `-BodyNote TEXT` — Note to insert in body under "**Labels:**" heading
- `-UserOverride LABELS` — Optional override; if provided, replaces entire set
- `-Title TITLE` — Title to set in frontmatter (if not already present)
- `-VerboseOutput` — Print diagnostic output
- `-DryRun` — Show document without writing
- `-Backup` — Create `.bak` backup before writing

**Frontmatter output:**

```yaml
---
title: "Ticket Title"
labels:
  - task
  - triage
type: task
parent: "docs/plans/map.md"
---
```

**Exit codes:**

- `0` — Success
- `1` — File I/O error or frontmatter parsing error

### record-markdown-map-labels.ps1

Write labels to a markdown map file's YAML frontmatter. Maps receive configured labels only. Located in `scripts/record-markdown-map-labels.ps1`.

```powershell
.\scripts\record-markdown-map-labels.ps1 `
  -FilePath "docs/plans/map.md" `
  -Labels "map,recon" `
  [-UserOverride "custom-label"] `
  [-Title "Map Title"] `
  [-Description "Map description"] `
  [-VerboseOutput] `
  [-DryRun] `
  [-Backup]
```

**Parameters:** Same as ticket script, minus `-Type` and `-Parent` (maps have no type classification or parent).

**Frontmatter output:**

```yaml
---
title: "Map Title"
description: "Map description"
labels:
  - map
  - recon
---
```

## Label Resolution Logic

All helpers implement this logic:

**If user override is provided:**

```text
final_labels = sort_unique(split(user_override))
```

**Otherwise (map):**

```text
final_labels = sort_unique(configured_labels)
```

**Otherwise (ticket):**

```text
final_labels = sort_unique(
  configured_labels
  + inherited_labels
  + ["recon:<type>"]
)
```

The result is:

- sorted alphabetically
- deduplicated
- formatted appropriately for the provider (comma-separated for GitHub, semicolon-separated for Azure DevOps)

## Error Handling

All helpers validate:

- Required parameters are present
- CLI tools are available and have required extensions
- Work items / issues exist
- File paths are valid

Validation failures return exit code `1` with error messages on stderr.

## Integration with Agents

When creating maps and tickets, agents should:

1. Resolve labels using the decision logic in [label inheritance](./LABEL_INHERITANCE.md)
2. Call the appropriate provider-specific script from the `scripts/` directory for the provider (GitHub, Azure DevOps, markdown)
3. Pass configured labels, inherited labels (for tickets), and ticket type
4. Allow user override to replace the computed set
5. Check the exit code and handle failures gracefully

All scripts are located in the `scripts/` subdirectory of jl-issue-management and are included when the skill is shipped.

## See Also

- [Label Inheritance](./LABEL_INHERITANCE.md) — Provider-neutral label resolution decision model
- jl-recon SKILL.md — Recon-specific label application workflows
- jl-issue-management SKILL.md — General issue management guidance
