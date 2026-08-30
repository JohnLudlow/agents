---
name: jl-ticket-templates
description: "Reusable ticket template and validator infrastructure for structured ticket creation across GitHub Issues, Azure DevOps work items, and similar providers. Use when another skill needs to load predefined ticket templates, validate template shape, or apply a shared template contract before creating or updating provider-native work items."
---

# Ticket Templates

## Overview

This skill provides the reusable ticket-template infrastructure that
`jl-recon` and `jl-issue-management` depend on when they need structured
ticket creation.

It exists to centralize three things:

- **validator** logic and contracts for template shape validation
- **template** assets for provider-specific ticket skeletons
- **infrastructure** guidance for loading, validating, and reusing templates
  consistently across skills

Use this skill when you need to:

- validate a ticket template before using it
- load a predefined template from `assets/`
- apply a shared ticket structure across multiple providers

This skill provides infrastructure. It does not decide whether a ticket
should be created, who should create it, or which provider should be used.
Those decisions belong to the calling skill.

## When to Use This Skill

Load this skill when another skill or agent needs one of these behaviors:

- **validator** — check that a template contains the required fields and
  platform metadata before ticket creation
- **template** — load a predefined GitHub Issue or Azure DevOps work item
  template from `assets/`; includes templates for quiz, research, and prototype tickets
- **ticket schema** — reference the shared base schema that all tickets
  (quiz, research, prototype, task, map) inherit from; documented in
  `references/SHARED_BASE_SCHEMA.md`
- **infrastructure** — reuse the same template contract across
  `jl-recon`, `jl-issue-management`, or future ticket-producing skills

Do not load this skill for general markdown planning or repository
configuration. It is specifically for ticket-template structure and
validation.

## Usage Patterns

### Pattern 1: Importing the validator

Calling skills should treat this skill as the source of truth for
ticket-template validation.

Recommended flow:

1. Load `jl-ticket-templates`.
2. Read the chosen template from `assets/`.
3. Validate the template against the contract documented below.
4. Stop and report errors if validation fails.
5. Only then transform the template into provider-native payloads.

Example pseudocode:

```text
load skill "jl-ticket-templates"
template = read("assets/github-issue-template.json")
result = validateTemplate(template, context)

if result.valid is false:
  report result.errors
  stop

payload = mapTemplateToProvider(template, provider)
createOrUpdateTicket(payload)
```

### Pattern 2: Loading templates from `assets/`

Templates in `assets/` are static source material. Treat them as canonical
examples or reusable starting points.

Recommended rules:

- load templates by relative path within this skill
- preserve required fields from the canonical structure
- allow the caller to fill runtime values such as title, body, labels,
  assignee, area, or iteration path
- re-validate after filling placeholders if the filled result changes shape

Example asset references:

- `./assets/github-issue-template.json`
- `./assets/azure-devops-work-item-template.json`

If additional provider templates are added later, they should follow the same
canonical structure documented in this file.

### Pattern 3: Validation contract

The validator contract is intentionally simple and portable.

#### Input

- one template object
- optional validation context from the caller, such as target provider,
  allowed placeholder names, or template purpose

#### Output

- one validation result object
- zero or more structured errors
- optional warnings for non-blocking issues

Skills that consume this validator should treat `valid: false` as a hard stop.

## Validator API

## Public interface

The validator module should expose a small public interface:

- `validateTemplate(template, context?)`
- `validateTemplateForProvider(template, provider, context?)`
- `formatValidationErrors(errors)`

The exact implementation language may vary. The public contract should not.

### Input contract

A template must be an object with enough structured data to produce a
provider-native ticket.

Required top-level data:

- `platform` — target system identifier such as `github_issue` or
  `azure_devops_work_item`
- `kind` — ticket kind such as `map`, `task`, `research`, `bug`, or
  `feature_request`
- `title` — string or placeholder-backed string
- `body` — string or structured body representation that the caller can render
- `fields` — object containing provider-specific structured fields

Recommended top-level data:

- `summary` — short human-readable explanation of the template's purpose
- `labels` — array of label or tag strings
- `metadata` — object for provenance, versioning, or compatibility markers
- `placeholders` — object or array documenting required runtime substitutions

Validation rules:

- required keys must exist
- values must be the expected type
- provider-specific required fields must exist inside `fields`
- placeholders must be declared consistently if the template relies on them
- unknown extra keys may be allowed, but they must not replace required keys

### Output contract

Validation should return a structured result like this:

```text
{
  valid: boolean,
  errors: [
    {
      code: string,
      path: string,
      message: string
    }
  ],
  warnings: [
    {
      code: string,
      path: string,
      message: string
    }
  ]
}
```

Output expectations:

- `valid` is `true` only when there are no blocking errors
- `errors` contains machine-checkable failures
- `warnings` contains non-blocking guidance
- `path` points to the failing field using a stable dotted path

### Pseudocode example

```text
function validateTemplate(template, context):
  errors = []
  warnings = []

  if template is not an object:
    errors.add({
      code: "root_type",
      path: "$",
      message: "template must be an object"
    })
    return { valid: false, errors: errors, warnings: warnings }

  requireString(template.platform, "platform", errors)
  requireString(template.kind, "kind", errors)
  requireString(template.title, "title", errors)
  requireBody(template.body, "body", errors)
  requireObject(template.fields, "fields", errors)

  if template.platform == "github_issue":
    requireArrayOfStrings(template.fields.labels, "fields.labels", warnings)

  if template.platform == "azure_devops_work_item":
    requireString(template.fields.workItemType, "fields.workItemType", errors)

  validatePlaceholders(template, context, errors, warnings)

  return {
    valid: errors.length == 0,
    errors: errors,
    warnings: warnings
  }
```

