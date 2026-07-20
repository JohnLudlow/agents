---
name: johnludlow-plan-template
description: "Provides the canonical plan document template and structure for feature plans stored in docs/plans/. Use when creating or validating a plan document with johnludlow-feature-planner or johnludlow-planner."
---

# Plan Template

## Overview

This skill provides the canonical structure for feature plan documents
produced by `johnludlow-feature-planner` and `johnludlow-planner`. It exists
so the plan template is loaded as an explicit skill dependency rather than a
loosely referenced file, and so the template can carry its own guidance
alongside the structure itself.

## When to Use

Load this skill whenever creating or updating a markdown plan document
destined for `docs/plans/`, or whenever validating that an existing plan
document follows the expected structure.

## Template

The canonical plan template lives at
[`assets/plan-template.md`](./assets/plan-template.md), relative to this
skill. Use it as the baseline for every new plan document:

1. Copy the structure of `assets/plan-template.md` into the new plan file.
2. Replace the YAML frontmatter placeholders (`title`, `description`,
   `author`, `date`, `status`) with real values.
3. Fill in every section relevant to the plan; remove sections that
   genuinely do not apply rather than leaving bracketed placeholders in the
   final document.
4. Keep the **Plan Target and Governance** section accurate — it records
   which provider the plan targets, the governing instructions, any session
   override, and the child-artifact strategy. See the
   `johnludlow-issue-management` skill for the vocabulary behind these
   fields.

## Requirements

The agent MUST:

- Base every new plan document on `assets/plan-template.md`.
- Preserve YAML frontmatter (`title`, `description`, `author`, `date`,
  `status`) on every plan document.
- Ensure the finished document passes `rumdl check .`.
- Remove placeholder bracketed text (e.g. `[Goal 1]`) before treating a
  section as complete.
- Keep the **Validation Checklist** section current as the plan develops.

The agent MUST NOT:

- Invent a different plan structure when this template already covers the
  need.
- Leave placeholder text in a document presented to the user as finished.

## Relationship to Other Skills

- Use `johnludlow-issue-management` to decide the plan target and provider
  before filling in the **Plan Target and Governance** section.
- Use `johnludlow-clarify-requirements` before drafting the plan when intent
  or scope is still fuzzy — a plan built on unresolved decisions will need
  rework.
- Use `johnludlow-markdown-standards` for general markdown formatting rules
  that apply on top of this template's structure.
