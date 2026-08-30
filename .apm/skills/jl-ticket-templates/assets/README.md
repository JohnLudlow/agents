# Ticket Template Assets

These assets provide reusable ticket-definition templates for skills that
need to create or normalize issue payloads for external platforms.

## What These Templates Are For

Each template captures a minimal, portable ticket shape for one platform.
Skills can load the matching asset, substitute placeholder values such as
`{title}` or `{description}`, then map the result into provider-specific API
calls.

## How Other Skills Use These Templates

Other skills should treat these files as canonical examples for
platform-specific ticket payloads:

1. Select the asset for the destination platform.
2. Replace placeholder tokens like `{title}` with real values.
3. Validate required fields against the `fields` metadata before sending the
   payload.
4. Add provider-specific fields only when the target workflow needs them.

## Common Template Structure

All platform templates should follow the same core structure:

- `platform`: Stable platform identifier, such as `github` or
  `azure-devops`
- `name`: Human-readable template name
- Provider payload fields such as `title`, `body`, `description`, or `type`
- `fields`: Validation metadata describing expected dynamic inputs

The `fields` object should describe constraints using plain metadata:

- `type`: Expected value type
- `required`: Whether the field must be provided
- `minLength` or `maxLength`: String length constraints
- `enum`: Allowed values for fixed-choice fields

Use placeholder syntax like `{field_name}` for dynamic values. Keep field
names descriptive and close to the target platform vocabulary.

## Included Templates

- `github-issue-template.json` — baseline GitHub issue payload example
- `azure-devops-template.json` — baseline Azure DevOps work item payload
  example
- `quiz-ticket-template.md` — markdown template for quiz tickets (decisions
  with options and reasoning); inherits from shared base schema
- `research-ticket-template.md` — markdown template for research tickets
  (investigations with evidence and findings); inherits from shared base schema

## How to Add a New Platform Template

1. Create a new JSON file in this `assets/` directory named for the
   platform, such as `jira-template.json`.
2. Add a `platform` identifier and a clear `name`.
3. Define the provider payload using placeholder values like `{title}` and
   `{body}`.
4. Add a `fields` object describing every dynamic field's constraints.
5. Keep the template minimal and platform-agnostic unless the provider
   requires a platform-specific field.
6. Update this README to list the new template and explain any notable
   platform differences.

## Notes for Skill Authors

These assets are examples and reusable defaults, not a complete schema
system. If a consuming skill needs richer validation or field mapping, keep
that logic in the skill and preserve these files as simple reference assets.
