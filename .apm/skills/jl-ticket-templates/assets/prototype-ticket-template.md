---
title: "[Prototype: {exploration_name}]"
description: "[Short summary of the time-boxed exploration]"
type: "prototype"
status: "Draft"
author: "[jl-recon or agent name]"
date: "[YYYY-MM-DD]"
related_links: ""
parent: ""
---

# Prototype: {exploration_name}

This template is for **prototype tickets** — time-boxed explorations that raise
the fidelity of a discussion with a cheap, throwaway artifact to react to.

Use this template when:

- a decision depends on trying something quickly rather than discussing endlessly
- a design or implementation question benefits from a working (if rough) example
- exploring a technique or library before committing to a larger change
- reducing uncertainty by building instead of reasoning

This template **inherits** from the shared ticket base schema documented in
`jl-ticket-templates/references/SHARED_BASE_SCHEMA.md`. See that document
for frontmatter fields, acceptance-criteria format, and common sections.

## Overview

[1-2 paragraph summary of what is being explored and why a prototype will help]

Example:
> This prototype explores whether websocket-based real-time collaboration is
> feasible for our UI state sync. We need to understand latency, connection
> stability, and payload size before deciding whether to implement this
> architecture in production.

## Context

[Why this exploration matters; what decision or risk it informs]

Example:
> Feature #150 requires real-time collaboration. Before committing to a
> multi-server architecture, we need to prototype and verify that websockets
> handle our workload (10+ concurrent users, 50ms state updates).

## Research Question

[State what the prototype is meant to answer; a single, clear question]

Example:
> Can websockets reliably sync collaborative state updates with acceptable
> latency and connection stability at our target scale?

## Implementation Approach

[How the prototype will be built; what is included and what is deliberately excluded]

Example:
> **Will build:**
> - Simple 2-user collaboration UI with shared text editing
> - WebSocket server using ws library
> - State sync on every keystroke
> - Connection error recovery and reconnection
>
> **Will not build:**
> - Persistence layer or database (in-memory state only)
> - Conflict resolution (last-write-wins only)
> - Production-grade error handling (enough to see patterns, not to ship)

## Verification

[How the prototype will be tested; what success looks like]

Example:
> **Success criteria:**
> - Two browser windows can edit the same text simultaneously
> - Edits appear in <100ms latency on a local connection
> - Connection loss recovers automatically within 2 seconds
> - State remains consistent after 10+ edits with no conflicts

## Throwaway Plan

[What will be discarded after the prototype; what findings carry forward]

Example:
> The prototype code will not be merged. We will discard the websocket
> implementation and state sync logic. We will keep the findings about
> latency, connection stability, and payload size to inform the production
> architecture.

## Findings

[What the prototype revealed; what was learned; any surprises or patterns]

Example:
> Websockets handle our workload comfortably. Latency on local connection:
> 5-15ms (well below 100ms target). Connection recovery works; reconnect
> happens within 200ms of network restoration. Payload size: 50-200 bytes
> per update (acceptable). Conclusion: websockets are viable for this use
> case.

## Acceptance Criteria

- [ ] Research question clearly stated
- [ ] Implementation approach documents what will and will not be built
- [ ] Verification criteria are specific and measurable
- [ ] Throwaway plan explicitly states what will be discarded
- [ ] Findings are documented with specific observations or data
- [ ] Next steps or dependent decisions identified (if any)

## Notes or Revision History

[Optional: record decisions made during prototyping, assumptions that proved
wrong, or how the scope evolved]

Example:
> Initially planned to test conflict resolution, but discovered in early
> testing that last-write-wins was sufficient for this UI pattern. Removed
> conflict resolution from scope to stay within time box. Follow-up: revisit
> if collaboration needs conflict-free merging (CRDT) later.
