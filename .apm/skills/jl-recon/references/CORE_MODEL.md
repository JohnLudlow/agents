## Core Model

- **Destination** — what reaching the end of the map looks like: a spec, a
  decision, or a shipped change. Named first; it fixes scope for everything
  that follows.
- **Inciting issue** — the issue, work item, or conversation that prompted
  charting the map — often "this turned out too big for one session." If one
  exists, the map must link back to it using the provider's native
  parent/child or cross-reference mechanism, never left to float free. A map
  with no findable path back to why it exists is a map nobody can find.
- **Map** — the single canonical artifact holding Destination, Notes, one
  Decisions-so-far list, Not-yet-specified (fog), and Out-of-scope. A GitHub
  issue tagged `recon:map`, an Azure DevOps parent work item, or a
  markdown document from `assets/recon-map-template.md`.
- **Ticket** — a child artifact resolving exactly one decision, sized to one
  session. Its type is fixed at creation and never changes — a quiz that
  breaks out mid-ticket doesn't retype the ticket, it spins off a child
  ticket if it needs its own record.
- **Fog of war** — what's known to be in scope but not yet sharp enough to
  ticket. Covers two distinct kinds of unclear: unclear *what* (the goal is
  fuzzy, the means would be easy) and unclear *how* (the goal is fixed, the
  means are fuzzy). Resolving a ticket often burns off fog by revealing the
  next ticket underneath it. Fog is recorded the moment an uncertainty
  surfaces — in-session, during whatever pass raised it (charting, walking
  the map, prototyping), never deferred until the human asks or until a
  later cleanup pass.
- **Frontier** — the tickets that are open, unblocked, and unclaimed right
  now. This is what "work through the map" hands the human next.
- **Out of scope** — work consciously ruled outside the destination. Closed
  and does not return unless the destination itself is redrawn.

Refer to a ticket by its name — the linked title — never a bare id or
number. A wall of `#42, #43, #44` tells the reader nothing; a wall of linked
titles tells them what each one is about.