## Template Structure

## Canonical structure

Every template should follow this canonical shape:

```json
{
  "platform": "github_issue",
  "kind": "task",
  "summary": "Short explanation of when to use this template",
  "title": "[Task] {short_name}",
  "body": "## Goal\n...\n## Scope\n...",
  "labels": ["planning"],
  "placeholders": {
    "short_name": "Required short title fragment"
  },
  "fields": {},
  "metadata": {
    "version": 1
  }
}
```

### Field requirements

| Field | Required | Type | Notes |
| --- | --- | --- | --- |
| `platform` | Yes | string | Provider identifier such as `github_issue` or `azure_devops_work_item` |
| `kind` | Yes | string | Logical ticket kind used by the calling skill |
| `summary` | No | string | Human explanation of template intent |
| `title` | Yes | string | Final or placeholder-backed title |
| `body` | Yes | string or object | Renderable ticket body |
| `labels` | No | array of strings | Cross-provider labels/tags before mapping |
| `placeholders` | No | object or array | Runtime substitution contract |
| `fields` | Yes | object | Provider-specific required and optional fields |
| `metadata` | No | object | Versioning, provenance, compatibility |

### GitHub Issues example

```json
{
  "platform": "github_issue",
  "kind": "feature_request",
  "summary": "Template for a provider-native GitHub Issue",
  "title": "[Feature] {feature_name}",
  "body": "## Problem\n{problem}\n\n## Proposed Outcome\n{outcome}",
  "labels": ["enhancement", "planning"],
  "placeholders": {
    "feature_name": "Short feature label",
    "problem": "Problem statement",
    "outcome": "Desired outcome"
  },
  "fields": {
    "labels": ["enhancement", "planning"],
    "assignees": [],
    "milestone": null
  },
  "metadata": {
    "version": 1
  }
}
```

GitHub-specific expectations:

- `fields.labels` should be an array when present
- `fields.assignees` may be empty but must be an array if present
- the caller is responsible for mapping body text into GitHub Issue markdown

### Azure DevOps work item example

```json
{
  "platform": "azure_devops_work_item",
  "kind": "task",
  "summary": "Template for an Azure DevOps work item",
  "title": "[Task] {work_item_name}",
  "body": "## Context\n{context}\n\n## Acceptance Criteria\n{acceptance_criteria}",
  "labels": ["planning", "task"],
  "placeholders": {
    "work_item_name": "Short work item title",
    "context": "Background context",
    "acceptance_criteria": "Definition of done"
  },
  "fields": {
    "workItemType": "Task",
    "areaPath": "{area_path}",
    "iterationPath": "{iteration_path}",
    "tags": ["planning", "task"]
  },
  "metadata": {
    "version": 1
  }
}
```

Azure DevOps-specific expectations:

- `fields.workItemType` is required
- `fields.areaPath` and `fields.iterationPath` may be placeholders
- `fields.tags` may be represented as an array in the template even if the
  provider payload later serializes them differently

## Configuration

This skill provides infrastructure but does not require repository
configuration of its own.

Other skills may configure how they choose providers, labels, destinations,
or approval gates, but those settings belong to the consuming skill rather
than to `jl-ticket-templates`.

Recommended integration pattern:

1. The caller resolves its own configuration through `jl-config`.
2. The caller chooses the provider and template kind.
3. The caller loads a matching template from this skill.
4. The caller validates the template using this skill's contract.
5. The caller performs provider-specific creation or update steps.

If a future version adds configurable template-selection behavior, document
that behavior in this section and keep the validation contract stable.

## References

- `assets/` — canonical provider template assets for reuse by other skills
- `assets/quiz-ticket-template.md` — the quiz ticket type template; copied by
  jl-quiz when creating new quiz decisions
- `assets/research-ticket-template.md` — the research ticket type template;
  copied by jl-recon when creating new research tickets
- `assets/prototype-ticket-template.md` — the prototype ticket type template;
  copied by jl-recon when creating new prototype tickets
- `references/SHARED_BASE_SCHEMA.md` — the inherited base frontmatter,
  acceptance-criteria format, and common sections all ticket types (quiz,
  research, prototype, task, map) use; referenced by type-specific templates
- `references/QUIZ_VALIDATION_GUIDE.md` — integration guidance for jl-quiz:
  how to validate quiz tickets before creation, error messages, and user
  override flow
- `references/RESEARCH_VALIDATION_GUIDE.md` — integration guidance for jl-recon:
  how to validate research tickets before creation, error messages, and user
  override flow
- `references/PROTOTYPE_VALIDATION_GUIDE.md` — integration guidance for jl-recon:
  how to validate prototype tickets before creation, error messages, and user
  override flow
- `references/` — detailed validation rules, template schemas, and extension
  guidance for future providers
- `./assets/github-issue-template.json` — GitHub Issue template asset
- `./assets/azure-devops-work-item-template.json` — Azure DevOps work item
  template asset
- `./references/TEMPLATE_SCHEMA.md` — detailed canonical template schema
- `./references/VALIDATION_RULES.md` — validator rules and error taxonomy

## Completion standard

This skill is documented well enough when:

- another skill can load a template from `assets/` without guessing the path
- another skill can validate a template without guessing the contract
- GitHub Issues and Azure DevOps examples both match the canonical structure
- configuration ownership is clearly delegated to consuming skills
