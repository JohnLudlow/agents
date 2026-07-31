# Provider Mechanics

How the map, tickets, blocking, and assignee tracking are represented per
provider. Only the provider actually in use for a given map matters — read
the section for that provider, not all three.

## GitHub

- **Map**: an issue labelled `wayfinder:map`.
- **Tickets**: native sub-issues of the map issue.
- **Decisions-so-far**: a single manually-maintained list in the map issue
  body. This is needed even though GitHub already renders the sub-issue list
  natively, because some decisions resolve trivially in-session with no
  child issue ever created — the manual list is the only place those show
  up. Do not add a second list, a prose summary, or a status table
  alongside it; one list carries all resolved decisions, whether or not each
  one has a sub-issue behind it.
- **Ticket type**: a label — `wayfinder:research`, `wayfinder:prototype`,
  `wayfinder:grilling`, `wayfinder:task`.
- **Blocking**: GitHub's native "blocked by" / "blocks" issue links. Also add
  a short note in the ticket body stating the reason, e.g. `BLOCKED:
  requires the widget widgetiser from [widgetising-widgets]` — the native
  link says *that* it's blocked; the note says *why*, in the same place a
  reader's eye already is.
- **Assignee tracking**: the issue's native assignee field.

## Azure DevOps

- **Map**: a parent work item.
- **Tickets**: child work items, linked natively.
- **Decisions-so-far**: same single-list rule as GitHub, in the parent work
  item's description.
- **Ticket type**: no dedicated field yet. A tag will be created once real
  usage surfaces the need — do not design this speculatively ahead of that.
- **Blocking**: Azure DevOps's native predecessor/successor or
  "blocked by" link type, plus the same short reason note in the work item
  description.
- **Assignee tracking**: the work item's native `Assigned To` field.

## Markdown-only

- **Map**: a markdown document built from
  [`assets/wayfinder-map-template.md`](../assets/wayfinder-map-template.md),
  which extends `johnludlow-plan-template`'s base template.
- **Tickets**: individual markdown documents, one per ticket, alongside the
  map.
- **Decisions-so-far**: same single-list rule, as a section in the map
  document.
- **Ticket type**: a YAML frontmatter field, e.g. `type: research`. Fixed at
  creation like every other provider — never rewritten because a quiz
  surfaced mid-ticket.
- **Blocking**: a frontmatter field, e.g. `blocked-by: [ticket-slug]`, plus
  the same short reason note in the document body.
- **Assignee tracking**: a frontmatter field, e.g. `assignee:`, or a short
  note in the body if no assignee concept fits the session.
