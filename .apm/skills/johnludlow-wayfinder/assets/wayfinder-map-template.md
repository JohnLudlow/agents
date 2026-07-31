---
title: "[Map title]"
description: "[One-line destination this map is finding its way to]"
author: "johnludlow-wayfinder"
date: "YYYY-MM-DD"
status: "Charting"
inciting-issue: "[Link to the issue/work item/document that prompted this map, or 'None']"
---

# [Map Title]

Use this template when charting a Wayfinder map as a markdown document. It
extends `johnludlow-plan-template`'s frontmatter and governance conventions;
replace every placeholder value before use.

## Plan Target and Governance

- **Plan target**: Markdown map
- **Provider**: docs/plans (or the confirmed local file storage location)
- **Governing instructions**: [Repository guidance / linked guidance / session instruction]
- **Override source**: [None / user session override]
- **Child artifact strategy**: One markdown ticket document per decision, linked below

## Destination

[What reaching the end of this map looks like — a spec, a decision, or a
shipped change. Named through `johnludlow-quiz` before this document is
created.]

## Notes

[Anything the reader needs to know about the map itself before diving into
tickets — constraints, prior context, how this map came to exist. If an
inciting issue exists, say so here by name: "Charted because [Original issue
name](link) turned out too big for one session."]

## Decisions So Far

One line per resolved decision, in resolution order. Link every ticket by
name, never a bare id.

- [Decision name] — resolved via [Ticket name](link) — [one-line summary of the answer]

## Not Yet Specified (Fog of War)

Known to be in scope, not yet sharp enough to ticket. Note which kind of
unclear it is — the *what* (goal fuzzy, means would be easy) or the *how*
(goal fixed, means fuzzy) — where that distinction is known.

- [Fog item] — [what kind of unclear, if known]

## Out of Scope

Work consciously ruled outside the destination. Does not return unless the
destination itself is redrawn.

- [Excluded item] — [why it's excluded]

## Open Tickets (Frontier)

Tickets that are open, unblocked, and unclaimed right now.

| Ticket | Type | Assignee |
|:-------|:-----|:---------|
| [Ticket name](link) | Research / Prototype / Grilling / Task | [who, if anyone] |

## Blocked Tickets

| Ticket | Type | Blocked by | Reason |
|:-------|:-----|:-----------|:-------|
| [Ticket name](link) | Research / Prototype / Grilling / Task | [Blocking ticket name](link) | BLOCKED: [short reason] |

## Revision History

| Date       | Author | Changes       |
|:-----------|:-------|:--------------|
| YYYY-MM-DD | Agent  | Map charted   |
