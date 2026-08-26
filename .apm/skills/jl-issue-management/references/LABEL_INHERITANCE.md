# Label Inheritance

This document describes the deterministic label resolution logic for maps and tickets across all providers (GitHub,
Azure DevOps, markdown).

## Core Logic

### Map Labels

Maps receive their configured label set from repository defaults or session overrides.

**Resolved labels = configured_labels_for_map_type**

Example:

- Configured: `labels.map = ["recon", "map"]`
- Result: `["map", "recon"]`

User override replaces the entire set:

- Override: `["custom", "priority-high"]`
- Result: `["custom", "priority-high"]`

### Ticket Labels

Tickets receive configured labels + inherited map labels + a type classification label.

**Resolved labels = sort_unique(configured_labels_for_ticket_type + inherited_map_labels + ["recon:<type>"])**

Example:

- Configured: `labels.quiz = ["question", "decision"]`
- Inherited from map: `["recon", "map"]`
- Ticket type: `quiz`
- Result: `["decision", "map", "question", "recon", "recon:quiz"]`

User override replaces the entire set:

- Override: `["custom", "priority-high"]`
- Result: `["custom", "priority-high"]`

### Label Sets

Three built-in sets may be configured per provider:

#### Configured Sets

Repository-configured label sets for maps and ticket types. Resolved from `jl_recon` configuration (for maps) or
`jl_issue_management` configuration (for general issues):

```yaml
# Example in AGENTS.md
jl_recon:
  labels:
    map: ["map", "recon"]
    quiz: ["question", "decision"]
    research: ["research", "investigation"]
    prototype: ["prototype", "spike"]
    task: ["task", "work"]
```

#### Inherited Sets

When a ticket is created under a map, the ticket **inherits the map's resolved labels** and adds them to its own
computed set.

This happens automatically:

1. Map is created with resolved labels → `["map", "recon"]`
2. Ticket created under map → ticket gets configured labels + `["map", "recon"]` + `recon:quiz`
3. Final ticket labels → `["decision", "map", "question", "recon", "recon:quiz"]`

#### Type Classification

Every ticket gets a `recon:<type>` label indicating its type. Types are:

- `recon:quiz`
- `recon:research`
- `recon:prototype`
- `recon:task`

These are always added (unless overridden by user).

## Provider-Specific Format

### GitHub

Labels are comma-separated strings:

```bash
gh issue edit 42 --add-label "map,recon,quiz"
```

Multiple calls concatenate (additive):

```bash
gh issue edit 42 --add-label "decision,question"
# Issue now has: decision, question, map, recon, quiz (all additive)
```

To replace labels, clear first then add:

```bash
gh issue edit 42 --remove-label "*"
gh issue edit 42 --add-label "custom,priority-high"
```

### Azure DevOps

Tags are semicolon-separated (no spaces):

```powershell
az boards work-item update --id 42 --fields "System.Tags=map;recon;quiz"
```

Azure DevOps only supports tag replacement, not addition. Setting `System.Tags` replaces the entire tag set.

### Markdown

Labels are stored in YAML frontmatter as a list:

```yaml
---
title: "Recon Map"
labels:
  - map
  - recon
---
```

## Configuration Schema

### Configuration Structure

Repository defaults are configured under `jl_recon` (for maps) or `jl_issue_management` (for general issues):

```yaml
jl_recon:
  labels:
    map: ["map", "recon"]          # Map labels
    quiz: ["question", "decision"]  # Quiz ticket labels
    research: ["research"]          # Research ticket labels
    prototype: ["prototype", "spike"] # Prototype ticket labels
    task: ["task", "work"]          # Task ticket labels
```

### Default Values

If not configured, these defaults apply:

```yaml
labels:
  map: []
  quiz: []
  research: []
  prototype: []
  task: []
```

(All empty; tickets receive only `recon:<type>` and inherited labels.)

### Validation

- `labels` must be an object
- Each key (`map`, `quiz`, `research`, `prototype`, `task`) must map to a list
- Each list element must be a string
- Label strings must not contain commas (GitHub) or semicolons (Azure DevOps)

## Decision Points

### When to Apply Labels

**Maps:**

- Apply configured map labels when the map is created
- Do not re-apply on subsequent edits unless the label set explicitly changes

**Tickets:**

- Apply configured ticket labels + inherited map labels + type label when ticket is created
- Do not re-apply on subsequent edits unless the label set explicitly changes

### User Overrides

Session-specific user instructions can replace the entire label set for maps or tickets:

- User: "Label this map as `priority-high`"
  - Replaces configured set
  - Map gets: `["priority-high"]` (not `["map", "recon", "priority-high"]`)

- User: "Label this ticket as `blocked,needs-review`"
  - Replaces configured set
  - Ticket gets: `["blocked", "needs-review"]` (not the inherited set + these)

### Platform Capabilities

**GitHub:** Supports label addition and removal. Full replacement requires two calls (remove all, add new).

**Azure DevOps:** Supports tag replacement only. Setting `System.Tags` overwrites the previous value.

**Markdown:** Labels are fully controlled by script output. No GitHub/Azure DevOps API calls needed.

## See Also

- [Label Application Helpers](./LABEL_APPLICATION_HELPERS.md) — Platform-specific scripts and CLIs
- jl-recon SKILL.md — Map and ticket creation workflows
- PROVIDERS.md — Provider-specific artifact structure
