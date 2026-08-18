---
name: jl-recon
description: "Recon skill: charts a map of decision tickets that turns a large, poorly-understood feature into a well-understood one. User-invoked only — launch by name when a request is too big or too fuzzy for one session."
disable-model-invocation: true
---

# Recon

## Overview

Recon turns a large, poorly-understood feature into a large,
well-understood one, one decision at a time. It is adapted from Matt
Pocock's [`/wayfinder`](https://github.com/mattpocock/skills/blob/main/skills/engineering/wayfinder/SKILL.md),
with one deliberate divergence: every ticket type here defaults to
human-in-the-loop, not autonomous. Where the original leans AFK, this one
leans on the human staying in the room.

A **map** is the plan, referral doc, and homepage for the feature: it names
the **destination**, indexes every decision made on the way there, sketches
what's still **fog of war**, and lists what's been ruled **out of scope**.
Nobody reads the map to find the answer — they read it to find which
**ticket** has the answer, or to see that the answer is still fog.

This skill is user-invoked only. An agent may notice a request has this
shape and suggest Recon by name, but only a human launches it.

## Configuration

jl-recon reads settings from `jl_recon` configuration in `CONTRIBUTING.md`
and `AGENTS.md`. It uses `jl-config` only for the generic resolution
mechanism; jl-recon owns this schema, its defaults, and its validation.

### Schema

| Setting | Type | Allowed values | Default | Sensitivity |
| --- | --- | --- | --- | --- |
| `decision_gates.destination_confirmation` | boolean | `true`, `false` | `false` | required by recon |
| `decision_gates.inciting_issue_confirmation` | boolean | `true`, `false` | `false` | required by recon |
| `decision_gates.research_afk` | boolean | `true`, `false` | `false` | required by recon |
| `uncertainty_tracking.pattern` | string | any markdown heading string | `## Not Yet Specified (Fog of War)` | optional |

### Validation and defaults

- validate that `jl_recon`, if present, is an object
- validate `decision_gates`, if present, as an object of booleans
- validate `uncertainty_tracking`, if present, as an object
- default each missing decision gate to `false`
- default missing `uncertainty_tracking.pattern` to
  `## Not Yet Specified (Fog of War)`
- apply resolved gate values at their workflow decision points rather than
  relying on separate hardcoded gate rules

### Example configuration

In `CONTRIBUTING.md`:

```yaml
jl_recon:
  decision_gates:
    destination_confirmation: false
    inciting_issue_confirmation: false
    research_afk: false
  uncertainty_tracking:
    pattern: "## Not Yet Specified (Fog of War)"
```

In `AGENTS.md`:

```yaml
jl_recon:
  decision_gates:
    destination_confirmation: true
```

## Configuration via `jl-config`

Before charting, working, reporting, or archiving, resolve `jl-config` from
`CONTRIBUTING.md` and `AGENTS.md` using jl-recon's defaults and the
precedence defined by the `jl-config` skill.

This skill consumes:

- `jl_recon.decision_gates.destination_confirmation`
- `jl_recon.decision_gates.inciting_issue_confirmation`
- `jl_recon.decision_gates.research_afk`
- `jl_recon.uncertainty_tracking.pattern`

Resolved behaviour:

- `destination_confirmation`
  - `required`: confirm the destination before creating or updating a map or
    ticket artifact
  - `optional`: destination may still be confirmed when the session is
    ambiguous, but it is not a config-mandated gate
- `inciting_issue_confirmation`
  - `required`: confirm the inciting issue with the human before linking or
    creating artifacts against it
  - `optional`: ask when an inciting issue appears to exist but certainty is
    not required by config
- `research_afk`
  - `required`: treat AFK research as a gated decision every time
  - `optional`: AFK research may still require explicit sign-off by the skill
    rules below, but not because of repository config alone
- `uncertainty_tracking.pattern`
  - use the resolved label when recording unresolved items in markdown maps or
    in any textual artifact that mirrors the map structure
  - if not configured, default to `## Not Yet Specified (Fog of War)` through
    jl-recon's own defaults

Graceful fallback:

- Missing config files are not an error; use `jl-config` resolution with
  jl-recon's defaults.
- Do not keep separate hardcoded gate logic in this skill; apply the resolved
  `jl_recon` values at the destination, inciting-issue, research-AFK, and fog
  recording decision points.
- If a gate's practical effect is still ambiguous in the current session, ask
  the human rather than inventing a stricter or looser rule.

