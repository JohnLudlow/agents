# Research — workflow reference

Entry point: `/jl-research`. The user invokes the skill with the topic to
research.

## Resolve configuration (BLOCKER 0)

Resolve settings from the `jl_research` block in `CONTRIBUTING.md` and
`AGENTS.md` through `jl-config` (same pattern as `jl-quiz/SKILL.md` BLOCKER
0). If a required value is missing, ask the user with explicit options and
continue.

## Research and record evidence-backed findings (AC2)

1. The agent performs research on the topic (tools, repository, history,
   web sources) and records **evidence-backed findings** — each finding
   with its source (file, link, or the tool result that supports it).
2. Findings are recorded as they are established.

## Trade-off-aware recommendation (AC2)

After the findings, the agent presents the options and their trade-offs and
states a **recommendation** — an explicit pick with the reason, so the user
can accept it, reject it or adjust it.

## User acceptance before resolution (AC2)

The agent stops before the workflow is considered resolved and asks the
user for their acceptance of the findings and the recommendation:

> "Findings recorded. Please accept or override before I consider this resolved."

The user's explicit decision is recorded with the workflow.

## AFK execution requires explicit per-ticket permission (AC2)

If the user asked for autonomous execution (AFK), that requires explicit
per-ticket permission. Without an explicit, current-session permission the
workflow refuses to run AFK.
