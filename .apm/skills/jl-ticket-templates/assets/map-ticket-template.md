---
title: "[Map title]"
description: "[One-line destination this map is finding its way to]"
type: "map"
status: "Draft"
author: "[jl-recon or human charter]"
date: "[YYYY-MM-DD]"
related_links: "[Inciting issue link, related maps, documentation]"
parent: "[Parent epic or program, if any]"
---

# [Map Title]

A **map** is a structured view of a complex effort. It organizes decisions,
open work, and blocking edges into a single reference — helping the team see
progress, find the next unblocked action, and understand what is decided vs.
still in fog.

Use this template when charting a recon map as a markdown document or ticket.
It extends the shared base schema frontmatter and acceptance-criteria format;
replace every placeholder value before use.

## Frontmatter Notes

- `inciting-issue` (optional): Link to the work item or issue that prompted this map.
  If you use related_links instead, include the inciting issue there.
- `labels` (managed by jl-recon): Populated when the map ticket is created, reading
  `jl_recon.labels` from CONTRIBUTING.md or AGENTS.md.

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

## Acceptance Criteria

- [ ] AC001: Every known decision has a linked ticket and a recorded outcome.

- [ ] AC002: Every ticket dependency appears in the Blocked Tickets table.

- [ ] AC003: The Open Tickets table lists all unblocked work that is ready to start.

- [ ] AC004: Each Fog of War item has a **what** or **how** tag.

- [ ] AC005: The destination is met or the remaining delivery plan is explicit.

## Open Tickets (Frontier)

No open tickets yet; charting is in progress.

## Blocked Tickets

No blocked tickets yet; charting is in progress.

## Revision History

Track each update: who changed what, when, and why.

| Date       | Author | Changes       |
|:-----------|:-------|:--------------|
| YYYY-MM-DD | Agent  | Map charted   |

Example:
| 2026-08-30 | jl-recon | Initial chart; 3 decisions, 5 fog items |
| 2026-09-01 | @alice   | Resolved authentication strategy; moved 2 fog items to blocked |
