---
title: "[Decision: {decision_name}]"
description: "[Short summary of the decision being made]"
type: "quiz"
status: "Draft"
author: "[jl-quiz or agent name]"
date: "[YYYY-MM-DD]"
related_links: ""
parent: ""
---

# Decision: {decision_name}

This template is for **quiz tickets** — decisions that need structured
reasoning and multiple options considered before a conclusion is reached.

Use this template when:

- a decision affects implementation or planning scope
- multiple reasonable options exist and trade-offs matter
- reasoning should be recorded alongside the final choice
- other agents or future maintainers should understand why this decision was made

This template **inherits** from the shared ticket base schema documented in
`jl-ticket-templates/references/SHARED_BASE_SCHEMA.md`. See that document
for frontmatter fields, acceptance-criteria format, and common sections.

## Overview

[1-2 paragraph summary of the decision that needs to be made]

Example:
> This quiz evaluates whether to adopt strict mode in TypeScript. We need to
> decide between improved type safety and the overhead of retrofitting existing
> code. The decision will affect the development workflow and future contributor
> onboarding.

## Context

[Why this decision matters; what problem it solves or what consequence it prevents]

Example:
> Issue #143 (AC3.7) requires consistent structure across all tickets. Quiz
> tickets capture binary decisions with full reasoning so future reviewers can
> understand the trade-offs that were considered.

## Decision Statement

[State the decision neutrally as a question, not advocating for either side]

Example:
> Should we adopt TypeScript strict mode for this codebase?

## Options

### Option 1: [Option name]

**Pros:**

- [Benefit 1]
- [Benefit 2]

**Cons:**

- [Trade-off 1]
- [Trade-off 2]

### Option 2: [Option name]

**Pros:**

- [Benefit 1]
- [Benefit 2]

**Cons:**

- [Trade-off 1]
- [Trade-off 2]

### [Additional options as needed]

[Repeat the Option N structure for each viable path]

## Reasoning

[Narrative explaining which option was chosen and why; this section records
the decision rationale for future reference]

Example:
> We chose to adopt strict mode gradually:
> - Immediate adoption would block all PRs while we retrofit types
> - Phased adoption lets us flag strict-mode violations in CI without blocking
> - We can complete the retrofit over 2–3 sprints
> - Future contributors benefit from type safety on new code

## Acceptance Criteria

- [ ] All options documented with pros and cons
- [ ] Decision clearly stated and justified
- [ ] Rationale explains trade-offs considered
- [ ] Related issues or follow-up tasks linked (if any)

## Notes or Revision History

[Optional: record decisions made during this quiz, open questions that remain,
or iterations if the decision changed during discussion]

Example:
> Initially considered Option 1 (full adoption) but ruled it out due to time
> constraints. Chose phased adoption (Option 2) to get benefits sooner.
> Follow-up: File ticket to track strict-mode retrofit phases.
