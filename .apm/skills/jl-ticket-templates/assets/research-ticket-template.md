---
title: "[Research: {research_topic}]"
description: "[Short summary of the investigation being conducted]"
type: "research"
status: "Draft"
author: "[jl-recon or agent name]"
date: "[YYYY-MM-DD]"
related_links: ""
parent: ""
---

# Research: {research_topic}

This template is for **research tickets** — investigations that explore a
question, gather evidence, and report findings to inform a decision.

Use this template when:

- a feature or design decision depends on external knowledge
- you need to evaluate options before committing to a path
- investigation findings should be documented for future reference
- the scope and methodology of the research matter to stakeholders

This template **inherits** from the shared ticket base schema documented in
`jl-ticket-templates/references/SHARED_BASE_SCHEMA.md`. See that document
for frontmatter fields, acceptance-criteria format, and common sections.

## Overview

[1-2 paragraph summary of what is being investigated and why it matters]

Example:
> This research evaluates whether to migrate from SQLite to PostgreSQL. The
> decision affects scalability, deployment complexity, and team skillset
> requirements. We need to understand the trade-offs before committing to a
> migration.

## Context

[Why this research is needed; what problem it informs; what decision depends on it]

Example:
> Issue #162 (feature X) requires horizontal scaling across multiple servers.
> SQLite's single-writer limitation means we need to evaluate multi-server
> database options. This research informs the architecture decision.

## Investigation Goal

[State the goal neutrally as a research question, not presupposing the answer]

Example:
> What are the operational and development costs of migrating to PostgreSQL
> versus remaining on SQLite?

## Research Scope

[Define what will be investigated and what is explicitly out of scope]

Example:
> **In scope:**
> - Deployment complexity (single vs. multiple servers)
> - Performance characteristics under load
> - Team knowledge and ramp-up time
> - Backup and recovery procedures
>
> **Out of scope:**
> - Cost of cloud database services (not used in this architecture)
> - NoSQL alternatives (team requires relational schema)

## Findings

[Report what was discovered; organize by topic or question]

Example:
> ### PostgreSQL deployment
> - Requires separate process; adds operational overhead
> - Tools: Docker, systemd, or managed services (Railway, Render)
> - Ramp-up: 1–2 weeks for team unfamiliar with PostgreSQL
>
> ### SQLite at scale
> - WAL mode enables concurrent reads; single writer still applies
> - Multi-server requires coordination layer (e.g., Redis, S3 sync)
> - Simpler to understand; less operational overhead initially

## Recommendation

[State what the findings suggest; include caveats or trade-offs]

Example:
> For this codebase, PostgreSQL is recommended because:
> - Deployment overhead is acceptable (2–3 hours via Docker)
> - Eliminates custom multi-server coordination logic
> - Team can learn PostgreSQL faster than maintaining a custom sync layer
>
> Caveat: Initial onboarding will require PostgreSQL documentation review.

## Acceptance Criteria

- [ ] Investigation goal clearly stated as a research question
- [ ] Scope explicitly lists what is in and out of bounds
- [ ] Findings are documented with specific evidence or references
- [ ] Recommendation is supported by the findings
- [ ] Next steps or dependent decisions are identified (if any)

## Notes or Revision History

[Optional: record assumptions made during research, changes to scope,
or how the investigation evolved]

Example:
> Initially considered only Cloud options (Render, Railway) but expanded to
> include self-hosted after learning team preference for control.
> Follow-up: Create implementation task for PostgreSQL migration if decision
> is to proceed.
