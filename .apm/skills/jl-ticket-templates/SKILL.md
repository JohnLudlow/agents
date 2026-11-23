---
name: jl-ticket-templates
description: "Shared Recon ticket contracts and validators. Load when creating, resolving, or reviewing tickets."
---

# Ticket Templates

This skill owns shared Recon ticket contracts, templates, provider mappings, and validators.
It does not choose workflows or create provider tickets.

## New Ticket Types

New tickets use `map`, `research`, `prototype`, `quiz-requirements`,
`quiz-understanding`, `learn`, or `prerequisite`. Legacy `quiz` and `task`
types are read-only.

Load `references/SHARED_BASE_SCHEMA.md` and the matching template from
`assets/`. Type-specific rules are in the linked reference guides.

## Validation

Import `validator.js` from this directory. Call
`validateTicket(ticket, { provider, stage })` before creation or resolution.
Supported providers are `github` and `markdown`. Use
`validateTemplate(template, platform)` for existing provider payload checks.

The stages are:

- `creation` checks shared fields, provider representation, type sections, and acceptance criteria.
- `resolution` adds type-specific findings, evidence, and user-acceptance checks.
- `read` preserves historical `quiz`, `task`, and Map status values without migration.

Stop when `valid` is false and report the first actionable error.

Each Map criterion links its owner ticket in the AC text (`Research: #12`) or is marked `(decision only)`. Implementation tickets cannot own Map criteria. See `references/MAP_VALIDATION_GUIDE.md`.

A GitHub Map with only Map-content errors may follow the limited override in `references/MAP_VALIDATION_GUIDE.md`. Correct all other errors.

## Acceptance-Criteria Review

New criteria use one checklist item per independently checkable outcome. Give each item a unique, sequential ID that starts with `AC001:`.

Before closing, review criteria one at a time in ticket order. Show its
evidence and linked owner. Invite the user to identify missing requirements.
After explicit confirmation, record the decision and source in a separate
issue comment. Check the criterion only after the comment exists.

Use `getNextAcceptanceCriterion(criteria, rescope)` to select the next
unchecked item that has not been re-scoped.
Use `validateClosureReadiness(criteria, rescope)` to check review order,
invitation, owner, evidence, confirmation, and comment order. `rescope` is
an array of explicit approvals, one for each re-scoped `AC` ID; it does not
exempt any other criterion.
Keep the ticket open while any criterion is unmet unless the user approves
a documented re-scope. A follow-up ticket alone does not satisfy a criterion.

## Lifecycle

New tickets use `Draft`, `Ready`, `In Progress`, `Done`, or `Blocked`.
Call `validateStatusTransition(from, to, details)` to check transitions.
A blocked ticket needs a named blocker and reason. Return it to `Ready` only
after the blocker is confirmed clear. To move to `Done`, pass the reviewed
`criteria` and any per-criterion `rescope` records in `details`. A deferred
check stays open.

## Provider Representation

GitHub issues use native title, creator, date, parent, links, and labels.
Put other fields in a readable Details list. Do not start the body with YAML.

Local Markdown uses YAML frontmatter with the shared logical fields and an ISO date.

Azure DevOps payloads continue to use their provider fields and the existing generic payload validator. The caller maps shared ticket fields before validation.

## Public API

- `validateTemplate(template, platform)` validates provider payload structure.
- `validateTicket(ticket, { provider, stage, titleFormat? })` validates shared and type-specific ticket content. Creation also checks the title.
- `validateTitleFormat(type, title, overrides?)` checks a new title against the default or configured pattern. Do not use it on historical tickets.
- `validateCreationOverride(validation, decision, audit?)` authorizes a Map-content exception; call it again after posting the issue comment.
- `validateAcceptanceCriteria(markdown)` validates checklist structure and ID sequence.
- `validateStatusTransition(from, to, details)` validates lifecycle transitions.
- `getNextAcceptanceCriterion(criteria)` selects one unchecked criterion.
- `validateClosureReadiness(criteria, rescope)` validates the closure evidence.

Results contain `valid`, structured `errors`, and `warnings`. Errors include a stable code, path, and message.
`allowed` from an override is not the same as `audited`; only audited overrides complete the creation workflow.

## References

- `references/SHARED_BASE_SCHEMA.md` — shared fields, lifecycle, provider mapping, criteria review, and API contract.
- `references/MAP_VALIDATION_GUIDE.md` — Map creation and resolution rules.
- `references/RESEARCH_VALIDATION_GUIDE.md` — Research creation and resolution rules.
- `references/PROTOTYPE_VALIDATION_GUIDE.md` — Prototype creation and resolution rules.
- `references/QUIZ_VALIDATION_GUIDE.md` — Requirements and Understanding Quiz rules.
- `references/LEARN_VALIDATION_GUIDE.md` — Learn ticket rules.
- `references/PREREQUISITE_VALIDATION_GUIDE.md` — external and manual prerequisite rules.
- `references/TASK_VALIDATION_GUIDE.md` — historical Task compatibility only.
- `references/VALIDATION_TEST_GUIDE.md` — focused test coverage.
- `assets/README.md` — templates and provider payload assets.
