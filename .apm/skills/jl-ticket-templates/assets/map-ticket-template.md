---
title: "[Map title]"
description: "[One-line destination of this map]"
type: "map"
status: "Draft"
author: "[jl-recon or human charter]"
date: "[YYYY-MM-DD]"
related_links: "[Inciting issue link, related maps, documentation]"
parent: "[Parent epic or program, if any]"
---

# [Map Title]

A **map** is a structured view of a complex effort. It lists decisions,
open work, and blocking edges in one reference. The team uses it to see
progress, find the next unblocked action, and see which items are decided
and which are not yet specified.

Use this template to chart a recon map as a Markdown document or ticket.
It extends the frontmatter and acceptance-criteria format of the shared base schema.
Replace every placeholder value before use.

## Frontmatter Notes

- `inciting-issue` (optional): Link to the work item or issue that started this map.
  If you use `related_links` instead, include the inciting issue there.
- `labels` (managed by jl-recon): jl-recon sets this field when it creates the map ticket.
  It reads `jl_recon.labels` from CONTRIBUTING.md or AGENTS.md.

## Destination

[State the specific outcome this Map will deliver.]

## Notes

[Record the context and constraints for this Map.]

## Decisions So Far

No decisions yet; this Map is in Draft.

## Not Yet Specified (Fog of War)

No fog yet; charting is in progress.

## Out of Scope

No exclusions yet; charting is in progress.

<!-- Each acceptance criterion needs an owner link in its text, such as
"Research: #12" (or a Markdown link), or the mark "(decision only)". The owner
is a Research, Prototype, Quiz, Learn, or Prerequisite ticket, never an
Implementation ticket. List a criterion with no owner yet by ID in Fog of War. -->

## Acceptance Criteria

- [ ] AC001: Every known decision has a linked ticket and a recorded outcome (decision only).

- [ ] AC002: Every ticket dependency appears in the Blocked Tickets table (decision only).

- [ ] AC003: The Open Tickets table lists all unblocked work that is ready to start (decision only).

- [ ] AC004: Each Fog of War item has a **what** or **how** tag (decision only).

- [ ] AC005: The destination is met or the remaining delivery plan is explicit (decision only).

## Open Tickets (Frontier)

No open tickets yet; charting is in progress.

## Blocked Tickets

No blocked tickets yet; charting is in progress.

## Revision History

Record each update: who changed what, when, and why.

| Date       | Author | Changes       |
|:-----------|:-------|:--------------|
| YYYY-MM-DD | Agent  | Map charted   |

Example:
| 2026-08-30 | jl-recon | Initial chart; 3 decisions, 5 fog items |
| 2026-09-01 | @alice   | Resolved authentication strategy; moved 2 fog items to blocked |
