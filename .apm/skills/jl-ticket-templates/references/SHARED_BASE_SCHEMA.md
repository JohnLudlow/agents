# Shared Ticket Base Schema

## Overview

This document defines the **canonical structure** for all ticket types in this
repository: quiz, research, prototype, task, and map. Every ticket inherits
this base frontmatter and acceptance-criteria contract, then extends it with
type-specific sections.

Type-specific templates (for example, `quiz-template.md`, `research-template.md`)
should reference this base explicitly and document only what they add.

## Frontmatter Structure

Every ticket MUST carry YAML frontmatter with these fields:

```yaml
---
title: "[Ticket title]"
description: "[One-line summary]"
type: "[quiz | research | prototype | task | map]"
status: "[Draft | Ready | In Progress | Done | Blocked]"
author: "[Author or agent name]"
date: "[YYYY-MM-DD creation date]"
related_links: "[Comma-separated links or empty]"
parent: "[Parent issue URL or empty]"
---
```

### Frontmatter Field Contract

| Field | Type | Required | Notes |
|:------|:-----|:---------|:------|
| `title` | string | Yes | Human-readable ticket title; should clearly state what the ticket is about |
| `description` | string | Yes | One-line summary; used by listing and discovery |
| `type` | enum | Yes | One of: `quiz`, `research`, `prototype`, `task`, `map`; determines which type-specific sections apply |
| `status` | enum | Yes | One of: `Draft`, `Ready`, `In Progress`, `Done`, `Blocked`; tracks lifecycle |
| `author` | string | Yes | Agent name or human name; identifies who created or is driving this ticket |
| `date` | string (ISO 8601) | Yes | Creation date; enables sorting and archival |
| `related_links` | string | No | Comma-separated URLs to related tickets, decisions, or external resources; empty string if none |
| `parent` | string (URL) | No | URL of parent issue if this ticket is a child work item; empty if top-level |

### Frontmatter Examples

**Minimal frontmatter** (no related links or parent):

```yaml
---
title: "Evaluate database migration approach"
description: "Research whether to migrate to PostgreSQL or stay with SQLite"
type: "research"
status: "Ready"
author: "jl-recon"
date: "2026-08-30"
related_links: ""
parent: ""
---
```

**Frontmatter with parent and related links**:

```yaml
---
title: "Prototype real-time collaboration UI"
description: "Build throwaway prototype to test websocket-based state sync"
type: "prototype"
status: "In Progress"
author: "jl-implementer"
date: "2026-08-29"
related_links: "https://github.com/JohnLudlow/agents/issues/152, https://github.com/JohnLudlow/agents/issues/155"
parent: "https://github.com/JohnLudlow/agents/issues/143"
---
```

## Acceptance-Criteria Format

Every ticket MUST define acceptance criteria — the checkable conditions that
determine when the work is done. Acceptance criteria follow a canonical format:

### Section Structure

Include an **Acceptance Criteria** section (or **Acceptance Criteria** subsection
under the type-specific section) containing a checklist:

```markdown
## Acceptance Criteria

- [ ] Criterion 1: [Specific, measurable, checkable outcome]
- [ ] Criterion 2: [Specific, measurable, checkable outcome]
- [ ] Criterion 3: [Specific, measurable, checkable outcome]
```

Each criterion should be:

- **Specific** — state exactly what must be true
- **Measurable** — avoid vague language like "understand" or "investigate";
  use "write", "verify", "document", "test", "validate"
- **Checkable** — the agent should be able to verify it's done by running a
  command, reading output, or reviewing an artifact

### Good Acceptance Criteria

```markdown
## Acceptance Criteria

- [ ] Validator module exports `validateTemplate(template, platform)` function
- [ ] All 4 smoke tests pass (valid GitHub, invalid field, valid Azure DevOps, enum violation)
- [ ] Module loads without errors: `require('./validator.js')` succeeds
```

### Poor Acceptance Criteria

```markdown
## Acceptance Criteria

- [ ] Understand how templates work  ❌ Not measurable; "understand" is vague
- [ ] Improve code quality  ❌ Not specific; improvement is subjective
- [ ] Create a good validator  ❌ "good" is subjective; what makes it good?
```

## Common Sections

All tickets, regardless of type, should include these sections in addition to
their type-specific sections:

### 1. Overview or Executive Summary