### Configuration Warnings

jl-recon validates its configuration at startup and emits warnings (in the
format defined by jl-config) for:

#### Type Mismatch — decision gate

```text
[WARN] jl-recon: 'decision_gates.destination_confirmation' must be a
  boolean (true/false), not a string
  File: AGENTS.md [line 6]
  Fix: Change the value to a boolean: destination_confirmation: true
```

#### Type Mismatch — uncertainty tracking pattern

```text
[WARN] jl-recon: 'uncertainty_tracking.pattern' must be a string, not a list
  File: CONTRIBUTING.md [line 10]
  Fix: Change to a markdown heading string: pattern: "## Unknowns"
```

#### Invalid Heading Format

```text
[WARN] jl-recon: 'uncertainty_tracking.pattern' must start with #
  (markdown heading), got "Unknowns"
  File: AGENTS.md [line 8]
  Fix: Change to a valid heading: pattern: "## Unknowns" or "### TBD"
```

#### Empty Pattern String

```text
[WARN] jl-recon: 'uncertainty_tracking.pattern' cannot be empty
  File: CONTRIBUTING.md [line 9]
  Fix: Provide a markdown heading like "## Not Yet Specified"
```

#### Root Shape Error

```text
[WARN] jl-recon: 'decision_gates' must be an object with boolean-valued
  keys, not a list
  File: AGENTS.md [line 5]
  Fix: Change to YAML object syntax: decision_gates: { destination_confirmation: true }
```

#### Malformed decision_gates structure

```text
[WARN] jl-recon: 'decision_gates.destination_confirmation' must be a
  boolean (true/false), not a string "yes"
  File: CONTRIBUTING.md [line 7]
  Fix: Use boolean values (true or false, not quoted strings)
```

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

## Ticket Types

Every type is human-in-the-loop by default. The exception is scoped
narrowly: Research may run AFK, and only with the human's explicit sign-off
for that specific ticket.

- **Research** — investigate to surface a fact a decision is waiting on
  (an API's behaviour, a library's constraints, how existing code does
  something). Ask the human before running it AFK; whether AFK or live, the
  human reviews and accepts the findings before the ticket closes.
- **Prototype** — raise the fidelity of a discussion with a cheap artifact
  to react to. Delegate to `jl-prototype` for the full flow
  (its own quiz, its own branch, its own self-check).
- **Quiz** — resolve a decision conversationally, one question at a
  time. Delegate to `jl-quiz`. A quiz is not exclusive to this
  ticket type — it can surface inside a Prototype ticket (commonly, to get
  feedback on what was just built) or a Research ticket (occasionally) —
  without changing that ticket's fixed type.
- **Task** — manual work that has to happen before a decision can be made
  (provisioning access, moving data, signing up for a service). Not a
  decision itself; it unblocks one. When a Task involves making source
  changes directly, it gets an isolated worktree — see
  `jl-subagent-spawning/SKILL.md` → Task Ticket Worktree-Trigger Detection
  for how that's determined (explicit `worktree: required` marker, then
  inference, defaulting to inline when ambiguous).

## Modes

Four entry points. Pick the one that matches what the human asked for; each
ends on its own completion criterion.

### 1. Chart the map

Starting a map from a loose idea.

1. Name the destination — run `jl-quiz`, in whichever mode (A or B)
   the scope calls for.
   If resolved `decision_gates.destination_confirmation` is `true`, confirm the
   destination explicitly before creating the map artifact.
2. Map the frontier — run `jl-quiz` again, breadth-first, to surface
   the decisions currently blocking the destination and the fog around them.
   Record each fog item the moment the quiz surfaces it, before moving on.
   If nothing surfaces as fog, the way is already clear — say so and ask the
   human how they want to proceed instead of forcing a map into existence.
3. Ask whether an inciting issue exists — the issue, work item, or thread
   that prompted charting this map. If one does, and
   resolved `decision_gates.inciting_issue_confirmation` is `true`, confirm
   it with
   the human before creating anything. If the gate is optional, still confirm
   when the source issue is uncertain or the link target is ambiguous.
4. Create the map artifact (see [PROVIDERS.md](references/PROVIDERS.md) for
   the mechanics of each provider) with Destination and Notes filled in, the
   Decisions-so-far list empty, and the surfaced fog under the resolved
   `uncertainty_tracking.pattern` heading.
