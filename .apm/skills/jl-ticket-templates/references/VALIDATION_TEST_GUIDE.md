# Validation Test Guide

Run the focused suite with `npm run test:ticket-templates`.

The suite uses Node's built-in test runner.

## Automated Cases

- Map creation and resolution: status compatibility, both provider renderings, a filled template, and Map-specific sections.

- Limited GitHub Map creation overrides: approval, eligible errors, and rejection of mixed or structural errors.

- Override audit: a separate issue comment tied to the created issue, recorded after approval and creation.

- Shared criteria: checklist format, ID order, closure comments, user confirmation, and individual re-scoping.

- Research creation versus resolution evidence and user acceptance; Requirements Quiz confirmation, open questions, and labels.

- Prototype and Learn creation; Learn check skip; Understanding Quiz defer; external-only Prerequisite scope.

- Historical Quiz and Task reads; provider metadata and Markdown frontmatter examples.

## Checks That Need Human Review

The validator does not judge whether an AC describes one independent outcome. It catches only known generic destination text.

Users must check other vague goals and compare Map blocker links with provider relationships.

The other shortened type guides retain their key requirements but lost some negative examples and override descriptions.

Neutral Research questions, bounded Prototype questions, and detailed checkability remain documented expectations, not exhaustive semantic checks.

Do not treat this suite as proof that all seven type-specific contracts are mechanically enforced.

The existing Pester and Bats suites cover label helpers. Run `npm run validate` after changing shipped skills.

Creation overrides are limited to GitHub Map-content errors; see `MAP_VALIDATION_GUIDE.md`.