**Purpose**: State what the ticket is about in 1–2 paragraphs.

**When to include**: Always. This is the first thing a reader sees after the
title and frontmatter.

**Example**:

```markdown
## Overview

This research ticket evaluates whether to adopt TypeScript strict mode
for the agents codebase. We need to decide between improved type safety
and the overhead of retrofitting existing code.
```

### 2. Context or Motivation (optional)

**Purpose**: Explain why this ticket exists — what problem it solves, what
decision it informs, or what dependency it resolves.

**When to include**: When the "why" is not obvious from the title and overview.

**Example**:

```markdown
## Context

Issue #143 (AC3.7) requires all issues to follow a consistent template
structure. This research informs whether we should add more platform types
(Jira, Linear) to the ticket validator.
```

### 3. Acceptance Criteria

**Purpose**: Define the checkable conditions for done.

**When to include**: Always. This is the completion gate.

**Format**: Use the canonical checklist format from [Acceptance-Criteria Format](#acceptance-criteria-format).

### 4. Related Issues or Blocked By (optional)

**Purpose**: List GitHub issue numbers or URLs for parent, child, or blocking
relationships.

**When to include**: When the ticket is linked to other work.

**Example**:

```markdown
## Related Issues

- Blocks: #158 (jl-recon integration)
- Blocked by: #162 (jl-ticket-templates skill)
- Parent: #143 (AC3.7)
```

### 5. Notes or Revision History (optional)

**Purpose**: Record decisions, updates, or iteration history.

**When to include**: When the ticket has been revised or there are unresolved
open questions.

**Example**:

```markdown
## Notes

- Investigated Python vs. JavaScript for validator; chose JavaScript for portability.
- Deferred Jira support to follow-up ticket.
```

## Template Inheritance Model

Type-specific templates **extend** this base schema by adding type-specific
sections.

### Inheritance Pattern

1. **Start with frontmatter** — use the frontmatter structure above, setting
   `type` to the ticket type.
2. **Include common sections** — include Overview, Acceptance Criteria, and
   any of the optional common sections that apply.
3. **Add type-specific sections** — append sections unique to the ticket type.
   (See type-specific template documents for details.)
4. **Remove inapplicable sections** — if the type-specific template or
   guidance says a section doesn't apply, omit it rather than leaving a
   placeholder.

### Example: How a Quiz Ticket Inherits

A quiz ticket starts with the base frontmatter and common sections, then adds
quiz-specific sections like "Clarification Strategy" or "Question Categories":

```markdown
---
title: "[Title]"
description: "[Summary]"
type: "quiz"
status: "Draft"
author: "[Author]"
date: "[Date]"
related_links: ""
parent: ""
---

## Overview
[...]

## Acceptance Criteria
- [ ] [Criterion 1]
- [ ] [Criterion 2]

## Clarification Strategy
[Quiz-specific section]

## Question Categories
[Quiz-specific section]
```

### Extending for New Ticket Types

To add a new ticket type (for example, `decision`):

1. Update the `type` enum in the frontmatter contract to include the new type.
2. Create a type-specific template document in `references/`, such as
   `DECISION_TEMPLATE.md`, that references this base.
3. Document what type-specific sections the new type requires.
4. Update the validator if you need to enforce type-specific field constraints.

## Contract Compliance

For a ticket to comply with this schema:

- **Frontmatter** — includes all required fields; `type` matches one of the
  enumerated types
- **Acceptance Criteria** — present and checkable
- **Common sections** — includes Overview and Acceptance Criteria at minimum
- **Type-specific sections** — includes all sections required by the ticket's
  type-specific template

Consuming skills (such as `jl-recon` and `jl-issue-management`) should validate
against this contract before creating or updating tickets.

## Related Documents

- **Type-specific templates**: (To be created)
  - `QUIZ_TEMPLATE.md` — for quiz tickets
  - `RESEARCH_TEMPLATE.md` — for research tickets
  - `PROTOTYPE_TEMPLATE.md` — for prototype tickets
  - `TASK_TEMPLATE.md` — for task tickets
  - `MAP_TEMPLATE.md` — for map tickets
- **Validator API**: See `SKILL.md` for the contract that validates tickets
  against this schema
- **Platform templates**: `assets/` folder contains platform-specific
  payload templates (GitHub Issues, Azure DevOps)
