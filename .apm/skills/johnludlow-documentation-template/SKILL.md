---
name: johnludlow-documentation-template
description: "Provides the canonical documentation template and structure for feature and API documentation stored in docs/. Use when creating or validating documentation with johnludlow-feature-documenter or johnludlow-documenter."
---

# Documentation Template

## Overview

This skill provides the canonical structure for feature and API
documentation produced by `johnludlow-feature-documenter` and
`johnludlow-documenter`. It exists so the documentation template is loaded
as an explicit skill dependency rather than a loosely referenced file.

## When to Use

Load this skill whenever creating or updating documentation destined for
`docs/`, or whenever validating that existing documentation follows the
expected structure.

## Template

The canonical documentation template lives at
[`assets/documentation-template.md`](./assets/documentation-template.md),
relative to this skill. Use it as the baseline for every new documentation
file:

1. Copy the structure of `assets/documentation-template.md` into the new
   documentation file.
2. Fill in Overview, Getting Started, and Detailed Guide sections based on
   the actual implementation — never invent behaviour the code does not
   have.
3. Include working code examples in the languages actually used by the
   feature (see `assets/documentation-template.md` for the C#/TypeScript
   example pattern; substitute or add languages as needed).
4. Keep API Reference entries accurate to the current signatures — verify
   against the source rather than assuming.
5. Remove sections that genuinely do not apply (e.g. Performance
   Considerations for a feature with no meaningful performance profile)
   rather than leaving bracketed placeholders in the final document.

## Requirements

The agent MUST:

- Base every new documentation file on `assets/documentation-template.md`.
- Verify code examples and API references against the actual
  implementation before publishing.
- Ensure the finished document passes `rumdl check .`.
- Remove placeholder bracketed text (e.g. `[Feature 1]`) before treating a
  section as complete.
- Support hierarchical documentation (a summary document linking to child
  documents) for features large enough to need it.

The agent MUST NOT:

- Invent a different documentation structure when this template already
  covers the need.
- Document behaviour that does not match the current implementation.
- Leave placeholder text in a document presented to the user as finished.

## Relationship to Other Skills

- Use `johnludlow-markdown-standards` for general markdown formatting rules
  that apply on top of this template's structure.
- Use `johnludlow-code-quality` when documenting code examples, to ensure
  examples reflect the project's actual coding standards.