5. If an inciting issue was confirmed, link the map to it immediately, using
   the provider's native mechanism — see
   [PROVIDERS.md](references/PROVIDERS.md). Do this before creating any
   tickets; an unlinked map is the bug this step exists to prevent.
6. Create tickets for every decision sharp enough to specify now, as
   children of the map. On GitHub or Azure DevOps, copy the map's labels or
   tags onto each new ticket before adding its `recon:<type>`
   classification — see [PROVIDERS.md](references/PROVIDERS.md). Wire
   blocking relationships in a second pass — see
   [PROVIDERS.md](references/PROVIDERS.md) for the mechanics per provider.
7. For any Research ticket, ask the human whether it may run AFK before
   touching it further. If resolved `decision_gates.research_afk` is `true`,
   this is a mandatory gate even when the human has previously been
   comfortable with AFK research in similar sessions.

**Completion criterion:** the map artifact exists with every section
populated (even if Decisions-so-far is still empty), it is linked to its
inciting issue if one exists, and every ticket specifiable today has been
created.

### 2. Work through the map

Resolving one ticket on an existing map.

1. Load the map. Read it at the level the map itself offers — Destination,
   Notes, the Decisions-so-far list, fog, out-of-scope — not every child
   ticket's full body.
2. Pick the ticket: the human names one, or you propose the first
   unblocked, unclaimed frontier ticket and let them confirm or redirect.
3. Note who's working it — an assignee, or a short marker in the ticket body
   — so another human glancing at the map can tell. No formal claim step;
   this is informational, not a lock.
4. If the ticket will be delegated to a subagent (via `jl-subagent-spawning`'s
   `DelegateToSubagent` action, where the harness supports it and the
   required approval is present), emit a clear handoff message before
   spawning — see "Delegation Handoff Messaging" below. If the ticket is
   resolved inline instead, skip this step.
5. Resolve it through the mechanism its type maps to (see Ticket Types
   above). A quiz may surface inside any ticket regardless of type. Record
   any new question or uncertainty the work surfaces — from a quiz detour,
   prototype feedback, or research findings — to the map using the resolved
   `uncertainty_tracking.pattern` immediately, in-session, before the pass
   continues.
6. If the ticket was delegated, emit a clear completion notification when
   the delegated work returns — see "Delegation Handoff Messaging" below —
   before recording the resolution.
