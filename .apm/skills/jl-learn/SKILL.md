---
name: jl-learn
description: "Learn workflow: explains a concept or topic with resources and takeaways, and asks whether a knowledge check is useful"
---

# Learn

## Overview

The Learn workflow produces explanations, resources and takeaways for the
user, and offers a knowledge check that is optional: completed and skipped
outcomes stay distinct (the user can decline).

## When This Skill is Invoked

Entry point: `/jl-learn`. The main workflow is in
[references/LEARN.md](references/LEARN.md); it starts from the configuration
resolution in BLOCKER 0 there.

## Assumptions

The user invokes `/jl-learn` with the thing to learn (the "goal").

## References

- [LEARN.md](references/LEARN.md) — the full Learn workflow (AC1).

## Tests

- [tests/learn.test.js](tests/learn.test.js) — focused workflow doc tests
  (run via `npm run test:jl-learn`).
