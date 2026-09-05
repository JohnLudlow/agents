---
title: "[Map title]"
description: "[One-line destination this map is finding its way to]"
type: "map"
status: "Charting"
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

**What reaching the end of this map looks like.** A spec, a decision, or a
shipped change. Clear and achievable; named through jl-quiz before this
document is created.

Example:
> Shipped customer-profile service with documented API, passing integration
> tests, and deployment runbook in /docs/runbooks.

## Decisions So Far

One line per resolved decision, in resolution order. Link every decision ticket
by name.

- [Decision name] — resolved via [Ticket name](link) — [one-line summary of the answer]

Example:
- Authentication strategy — resolved via [Quiz: JWT vs session storage](../plans/auth-strategy) — JWT with refresh tokens

## Not Yet Specified (Fog of War)

Known to be in scope, not yet sharp enough to ticket. Note which kind of
unclear it is — the **what** (goal fuzzy, means straightforward) or the **how**
(goal fixed, means fuzzy).

Items are added as they surface during charting, walking, or prototyping — not
only at chart time.

- [Fog item] — [what | how]

Example:
- Database schema for user profile — **what** (shape of data unclear)
- Performance targets for API — **how** (need benchmarking)

## Out of Scope

Work consciously ruled outside the destination. Does not return unless the
destination itself is redrawn.

- [Excluded item] — [why it's excluded]

Example:
- Mobile app client — out of scope; web UI only for this map
- Legacy data migration — out of scope; clean slate

## Acceptance Criteria

A map is complete when:

1. **All Decisions Resolved** — Every known decision has a ticket and a recorded outcome
2. **Blocking Edges Clear** — All ticket dependencies are explicit in the Blocked Tickets table
3. **Frontier Identified** — The Open Tickets table shows what is unblocked and ready to start now
4. **Fog Minimized** — Fog of War items are minimal and each labels its kind of unclear (what | how)
5. **Destination Met** — The described destination has been reached or shipping plan is explicit

## Open Tickets (Frontier)

Tickets that are open, unblocked, and ready to claim now.

| Ticket | Type | Assignee | Status |
|:-------|:-----|:---------|:-------|
| [Ticket name](link) | Research / Quiz / Prototype / Task | [who, if anyone] | [Draft / Ready / In Progress] |

Example:
| Database schema design | Research | @alice | Ready |
| API contract | Quiz | @bob | In Progress |

## Blocked Tickets

| Ticket | Type | Blocked by | Reason |
|:-------|:-----|:-----------|:-------|
| [Ticket name](link) | Research / Quiz / Prototype / Task | [Blocking ticket name](link) | BLOCKED: [short reason] |

Example:
| Performance testing | Task | [API contract](../link) | BLOCKED: cannot benchmark until contract is stable |

## Revision History

Track each update: who changed what, when, and why.

| Date       | Author | Changes       |
|:-----------|:-------|:--------------|
| YYYY-MM-DD | Agent  | Map charted   |

Example:
| 2026-08-30 | jl-recon | Initial chart; 3 decisions, 5 fog items |
| 2026-09-01 | @alice   | Resolved authentication strategy; moved 2 fog items to blocked |
