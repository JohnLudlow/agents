---
name: jl-research
description: "Research workflow: records evidence-backed findings, a trade-off-aware recommendation, and user acceptance before resolution"
---

# Research

## Overview

The Research workflow investigates a topic with the agent's tools, records
evidence-backed findings, presents a trade-off-aware recommendation, and
requires explicit user acceptance before the workflow is considered
resolved.

## When This Skill is Invoked

Entry point: `/jl-research`. The user invokes the skill with the topic to
research. The main workflow is in
[references/RESEARCH.md](references/RESEARCH.md).

## References

- [RESEARCH.md](references/RESEARCH.md) — the full Research workflow (AC2).

## Tests

- [tests/research.test.js](tests/research.test.js) — focused workflow doc
  tests (run via `npm run test:jl-research`).
