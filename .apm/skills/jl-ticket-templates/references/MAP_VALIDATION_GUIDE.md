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

## Criterion Owner Links

Each Map criterion needs an owner link in its AC text. Write the owner type, then the link:
`AC001: Resolve the import format. Research: #12`.

- **Owner types:** Research, Prototype, Quiz (Requirements), Quiz (Understanding), Learn, or Prerequisite.
  An Implementation ticket cannot own a Map criterion, and no Implementation ticket sits under a Map.
- **Link format:** GitHub uses `#nnn` or a Markdown link. Azure DevOps uses `#nnn` (or `AB#nnn`) or a Markdown link.
  Local Markdown Maps use a Markdown link.
- **Decision only:** Add `(decision only)` to a criterion that needs no owner.
- **No owner yet:** List the criterion ID in Not Yet Specified (Fog of War), with a **what** or **how** tag.
  The validator warns (`map_criterion_owner_pending`) at creation and errors (`map_criterion_owner_missing`) at resolution.
  An unlisted, unowned criterion is an error at creation.
- **Closed or deleted owner:** If the owner ticket is closed or deleted and the criterion is unchecked,
  the validator flags it for re-review (`map_owner_review_required`). It is a warning before resolution and an error at resolution.
  Pass the owner states in `options.ownerStates` (`{ "#12": "closed" }`).
  The user may override: pass `options.ownerReviewOverrides` with `{ id, userApproved: true, reason, approvedAt }`.
  The override turns the error into a `map_owner_review_overridden` warning.
- **Extra links (not validated):** The validator checks only the link in the AC text.
  The caller also creates a typed link when both items are in a provider with typed links (Azure DevOps predecessor/successor).
  The caller creates a simple link when the items are in different providers or the provider has only simple links.
- **Historical Maps:** Maps read at the `read` stage with historical status values are never checked.

Creating the owner ticket alone does not satisfy the criterion.

## Resolution Contract

Record each decision once, identify remaining fog, and confirm the frontier and
blocking edges are current. Confirm each acceptance criterion and that the
destination is met or has a delivery plan.

Require user acceptance and the shared AC-before-close review before setting status to `Done`.

An untagged Fog of War item is invalid: give each unknown a **what** or
**how** tag.

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
| `map_criterion_owner_missing`, `map_criterion_owner_type_missing`, `map_criterion_owner_link_invalid` | Add `Type: link` to the criterion, mark it `(decision only)`, or (before resolution) list it in Fog of War. |
| `map_criterion_owner_implementation` | Use a non-Implementation owner. |
| `map_owner_review_required` | Re-review the criterion, or record a user override. |

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
