# Ticket Template Assets

These assets provide reusable templates for new Recon ticket types and provider payloads.

## Provider Templates

The GitHub Recon payload uses native issue metadata and a readable Details list. Do not copy YAML frontmatter into a GitHub issue body.

- `github-issue-template.json` — generic GitHub issue payload example.
- `github-recon-ticket-template.json` — GitHub mapping for shared Recon ticket fields.
- `azure-devops-template.json` — existing Azure DevOps work item payload example.

## Ticket Templates

New Markdown tickets use shared YAML frontmatter and one type-specific template:

- `map-ticket-template.md` — new Map tickets.
- `research-ticket-template.md` — new Research tickets.
- `prototype-ticket-template.md` — new Prototype tickets.
- `quiz-requirements-ticket-template.md` — new Requirements Quiz tickets.
- `quiz-understanding-ticket-template.md` — new Understanding Quiz tickets.
- `learn-ticket-template.md` — new Learn tickets.
- `prerequisite-ticket-template.md` — new external or manual Prerequisite tickets.
- `quiz-ticket-template.md` and `task-ticket-template.md` — historical read-only templates.

## Usage

1. Select the new-ticket template that matches the ticket type.
2. Replace every placeholder with a real value.
3. Keep each acceptance criterion on a separate checklist line with sequential IDs.
4. Validate the ticket for its provider and stage before creating or resolving it.

The shared contract and validator API are defined in `../references/SHARED_BASE_SCHEMA.md` and `../validator.js`.
