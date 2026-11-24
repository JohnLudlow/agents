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

## Routing

Recon routes each agreed ticket type to its workflow. This entry point is the
router: the four modes are in `references/LIFECYCLE.md`, and the ticket types
are in `references/ROUTING.md`.

| Type | Routes to | Notes |
| --- | --- | --- |
| map | This router — Modes 1–4 in `references/LIFECYCLE.md` | The router itself. |
| research | `jl-research` — evidence-backed findings, trade-off-aware recommendation, user acceptance before resolution | AFK only with the human's explicit per-ticket permission; findings must be reviewed before closing. |
| prototype | `jl-prototype` skill — retained path | |
| quiz-requirements | Requirements Quiz — `jl-quiz` | |
| quiz-understanding | Understanding Quiz — `jl-quiz` | |
| learn | `jl-learn` | Explanations, resources and takeaways; optional knowledge check (completed and skipped outcomes remain distinct). |
| prerequisite | `jl-prerequisite` — external/manual unblockers with verifiable evidence; in-repository edits route to Implementation | |

Provider links: use provider-native links between maps, tickets and other
artifacts — GitHub `#nnn` or a `https://github.com/<owner>/<repo>/issues/nnn` URL,
Azure DevOps `AB#nnn`, and Markdown file links. Never leave a reference to
float: link the map to its inciting issue, a ticket to its parent map, and
record one line per resolved decision in the map's Decisions-so-far list.

All types are human-in-the-loop by default; see `references/LIFECYCLE.md` and
`references/ROUTING.md` for the details.

## Configuration

Configuration is resolved from `jl_recon`; the full schema is in
`references/CONFIGURATION.md`. The entry point names the keys the other
sections rely on:

- **Model selection:** `jl_recon.model_selection.default` and the per-type
  keys — `jl_recon.model_selection.map`, `jl_recon.model_selection.research`,
  `jl_recon.model_selection.prototype`,
  `jl_recon.model_selection.quiz_requirements`,
  `jl_recon.model_selection.quiz_understanding`, `jl_recon.model_selection.learn`,
  `jl_recon.model_selection.prerequisite` — applied at delegated execution
  points (see "Requirements").
- **Labels:** `jl_recon.labels.default` and the per-type keys —
  `jl_recon.labels.map`, `jl_recon.labels.research`, `jl_recon.labels.prototype`,
  `jl_recon.labels.quiz_requirements`, `jl_recon.labels.quiz_understanding`,
  `jl_recon.labels.learn`, `jl_recon.labels.prerequisite` — applied when
  creating maps and tickets.
- **Title formats:** `jl_recon.title_format` with the per-type keys
  `title_format.map`, `title_format.research`, `title_format.prototype`,
  `title_format.quiz_requirements`, `title_format.quiz_understanding`,
  `title_format.learn`, `title_format.prerequisite`.

## Child Tickets

A map's children are planning work — Research, Prototype, Quiz and Task
tickets, or any ticket that produces decisions and findings rather than
implementation. Source-change work is added as **Implementation** tickets,
children of the inciting issue, while the map is still open, instead of
being inlined into map tickets.

If a ticket becomes unnecessary because the plan changes (a decision is
superseded, a scope is narrowed out), it is closed or removed — discuss
that with the user first.

## Early ticket creation (while the map is open)

Decisions that sharpen while walking a map become tickets promptly:

1. Pick the ticket type using the routing table above.
2. Fill the matching template from `jl-ticket-templates/assets/`.
3. Validate with `validateTicket(ticket, { provider, stage: "creation" })` from
   `jl-ticket-templates/validator.js` before creating.
4. Apply the configured labels: map labels + type labels + `recon:<type>`
   (see `references/PROVIDERS.md` and the label helpers).
5. Create tickets promptly under the inciting issue while the map is open.
   If a ticket becomes unnecessary because the plan changes, discuss its
   closure/removal with the user before acting.

## Requirements

The agent MUST:

- Confirm the destination and frontier through `jl-quiz` before
  creating the map (Chart mode) — never invent scope on the agent's own
  read of a loose request.
- Resolve `jl-config` before acting, validate the resolved `jl_recon`
  settings against jl-recon's schema, and apply its decision gates,
  uncertainty-tracking pattern, label configuration, and checks configuration at the workflow points they govern.
- Apply resolved `model_selection` values at delegated execution points
  (ticket delegation and Mode 2/Mode 3 checks), using deterministic precedence:
  explicit override → `model_selection.<action>` → `model_selection.default`
  → `jl_subagent_models` hierarchy.
- Ask whether an inciting issue exists before creating the map, and if one
  does, link the map to it as a native sub-issue (GitHub `--parent`) before
  creating any tickets. A comment or URL alone is not acceptable; see
  `scripts/create-recon-map.ps1`.
- Apply resolved label configuration when creating the map: use
  `labels.map` (or `labels.default` if not configured) as the map's labels.
- Apply resolved label configuration when creating each ticket: combine the
  ticket type's configured labels (e.g., `labels.quiz_requirements`) + inherited map labels
  (if the ticket is a child of a map) + the ticket's `recon:<type>` label.
  Labels are additive, not replacement — a ticket receives all three sets.
