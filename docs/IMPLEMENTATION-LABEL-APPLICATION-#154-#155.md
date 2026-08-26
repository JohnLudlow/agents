# Issues #154 and #155: Label Application Implementation

**Date**: 2026-08-26  
**Status**: ✅ Implemented  
**Related Issues**: #154, #155

## Overview

This document records the implementation of label and tag application logic for the jl-recon skill, addressing issues

## 154 and #155. These issues required moving label application scripts from `/scripts/` to the proper location in

`.apm/skills/` per AGENTS.md document placement rules, and documenting how agents should invoke them.

## Problem Statement

The jl-recon skill's PROVIDERS.md document describes in detail how labels and tags should be applied to maps and tickets
across GitHub, Azure DevOps, and Markdown providers. However, no concrete implementation scripts existed, and when
scripts were added to `/scripts/`, they violated the document placement rule:
**if a skill or agent reads/references a file during execution, that file must be shipped in `.apm/`**.

Files in `/scripts/` are repo-local CI only and don't get shipped with the NPM package. Agents working in downstream
repositories cannot discover or execute scripts located there.

## Requirements

### Issue #154: Label Application Scripts

Provide concrete implementation scripts that agents can invoke to apply deterministic labels/tags when creating maps and
tickets, following the label resolution logic documented in PROVIDERS.md.

### Issue #155: Script Integration and Discovery

Ensure scripts are discoverable by agents, properly documented, and referenced from the skill's documentation so agents
know they exist and how to use them.

## Implementation

### 1. Script Inventory and Triage

**Analyzed all scripts in `/scripts/` to determine which are skill-related vs. repo-local CI:**

- **Label application scripts (moved to `.apm/skills/jl-recon/assets/`)**: These implement the label/tag application
  logic and are used by the jl-recon skill:

  - `apply-ticket-labels.ps1` — GitHub issue label application (PowerShell)
  - `apply-ticket-labels.sh` — GitHub issue label application (Bash/POSIX)
  - `apply-ado-map-tags.ps1` — Azure DevOps map tag application
  - `apply-ado-ticket-tags.ps1` — Azure DevOps ticket tag application
  - `record-markdown-map-labels.ps1` — Markdown map label recording
  - `record-markdown-ticket-labels.ps1` — Markdown ticket label recording

- **Repo-local CI scripts (remain in `/scripts/`)**: These are used only by the JohnLudlow/agents repository and not shipped:
  - `validate-apm-package.js` — APM package validation
  - `validate-config.js` — Configuration validation
  - `lint-document-placement.js` — Document placement linting
  - `generate-release-notes.js` — Release notes generation
  - `platform-utils.js` — Utility functions for platform-specific operations

### 2. Created LABEL-APPLICATION-HELPERS.md

**Location**: `.apm/skills/jl-recon/references/LABEL-APPLICATION-HELPERS.md`

A comprehensive reference document covering:

- **Overview**: Explanation of the deterministic label formula
- **Script Inventory**: Detailed documentation of all 6 label application scripts
  - Parameters and options for each script
  - Platform requirements (PowerShell, POSIX shell, Azure CLI)
  - Usage examples
  - Output and exit codes
- **Integration Points**: How agents should invoke scripts when creating maps and tickets
- **Determinism and Consistency**: How scripts ensure reproducible label application
- **Provider-Specific Notes**: GitHub, Azure DevOps, and Markdown considerations
- **Error Handling**: Built-in validation and diagnostics
- **References**: Links to PROVIDERS.md and SKILL.md

### 3. Moved Label Application Scripts

**From**: `/scripts/` (repo-local, not shipped)  
**To**: `.apm/skills/jl-recon/scripts/` (shipped with the skill, discoverable by agents)

All 6 scripts are now co-located with the jl-recon skill where they will be included in the NPM package and available to
agents and downstream users.

### 4. Updated jl-recon SKILL.md

**Changes**:

- Added a new entry in the **References** section pointing to `LABEL-APPLICATION-HELPERS.md`
- Added a new **Scripts** section to list all 6 label application scripts with descriptions of what each one does

This makes scripts discoverable from the skill definition — anyone reading SKILL.md sees that label application helpers
exist and where to find full documentation.

### 5. Updated PROVIDERS.md

**Changes**: Added concrete script references and implementation guidance at 5 key locations:

#### A. Overview of "Per-Provider Application Details" section

Added guidance: "Use the helper scripts documented in [LABEL-APPLICATION-HELPERS.md](./LABEL-APPLICATION-HELPERS.md) to
apply labels and tags deterministically across providers."

#### B. GitHub Section

- Added note that `apply-ticket-labels.ps1` or `apply-ticket-labels.sh` should be used after map creation
- Added note that the same scripts are used for ticket label application
- Each note links to LABEL-APPLICATION-HELPERS.md for full parameter documentation

#### C. Azure DevOps Map Tag Application Section

