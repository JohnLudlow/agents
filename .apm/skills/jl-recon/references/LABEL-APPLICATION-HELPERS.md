# Label Application Helper Scripts

This document describes the concrete implementation scripts that handle label and tag application for maps and tickets
across different providers (GitHub, Azure DevOps, and Markdown).

The scripts implement the label resolution and application logic documented in [PROVIDERS.md](./PROVIDERS.md) → "Label
Formatting" section.

## Overview

Label application follows this deterministic formula:

```text
Ticket Labels = Configured Type Labels + Inherited Map Labels + recon:<type>
```

User-provided label overrides replace the entire computed set (not additive).

These scripts encapsulate that logic and provider-specific APIs so agents don't need to reimplement label handling when
creating maps and tickets.

## Script Location

All scripts are located in `.apm/skills/jl-recon/scripts/`. They are shipped with the skill and discoverable by agents
in downstream repositories.

## Script Inventory

### GitHub: `apply-ticket-labels.ps1`

**Purpose**: Apply deterministic labels to a GitHub issue.

**Platform**: PowerShell (Windows, macOS, Linux with PowerShell Core)

**Requires**: `gh` CLI installed and authenticated

**Parameters**:

- `--repo` (required): GitHub repository in `owner/name` format
- `--ticket-number` (required): Issue number to update
- `--type` (required): Ticket type (`quiz`, `research`, `prototype`, `task`)
- `--configured-labels` (optional): Comma-separated configured labels for the ticket type
- `--inherited-labels` (optional): Comma-separated labels inherited from the map
- `--user-override` (optional): Comma-separated labels to use instead of computed set
- `--verbose`: Print diagnostic output
- `--dry-run`: Show what would be applied without changing the issue

**Example**:

```powershell
.\apply-ticket-labels.ps1 `
  -Repo "JohnLudlow/agents" `
  -TicketNumber 42 `
  -Type "research" `
  -ConfiguredLabels "type:research,recon-output" `
  -InheritedLabels "recon:map,planning" `
  -Verbose
```

**Output**: On success, prints applied labels. On failure, exits with code 1.

**Determinism**: Labels are sorted alphabetically before application to ensure consistent results.

---

### GitHub: `apply-ticket-labels.sh`

**Purpose**: Apply deterministic labels to a GitHub issue (POSIX shell equivalent).

**Platform**: Bash/sh (macOS, Linux)

**Requires**: `gh` CLI installed and authenticated

**Parameters**: Same as PowerShell version (uses long-option format: `--repo`, `--ticket-number`, etc.)

**Behavior**: Functionally identical to the PowerShell version but written for POSIX shells.

---

### Azure DevOps: `apply-ado-map-tags.ps1`

**Purpose**: Apply deterministic tags to an Azure DevOps map work item.

**Platform**: PowerShell

**Requires**: `az` CLI with Azure DevOps extension (`az boards`)

**Parameters**:

- `--organization` (required): Azure DevOps organization URL (e.g., `https://dev.azure.com/contoso`)
- `--project` (required): Azure DevOps project name
- `--work-item-id` (required): Work item ID (map) to update
- `--configured-tags` (optional): Comma-separated configured tags
- `--user-override` (optional): Comma-separated tags to use instead of computed set
- `--verbose`: Print diagnostic output
- `--dry-run`: Show what would be applied without changing the work item

**Example**:

```powershell
.\apply-ado-map-tags.ps1 `
  -Organization "https://dev.azure.com/contoso" `
  -Project "Agents" `
  -WorkItemId 123 `
  -ConfiguredTags "recon:map,planning" `
  -Verbose
