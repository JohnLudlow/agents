---
name: jl-prerequisite
description: "Prerequisite workflow: limits work to external/manual unblockers with verifiable evidence; routes in-repo source, documentation and configuration edits to Implementation instead"
---

# Prerequisite

## Overview

The Prerequisite workflow verifies a blocker is an external/manual
unblocker with verifiable evidence, and routes anything else (source,
documentation or configuration edits) to Implementation instead of doing it.

## When This Skill is Invoked

Entry point: `/jl-prerequisite`. The user invokes the skill with the
prerequisite item to verify. The main workflow is in
[references/PREREQUISITE.md](references/PREREQUISITE.md).

## References

- [PREREQUISITE.md](references/PREREQUISITE.md) — the full Prerequisite
  workflow (AC3).

## Tests

- [tests/prerequisite.test.js](tests/prerequisite.test.js) — focused
  workflow doc tests (run via `npm run test:jl-prerequisite`).
