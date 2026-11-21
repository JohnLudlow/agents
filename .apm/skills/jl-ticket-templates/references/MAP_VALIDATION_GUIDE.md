# Map Validation Guide

Use `SHARED_BASE_SCHEMA.md` for shared fields and lifecycle. Validate new Maps at creation and resolution.

Read historical Maps without changing their statuses or labels.

## Creation Contract

New Maps use `Draft`, `Ready`, `In Progress`, `Done`, or `Blocked`. GitHub uses native metadata and a readable Details list.

Local Markdown uses YAML frontmatter.

Require Destination, Notes, Decisions So Far, Fog of War, Out of Scope, both ticket sections, and Acceptance Criteria.

- **Destination:** Name a specific outcome, such as "Deliver an import flow with documented error handling." Generic text such as "Improve the system" fails.

- **Notes:** Record the context and constraints, such as "The existing API handles imports."

- **Decisions So Far:** Link each recorded decision to its ticket. If none are recorded, say why: "No decisions yet; charting is in progress."

- **Fog of War:** Tag each item **what** or **how**. For example, "- API limits — **how** (needs research)." Explain an empty list.

- **Out of Scope:** List exclusions or explain why none are known yet.

- **Open Tickets (Frontier):** Use `Ticket`, `Type`, `Assignee`, and `Status` columns or explain an empty table. Status is `Draft`, `Ready`, or `In Progress`.

- **Blocked Tickets:** Use `Ticket`, `Type`, `Blocked by`, and `Reason` columns or explain an empty table. No Status column is required.

- **Acceptance Criteria:** Provide at least five individually checkable `AC001:`-style items with sequential IDs.

Review the five Map outcomes with the user: decisions, blocking edges, frontier, fog and scope, and destination or delivery plan.

The validator checks count and format, not whether the criteria cover these outcomes or are independently checkable.

For populated tables, use Markdown headers and a separator row. Leave Assignee empty if unassigned.

New ticket types are Map, Research, Prototype, Requirements Quiz, Understanding Quiz, Learn, and Prerequisite.

Historical Quiz and Task records remain readable. Compare the Blocked Tickets table with the provider's actual blocker links.

```markdown
## Open Tickets (Frontier)

| Ticket | Type | Assignee | Status |
| --- | --- | --- | --- |
| [Import schema](https://example.com/issues/3) | Research | @alice | Ready |

## Blocked Tickets

| Ticket | Type | Blocked by | Reason |
| --- | --- | --- | --- |
| [Import tests](https://example.com/issues/4) | Research | [Import schema](https://example.com/issues/3) | Waiting for the schema. |
```

## Resolution Contract

Confirm decisions, fog, links, frontier, and blockers are current. Confirm that the destination is met or has a delivery plan.

Require user acceptance and the shared AC-before-close review before setting status to `Done`.

## Errors and Remediation

Report one actionable error at a time with its `code`, `path`, and message. Show a correct example.

A missing required section or shared field is a structural error and cannot be overridden.

| Error code | Remedy |
| --- | --- |
| `map_destination_vague` | Replace a generic goal with a concrete target outcome. |
| `map_decisions_empty_note_missing`, `map_decision_link_missing` | Explain why decisions are absent, or link each decision to its ticket. |
| `map_fog_empty_note_missing`, `map_fog_tag_missing` | Explain why no fog is known, or tag every item **what** or **how**. |
| `map_scope_empty_note_missing` | List exclusions or explain why none are known. |
| `map_table_empty_note_missing`, `map_table_columns`, `map_table_row` | Add an explicit none note or repair the Markdown table structure. |
| `map_frontier_status_invalid` | Move blocked tickets to Blocked Tickets; use a current open status on the frontier. |
| `map_blocker_missing`, `map_block_reason_missing` | Name the blocking ticket and state why it blocks the work. |

## Limited Creation Override

Use `validateCreationOverride` only for a GitHub Map with exclusively Map-content errors in its allowlist.

Shared fields, type, status, required sections, AC count, and AC format remain mandatory.

An override never bypasses the AC-before-close gate.

1. Show each failed check and ask for explicit user approval and a reason. Call `validateCreationOverride` with that decision. If not `allowed`, fix the Map.

2. If authorized, create the issue with findings visible. Add a **separate issue comment** naming each error code, approval, and reason.

3. Call `validateCreationOverride` again with the actual issue URL, creation time, comment URL, comment time, and body. Only `audited: true` completes creation.

If the comment fails, leave the issue open and mark it **override audit pending**. Repair the comment before reporting completion.

For local Markdown Maps, correct the content instead of using an issue-comment override.

Re-scoping during resolution requires a separate user decision for each affected AC.

## Focused Regression Cases

The Node suite checks Map status compatibility, both provider formats, destination clarity, Notes, decision links, fog tags, tables, blockers, and overrides.

Subjective clarity and cross-ticket relationships require user review.