- Allow user session preference to override configured labels entirely (user
  session preference replaces config, not additive to it).
- Apply resolved checks configuration when running Mode 2 (Work through the map):
  if `checks.on_ticket_resolution_enabled` is true, run quality checks before
  recording ticket resolutions; otherwise skip checks and proceed directly.
- When running Mode 2 checks, use jl-subagent-spawning's fallback hierarchy (try
  subagent → try Herdr → read into session); handle unavailable checks gracefully
  by warning the user, keeping partial findings when available, and allowing
  proceed or override.
- Display Mode 2 check findings as a markdown table sorted by severity (critical → major → minor → nit),
  with columns: Severity | Check | Finding | Recommendation.
- Collect explicit user confirmation (approve/override/cancel) for each ticket resolution after
  quality checks are presented; never record a resolution without user decision.
- Apply resolved checks configuration when running Mode 3 (Report on implementation status):
  if `checks.on_status_report_enabled` is true, run quality checks on generated
  status reports; otherwise skip checks and proceed directly to report output.
- When running Mode 3 checks, use jl-subagent-spawning's fallback hierarchy (try
  subagent → try Herdr → read into session); handle unavailable checks gracefully
  by warning the user, keeping partial verification results when available, and allowing
  proceed or override.
- Display Mode 3 check findings as a markdown table sorted by verification risk
  (FABRICATION_RISK → DISPUTED → UNVERIFIED → PLAUSIBLE → VERIFIED),
  with columns: Claim | Status | Confidence | Sources.
- Collect explicit user confirmation (approve/override/cancel) for each status report
  publication after quality checks are presented; never publish a report without user decision.
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
- Notify the user when the current task is completed, and ask what to do next.

The agent MUST NOT:

- Fire this skill itself — it is user-invoked only. Suggesting it by name is
  fine; launching it is not.
- Create a map without asking whether an inciting issue exists, or leave a
  confirmed inciting issue unlinked once the map is created.
- Create a GitHub or Azure DevOps ticket without applying the resolved label
  configuration (map labels + ticket type labels + `recon:<type>`).
- Let a ticket's type change because a quiz or other detour occurred inside
  it — spin off a child ticket instead. A Quiz ticket that internally runs
  quiz-as-mechanism does not retype the ticket.
- Represent the same child-item information more than once on a map (a list,
  then a summary of that list, then a status table of the same items).
- Resolve more than one ticket in a single "work through the map" pass,
  except an approved AFK Research ticket.
- Archive or close a stale item without that specific item's human
  confirmation.
- "Commit changes during any map work (charting, exploring, or working through the map).
  Map work is planning and exploration; implementation happens separately under child
  implementation tickets."

## References

- [PROVIDERS.md](references/PROVIDERS.md) — how the map, tickets, inciting-
  issue links, label/tag inheritance, blocking, and assignee tracking are
  represented on GitHub, Azure DevOps, and markdown-only, including the
  current no-dedicated-field stance for Azure DevOps ticket typing.
- [LABEL-APPLICATION-HELPERS.md](references/LABEL-APPLICATION-HELPERS.md) —
  concrete implementation scripts for applying deterministic labels and tags
  to maps and tickets across providers. Agents use these scripts to implement
  the label resolution logic documented in PROVIDERS.md.
- [CONFIGURATION.md](references/CONFIGURATION.md) — `jl_recon` config schema,
  legacy aliases, resolved behaviour, and the warning catalog.
- [CORE_MODEL.md](references/CORE_MODEL.md) — Destination, Inciting issue,
  Map, Ticket, Fog of war, Frontier, and Out of scope definitions.
- [LIFECYCLE.md](references/LIFECYCLE.md) — Modes 1–4: Chart the map, Work
  through the map (incl. quality checks and delegation messaging), Report on
  implementation status, and Resolve or archive stale items.
- [ROUTING.md](references/ROUTING.md) — Recon ticket types (Research,
  Prototype, Quiz, Task).
- [TICKET_VALIDATION.md](references/TICKET_VALIDATION.md) — Research,
  Prototype, and Task ticket validation, plus Map Ticket Validation.

## Assets

- `assets/recon-map-template.md` — markdown map template, extending
  `jl-plan-template`'s template, for markdown-provider maps.

## Scripts

- `scripts/apply-ticket-labels.ps1` — PowerShell script to apply deterministic
  labels to GitHub issues (implements label resolution for all platforms)
- `scripts/apply-ticket-labels.sh` — POSIX shell equivalent of
  `apply-ticket-labels.ps1` for Bash/sh environments
- `scripts/apply-ado-map-tags.ps1` — PowerShell script to apply deterministic
  tags to Azure DevOps map work items
- `scripts/apply-ado-ticket-tags.ps1` — PowerShell script to apply deterministic
  tags to Azure DevOps ticket work items (children of maps)
- `scripts/record-markdown-map-labels.ps1` — PowerShell script to record
  deterministic labels in markdown map YAML frontmatter
- `scripts/record-markdown-ticket-labels.ps1` — PowerShell script to record
  deterministic labels in markdown ticket YAML frontmatter