```

**Output**: On success, prints applied tags. On failure, exits with code 1.

**Azure DevOps Tag Format**: Tags are semicolon-separated when stored (`tag1;tag2;tag3`), matching Azure DevOps's native
format.

**Determinism**: Tags are sorted alphabetically before application.

---

### Azure DevOps: `apply-ado-ticket-tags.ps1`

**Purpose**: Apply deterministic tags to an Azure DevOps ticket (child of a map).

**Platform**: PowerShell

**Requires**: `az` CLI with Azure DevOps extension

**Parameters**:

- `--organization` (required): Azure DevOps organization URL
- `--project` (required): Azure DevOps project name
- `--work-item-id` (required): Ticket work item ID to update
- `--type` (required): Ticket type (`quiz`, `research`, `prototype`, `task`)
- `--configured-tags` (optional): Comma-separated configured tags for the ticket type
- `--inherited-tags` (optional): Comma-separated tags inherited from the map
- `--user-override` (optional): Comma-separated tags to use instead of computed set
- `--verbose`: Print diagnostic output
- `--dry-run`: Show what would be applied without changing the work item

**Example**:

```powershell
.\apply-ado-ticket-tags.ps1 `
  -Organization "https://dev.azure.com/contoso" `
  -Project "Agents" `
  -WorkItemId 456 `
  -Type "research" `
  -ConfiguredTags "type:research,recon-output" `
  -InheritedTags "recon:map,planning" `
  -Verbose
```

**Determinism**: Tags are sorted alphabetically. The formula is identical to GitHub: `Configured + Inherited + recon:<type>`.

---

### Markdown: `record-markdown-map-labels.ps1`

**Purpose**: Record deterministic labels in YAML frontmatter of a markdown map document.

**Platform**: PowerShell

**Requires**: None (uses only built-in PowerShell)

**Parameters**:

- `--file-path` (required): Path to the markdown map file
- `--labels` (optional): Comma-separated configured map labels
- `--user-override` (optional): Comma-separated labels to use instead of configured set
- `--title` (optional): Markdown document title (set in frontmatter if not present)
- `--description` (optional): Markdown document description (set in frontmatter if not present)
- `--verbose`: Print diagnostic output
- `--dry-run`: Print the resulting document without writing it
- `--backup`: Create a `.bak` backup before writing (if file exists)

**Example**:

```powershell
.\record-markdown-map-labels.ps1 `
  -FilePath "docs/plans/authentication-map.md" `
  -Labels "recon:map,planning" `
  -Title "Authentication System Recon Map" `
  -Description "Decision map for authentication system redesign" `
  -Backup `
  -Verbose
```

**YAML Frontmatter Format**:

```yaml
---
title: "Authentication System Recon Map"
description: "Decision map for authentication system redesign"
labels:
  - "planning"
  - "recon:map"
---
```

Labels are always stored as an array in frontmatter, sorted alphabetically. If a file already exists, the script parses
its frontmatter, preserves other fields, and updates only the `labels:` field.

**Output**: On success, prints where labels were recorded. On failure, exits with code 1.

---

### Markdown: `record-markdown-ticket-labels.ps1`

**Purpose**: Record deterministic labels in YAML frontmatter of a markdown ticket document.

**Platform**: PowerShell

**Requires**: None (uses only built-in PowerShell)

**Parameters**:

- `--file-path` (required): Path to the markdown ticket file
- `--type` (required): Ticket type (`quiz`, `research`, `prototype`, `task`)
- `--configured-labels` (optional): Comma-separated configured labels for the ticket type
- `--inherited-labels` (optional): Comma-separated labels inherited from the map
- `--user-override` (optional): Comma-separated labels to use instead of computed set
- `--title` (optional): Markdown document title (set in frontmatter if not present)
- `--description` (optional): Markdown document description (set in frontmatter if not present)
- `--verbose`: Print diagnostic output
- `--dry-run`: Print the resulting document without writing it
- `--backup`: Create a `.bak` backup before writing (if file exists)

**Example**:

```powershell
.\record-markdown-ticket-labels.ps1 `
  -FilePath "docs/plans/verify-oauth2-refresh-token.md" `
  -Type "research" `
  -ConfiguredLabels "type:research,recon-output" `
  -InheritedLabels "recon:map,planning" `
  -Title "Research: OAuth2 Refresh Token Rotation" `
  -Backup `
  -Verbose
```

**YAML Frontmatter Format**:

```yaml
---
title: "Research: OAuth2 Refresh Token Rotation"
labels:
  - "planning"
  - "recon:map"
  - "recon:research"
  - "recon-output"
  - "type:research"
type: "research"
---
```

Tickets receive the full additive label set: configured + inherited + `recon:<type>`, sorted alphabetically. The `type:`
field in frontmatter is also set to the ticket type for machine readability.

---

## Integration Points

### When Agents Create Maps

1. Resolve label configuration from `jl-config` per [PROVIDERS.md](./PROVIDERS.md) → "Label Application on Map Creation"
2. Determine the provider (GitHub, Azure DevOps, or Markdown)
3. Invoke the appropriate script:
   - **GitHub**: `apply-ticket-labels.ps1` or `apply-ticket-labels.sh` (if creating a standalone issue as the map)
   - **Azure DevOps**: `apply-ado-map-tags.ps1`
   - **Markdown**: `record-markdown-map-labels.ps1`

### When Agents Create Tickets

1. Resolve labels using the additive formula: `Configured Type + Inherited Map + recon:<type>`
2. Per [PROVIDERS.md](./PROVIDERS.md) → "Label Application on Ticket Creation"
3. Invoke the appropriate script:
   - **GitHub**: `apply-ticket-labels.ps1` or `apply-ticket-labels.sh`
   - **Azure DevOps**: `apply-ado-ticket-tags.ps1`
   - **Markdown**: `record-markdown-ticket-labels.ps1`

### Script Discovery

Scripts are located in `.apm/skills/jl-recon/scripts/`. Agents should resolve this path using standard APM skill script
lookup mechanisms.

---

## Determinism and Consistency

All scripts:

- **Sort labels/tags alphabetically** before application or output
- **De-duplicate** — if a label appears in multiple input sets, apply it once
- **Validate input** — verify that configured labels exist (GitHub), that CLI tools are available,
  or that file paths are writable
- **Support dry-run** (`--dry-run` flag) to preview results without changing anything
- **Exit with code 0 on success, 1 on failure** — allowing scripts to be chained or conditionally invoked

---

## Provider-Specific Notes

### GitHub

- `gh` CLI automatically creates labels if needed during `gh issue edit` operations
- Labels are comma-separated in parameters, space-separated in `--add-label` flag
- Existing issue labels are preserved; the scripts add new labels without removing old ones
- Use `--dry-run` to preview before applying

### Azure DevOps

- Tags are free-form strings with no pre-creation required
- Tags are semicolon-separated in the `System.Tags` field
- To reset tags entirely (not additive), users must pass `--user-override` to replace the entire set
- `az boards` may require project scope if work item IDs overlap across projects

### Markdown

- Scripts create parent directories if they don't exist
- Frontmatter is validated as valid YAML
- Existing frontmatter fields are preserved; only `labels:` is updated
- `--backup` flag recommended when updating existing files
- No label pre-creation needed; labels are just strings in the frontmatter array

---

## Error Handling

Each script includes built-in validation:

- **GitHub**: Checks `gh` availability, verifies the repository format, confirms the issue exists
- **Azure DevOps**: Checks `az` availability, verifies the Azure DevOps extension, confirms the work item exists
  and is accessible
- **Markdown**: Validates file paths, creates directories as needed, validates YAML structure

Error messages are printed to `stderr`. Use the `--verbose` flag to troubleshoot failures.

---

## References

- [PROVIDERS.md](./PROVIDERS.md) → "Label Formatting" section (label resolution logic)
- [SKILL.md](../SKILL.md) → "Configuration" section (label configuration schema)
