# Provider Mechanics

How the map, tickets, blocking, and assignee tracking are represented per
provider. Only the provider actually in use for a given map matters — read
the section for that provider, not all three.

## GitHub

- **Map**: an issue labelled `recon:map`.
- **Inciting issue link**: if the map was charted because an existing issue
  turned out too big, make the map a native sub-issue of that issue (GitHub's
  sub-issue feature), so it appears in that issue's task list and the map is
  discoverable from where the request started. If the inciting issue is
  itself already a sub-issue of something else, still link the map under it
  directly — do not skip a level. If native sub-issue linking is unavailable
  for any reason, fall back to a `Parent issue: [name](link)` line at the
  top of the map's Notes section — but prefer the native relationship.
- **Tickets**: native sub-issues of the map issue. Copy every label the map
  issue carries onto each new ticket, then add the ticket's own
  `recon:<type>` label on top — labels are additive, not a replacement
  for whatever the map already carries (area labels, priority, `bug`, and
  so on).
- **Decisions-so-far**: a single manually-maintained list in the map issue
  body. This is needed even though GitHub already renders the sub-issue list
  natively, because some decisions resolve trivially in-session with no
  child issue ever created — the manual list is the only place those show
  up. Do not add a second list, a prose summary, or a status table
  alongside it; one list carries all resolved decisions, whether or not each
  one has a sub-issue behind it.
- **Ticket type**: a label — `recon:research`, `recon:prototype`,
  `recon:quiz`, `recon:task`.
- **Blocking**: GitHub's native "blocked by" / "blocks" issue links. Also add
  a short note in the ticket body stating the reason, e.g. `BLOCKED:
  requires the widget widgetiser from [widgetising-widgets]` — the native
  link says *that* it's blocked; the note says *why*, in the same place a
  reader's eye already is.
- **Assignee tracking**: the issue's native assignee field.

## Azure DevOps

- **Map**: a parent work item.
- **Inciting issue link**: if the map was charted because an existing work
  item turned out too big, link the map as a **child** of that work item
  using Azure DevOps's native parent/child link type — the map becomes a
  child of the inciting work item even though the map itself is also a
  parent to its own tickets. This nesting is expected and is how Azure
  Boards' hierarchy is meant to be used. If the inciting work item cannot
  take a child link (e.g. it's already at the bottom of the configured
  hierarchy), use a "Related" link instead and say so in the map's
  description.
- **Tickets**: child work items, linked natively. Copy every tag the parent
  work item carries onto each new ticket. Once a ticket-type tag exists (see
  below), add it on top of the copied tags rather than replacing them.
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
  [`assets/recon-map-template.md`](../assets/recon-map-template.md),
  which extends `jl-plan-template`'s base template.
- **Inciting issue link**: markdown has no native parent/child link, so
  record it explicitly — a `inciting-issue:` frontmatter field pointing at
  the issue/work item/document, plus a linked-by-name reference in the map's
  Notes section (e.g. "Charted because [Original issue name](link) turned
  out too big for one session"). Both the frontmatter field and the Notes
  line are needed: frontmatter for machine lookup, the Notes line for a
  human reading the rendered document.
- **Tickets**: individual markdown documents, one per ticket, alongside the
  map. No native label/tag concept to copy — the ticket type frontmatter
  field below is the only classification a markdown ticket carries.
- **Decisions-so-far**: same single-list rule, as a section in the map
  document.
- **Ticket type**: a YAML frontmatter field, e.g. `type: research`. Fixed at
  creation like every other provider — never rewritten because a quiz
  surfaced mid-ticket.
- **Blocking**: a frontmatter field, e.g. `blocked-by: [ticket-slug]`, plus
  the same short reason note in the document body.
- **Assignee tracking**: a frontmatter field, e.g. `assignee:`, or a short
  note in the body if no assignee concept fits the session.
