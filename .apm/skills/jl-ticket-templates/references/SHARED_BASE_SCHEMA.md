# Shared Ticket Contract

This contract defines the shared fields, lifecycle, provider mapping, and acceptance-criteria rules for new Recon tickets.

The contract applies to new tickets. Historical GitHub issues and Markdown tickets remain readable without migration or relabeling.

## Ticket Types

New Recon tickets use one of these types:

- `map`
- `research`
- `prototype`
- `quiz-requirements`
- `quiz-understanding`
- `learn`
- `prerequisite`

The old `quiz` and `task` types are read-only legacy types. Do not use them when creating new tickets.

## Shared Logical Fields

Each new ticket has these logical fields:

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `title` | string | Yes | Short, descriptive ticket title |
| `description` | string | Yes | One-line summary of the work |
| `type` | enum | Yes | One of the new ticket types above |
| `status` | enum | Yes | `Draft`, `Ready`, `In Progress`, `Done`, or `Blocked` |
| `author` | string | Yes | Ticket creator or owner |
| `date` | string | Yes | Creation date in `YYYY-MM-DD` format |
| `related_links` | string | Yes | Comma-separated links, or an empty string |
| `parent` | string | Yes | Parent link, or an empty string |

## Provider Representation

Use the provider's representation for each field. Do not put YAML frontmatter in every provider body.

### GitHub Issues

- Use the native issue title, creator, and creation date.
- Use GitHub's parent sub-issue relationship and issue links.
- Apply the configured labels and the required `recon:<type>` label.
- Put non-native planning fields, including `description` and `status`, in a readable `## Details` list.
- Keep the issue body in Markdown and do not put a raw YAML block at its start.

### Local Markdown

Use YAML frontmatter with the shared logical fields. Use an ISO date and an empty string when `related_links` or `parent` has no value.

### Azure DevOps

Use the existing Azure DevOps fields required by `validateTemplate`.
Map shared fields before validation. Do not put Markdown frontmatter in descriptions.

## Status Lifecycle

New tickets use `Draft`, `Ready`, `In Progress`, `Done`, or `Blocked`.

Allowed transitions are:

| From | To | Condition |
| --- | --- | --- |
| `Draft` | `Ready` | Creation checks pass |
| `Ready` | `In Progress` | Work starts |
| `Ready` or `In Progress` | `Blocked` | Record a named blocker and reason |
| `Blocked` | `Ready` | Confirm that the blocker is clear |
| `In Progress` | `Done` | Resolution checks pass and the user approves |

A deferred check stays open in `Ready` or `In Progress`. Record a user-chosen skip with its reason. Close GitHub issues only after status becomes `Done`.

For `In Progress` to `Done`, pass reviewed `criteria` and individually approved `rescope` entries to `validateStatusTransition`.

It calls `validateClosureReadiness`. A boolean flag cannot replace review evidence.

Historical Maps with `Charting`, `Walked`, `Completed`, or `Stale` remain unchanged and readable.

## Title Format

New tickets follow one default title pattern per type. `validateTitleFormat`
checks the literal prefix and that the variable part is not empty.

| Type | Config key | Default pattern |
| --- | --- | --- |
| `map` | `map` | `Map: {destination}` |
| `research` | `research` | `Research: {topic}` |
| `prototype` | `prototype` | `Prototype: {concept}` |
| `quiz-requirements` | `quiz_requirements` | `Quiz (Requirements): {question}` |
| `quiz-understanding` | `quiz_understanding` | `Quiz (Understanding): {question}` |
| `learn` | `learn` | `Learn: {topic}` |
| `prerequisite` | `prerequisite` | `Prerequisite: {work}` |

- A `jl_recon.title_format.<key>` override replaces the default for that key.
  It must be a non-empty string with one `{variable}` placeholder. Otherwise use the default.
- Pass the override object as `titleFormat` in `validateTicket` options.
- Check titles at creation only. Never check historical tickets, and never rewrite them.
- The retired `quiz` and `task` keys are not aliases.

## Validation Stages

### Creation

Check provider identity, parent, question or destination, scope, and criteria.
Require at least three criteria, or five for Maps. Do not require findings or
outcomes before work starts.

### Resolution

Check type-specific findings, decisions, evidence, and outcomes. Require user
acceptance where the type requires it. For an approved skip, validate the
choice and reason instead of requiring nonexistent results. A deferred check
remains open.

### Historical Read

Read legacy `quiz` and `task` tickets and historical Map statuses without
rewriting them. Reject legacy types at creation and resolution.

## Acceptance-Criteria Format

Each acceptance criterion describes one checkable outcome. Put each on its own
checklist line. Use unique, sequential, zero-padded IDs starting at `AC001:`.

```markdown
## Acceptance Criteria

- [ ] AC001: The shared schema lists all required logical fields.

- [ ] AC002: The validator accepts valid Markdown frontmatter.

- [ ] AC003: The validator rejects duplicate criterion IDs.
```

The validator checks the checklist shape, ID sequence, and unique IDs. Authors must also check that each item describes only one outcome.

## Review Before Closure

Review criteria one at a time, in ticket order. Show evidence and the linked
owner for each. Invite the user to identify missing requirements before asking
for a decision.

After user confirmation, add an issue comment that records the decision and
source. Check the criterion only after the comment exists. A follow-up ticket
alone does not satisfy its criterion.

Keep the ticket open while any criterion is unmet. A re-scope identifies
each affected AC by ID, records its individual user approval, reason, and
issue comment, and leaves all other criteria subject to normal checks.
Close only when all criteria are checked or individually re-scoped.

For Map criteria, the AC text itself links the owner ticket, for example
`AC001: Resolve the format. Research: #12`. See `MAP_VALIDATION_GUIDE.md`.

Callers use `getNextAcceptanceCriterion(criteria, rescope)` and `validateClosureReadiness` to
implement this process. A criterion needs an invitation, explicit
confirmation, evidence, linked owner, and source-comment URL in order. The
caller owns the conversation and provider write.
Call `validateClosureReadiness(criteria, rescope)` with an array of
`{ id, userConfirmed, reason, userConfirmedAt, sourceCommentUrl, sourceCommentAt }`
entries for re-scoped criteria; no approval exempts an unrelated criterion.

## Validator API

`validator.js` keeps `validateTemplate(template, platform)` for provider payloads. It also exports:

- `validateTicket(ticket, { provider, stage, titleFormat? })` for creation, resolution, and historical reads. Creation also checks the title.
- `validateTitleFormat(type, title, overrides?)` for the title contract; see Title Format above.
- `validateAcceptanceCriteria(markdown)` for checklist shape and sequential IDs.
- `validateStatusTransition(from, to, details)` for lifecycle checks.
- `validateCreationOverride(validation, decision, audit?)` for a limited, auditable GitHub Map creation exception; see `MAP_VALIDATION_GUIDE.md`.
- `getNextAcceptanceCriterion(criteria)` to select one unchecked item at a time.
- `validateClosureReadiness(criteria, rescope)` to require confirmation, evidence, ownership, and source-comment ordering.

Validation results contain `valid`, structured `errors`, and `warnings`. Callers must stop when `valid` is false.