- Added implementation guidance to use `apply-ado-map-tags.ps1` after map work item creation
- Noted that the script handles tag resolution, sorting, and Azure DevOps semicolon formatting

#### D. Azure DevOps Ticket Tag Application Section

- Added implementation guidance to use `apply-ado-ticket-tags.ps1` after ticket creation
- Explained that users provide ticket type, configured labels, and inherited map tags;
  the script computes the additive set

#### E. Markdown Map and Ticket Sections

- Added implementation guidance to use `record-markdown-map-labels.ps1` for maps
- Added implementation guidance to use `record-markdown-ticket-labels.ps1` for tickets
- Noted that scripts parse existing frontmatter and preserve other fields while updating labels deterministically

All references include links to LABEL-APPLICATION-HELPERS.md for complete documentation.

## Files Modified

1. `.apm/skills/jl-recon/references/LABEL-APPLICATION-HELPERS.md` — **Created** (327 lines)
2. `.apm/skills/jl-recon/assets/apply-ticket-labels.ps1` — **Copied** from `/scripts/`
3. `.apm/skills/jl-recon/assets/apply-ticket-labels.sh` — **Copied** from `/scripts/`
4. `.apm/skills/jl-recon/assets/apply-ado-map-tags.ps1` — **Copied** from `/scripts/`
5. `.apm/skills/jl-recon/assets/apply-ado-ticket-tags.ps1` — **Copied** from `/scripts/`
6. `.apm/skills/jl-recon/assets/record-markdown-map-labels.ps1` — **Copied** from `/scripts/`
7. `.apm/skills/jl-recon/assets/record-markdown-ticket-labels.ps1` — **Copied** from `/scripts/`
8. `.apm/skills/jl-recon/SKILL.md` — **Updated** (References and Assets sections)
9. `.apm/skills/jl-recon/references/PROVIDERS.md` — **Updated** (5 implementation sections)

## Document Placement Rule Compliance

This implementation follows the rules documented in AGENTS.md:

✅ **Rule 1**: If a skill or agent reads/references a file during execution, it must be shipped.

- Scripts are now in `.apm/skills/jl-recon/`, which is shipped with the skill.

✅ **Rule 2**: Configuration for how agents work in a specific repo goes in AGENTS.md.

- No new agent configuration was added; this is skill content.

✅ **Rule 3**: Content that a skill needs to function goes in the skill's directory.

- Scripts are in `.apm/skills/jl-recon/assets/`.
- Documentation is in `.apm/skills/jl-recon/references/`.

✅ **Rule 4**: Maintenance or setup documentation for humans goes in `/docs/` or README.md.

- CI scripts remain in `/scripts/` (repo-local).

## How Agents Will Use This

When agents (e.g., jl-recon) need to apply labels to a GitHub issue, Azure DevOps work item, or Markdown document:

1. Resolve label configuration from `jl_recon.labels.*` using `jl-config`
2. Determine the provider (GitHub, Azure DevOps, or Markdown)
3. Look up the appropriate helper script in `.apm/skills/jl-recon/assets/`
4. Invoke the script with resolved configuration and the map/ticket details
5. The script applies deterministic, sorted labels/tags following PROVIDERS.md logic

Example (GitHub ticket):

```powershell
.\apply-ticket-labels.ps1 `
  -Repo "owner/repo" `
  -TicketNumber 42 `
  -Type "research" `
  -ConfiguredLabels "type:research,recon-output" `
  -InheritedLabels "recon:map,planning"
```

## Next Steps

### For Issues #154 and #155

These issues are now complete:

- ✅ #154: Label application scripts exist and implement the deterministic formula from PROVIDERS.md
- ✅ #155: Scripts are discoverable, documented, and referenced from the skill's documentation

### For Future Work

- If new providers are added to jl-recon (e.g., Linear, Jira), new helper scripts should follow the same pattern:
  script in assets/, documentation in LABEL-APPLICATION-HELPERS.md, integration references in PROVIDERS.md
- Consider auto-generation of scripts from a common template if code duplication becomes a maintenance burden
- Monitor downstream repository usage to identify if script parameter names or behavior need adjustment

## Verification

To verify this implementation:

1. Check that `.apm/skills/jl-recon/assets/` contains all 6 label application scripts
2. Verify that `.apm/skills/jl-recon/references/LABEL-APPLICATION-HELPERS.md` exists and is comprehensive
3. Confirm that SKILL.md References section points to LABEL-APPLICATION-HELPERS.md
4. Confirm that SKILL.md Assets section lists all 6 scripts
5. Verify that PROVIDERS.md has implementation notes and script references at all 5 key locations

## References

- AGENTS.md → "Repository Structure and Document Placement Rules"
- `.apm/skills/jl-recon/SKILL.md` → Configuration, Requirements, and Assets sections
- `.apm/skills/jl-recon/references/PROVIDERS.md` → Label Formatting and Per-Provider Application Details sections
- `.apm/skills/jl-recon/references/LABEL-APPLICATION-HELPERS.md` → Full script documentation