7. Record the resolution: close the ticket, then append exactly one line to
   the map's Decisions-so-far list. One line, one place — if the map already
   shows this natively (GitHub's own sub-issue list), the manual line still
   goes in because some decisions resolve with no child ticket at all; it
   never gets restated a second time as a summary or a status table.
8. Create any newly-surfaced tickets and graduate any fog the resolution
   burned off. Log any newly-surfaced uncertainty to the map's fog in the
   same pass, before the pass ends. If the resolution reveals scope the
   destination doesn't cover, close it into Out-of-scope instead of
   recording it as a decision.

**Completion criterion:** the ticket is closed, the Decisions-so-far list
carries its one new line, and every new uncertainty the pass surfaced is
recorded as fog on the map, in-session, before the pass ends.

#### Delegation Handoff Messaging

When a ticket is delegated to a subagent, emit a handoff message before
spawning that includes:

- the ticket's linked name (never a bare id);
- its fixed ticket type (Research, Prototype, Quiz, or Task);
- the reason delegation was chosen for this ticket;
- an estimated time or scope, if known; and
- whether it will run AFK (Research only, and only with prior sign-off — see
  Ticket Types above) or requires human review before it can close.

Recommended wording:

> Delegating **{ticket name}** ({ticket type}) to a subagent — {reason}.
> {AFK: "This will run unattended; findings will be presented for your review
> before the ticket closes." | "This requires your input during the
> delegated task."}

When the delegated work returns, emit a clear completion notification before
recording the resolution:

> **{ticket name}** delegation complete. {one-line summary of what came
> back}. {If Research: "Please review the findings before I close this
> ticket."}

See `jl-subagent-spawning/SKILL.md` for the underlying `DelegateToSubagent`
approval, capability, and fallback mechanics this messaging sits on top of.

### 3. Report on implementation status

Surfacing where a map currently stands, without changing anything.

Present one list: every ticket's status (resolved, open, or blocked — with
the blocked ones showing their block reason) alongside the remaining fog.
This mode never resolves a ticket or edits the map; it only reads and
presents.

**Completion criterion:** the human has the full status list and nothing on
the map has been altered.

### 4. Resolve or archive stale items

Clearing out tickets or fog that have stopped being useful.

Surface a list of candidates — long-blocked tickets, decisions superseded by
a later resolution, fog that no longer bears on the destination. For each
candidate, ask the human what to do: resolve it now, archive it to
Out-of-scope, leave it open, or redraw the destination. Never archive more
than one candidate on a single, unconfirmed sweep — each needs its own
answer.

**Completion criterion:** every surfaced candidate has an explicit human
answer recorded against it (resolved, archived, kept open, or the
destination itself was redrawn).

## Requirements

The agent MUST:

- Confirm the destination and frontier through `jl-quiz` before
  creating the map (Chart mode) — never invent scope on the agent's own
  read of a loose request.
- Resolve `jl-config` before acting, validate the resolved `jl_recon`
  settings against jl-recon's schema, and apply its decision gates and
  uncertainty-tracking pattern at the workflow points they govern.
- Ask whether an inciting issue exists before creating the map, and if one
  does, link the map to it using the provider's native mechanism before
  creating any tickets.
- Copy the map's labels or tags onto every ticket created on GitHub or
  Azure DevOps, in addition to the ticket's own `recon:<type>`
  classification — never in place of it.
- Record every new question or uncertainty to the map's fog the moment it
  surfaces — during charting, walking the map, or any ticket work — never
  deferring it until the human asks.
- Emit a clear delegation handoff message before spawning a subagent for a
  ticket, and a clear completion notification when the delegated work
  returns — see "Delegation Handoff Messaging" under Mode 2.
- Get explicit, per-ticket human sign-off before running any Research ticket
  AFK, and have the human review its findings before closing it.
- Keep every other ticket type human-in-the-loop: the agent proposes, the
  human decides, on every resolution.
- Keep ticket type fixed once a ticket is created, regardless of what
  surfaces inside it.
- Record exactly one line per resolved decision in the map's single
  Decisions-so-far list.
- Ask the human, per candidate, before resolving or archiving a stale item —
  never batch without individual confirmation.
- Refer to every ticket by its linked name, never a bare id or number.

The agent MUST NOT:

- Fire this skill itself — it is user-invoked only. Suggesting it by name is
  fine; launching it is not.
- Create a map without asking whether an inciting issue exists, or leave a
  confirmed inciting issue unlinked once the map is created.
- Create a GitHub or Azure DevOps ticket without the map's labels or tags
  carried over.
- Let a ticket's type change because a quiz or other detour occurred inside
  it — spin off a child ticket instead. A Quiz ticket that internally runs
  quiz-as-mechanism does not retype the ticket.
- Represent the same child-item information more than once on a map (a list,
  then a summary of that list, then a status table of the same items).
- Resolve more than one ticket in a single "work through the map" pass,
  except an approved AFK Research ticket.
- Archive or close a stale item without that specific item's human
  confirmation.

## Relationship to Other Skills

- **jl-quiz** — the mechanism behind naming the destination, mapping
  the frontier, and every Quiz ticket. Its own Mode A/B split is
  inherited unchanged; Recon does not re-decide it.
- **jl-prototype** — the mechanism behind every Prototype ticket.
  Delegate fully rather than re-implementing its quiz, branch, or self-check.
- **jl-subagent-spawning** — consulted when a Research ticket is
  approved to run AFK, or when Task work is delegated rather than done
  inline; its per-harness capability table decides how (or whether) that
  delegation is possible in the current harness.
- **jl-issue-management** — supplies the provider-agnostic vocabulary
  (plan target, source of record, parent/child, mandatory human approval
  before provider-native writes) that map and ticket creation runs on.
- **jl-plan-template** — the base that
  `assets/recon-map-template.md` extends for markdown-provider maps.
- **jl-markdown-standards** — applies to any markdown map or ticket
  this skill produces, including source line wrapping and list-item spacing
  for map and ticket bodies, whether the provider is GitHub, Azure DevOps,
  or local markdown.

## References

- [PROVIDERS.md](references/PROVIDERS.md) — how the map, tickets, inciting-
  issue links, label/tag inheritance, blocking, and assignee tracking are
  represented on GitHub, Azure DevOps, and markdown-only, including the
  current no-dedicated-field stance for Azure DevOps ticket typing.

## Assets

- `assets/recon-map-template.md` — markdown map template, extending
  `jl-plan-template`'s template, for markdown-provider maps.
