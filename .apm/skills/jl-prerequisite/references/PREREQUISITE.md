# Prerequisite — workflow reference

Entry point: `/jl-prerequisite`. The user invokes the skill with the
prerequisite item to verify.

## Resolve configuration (BLOCKER 0)

Resolve settings from the `jl_prerequisite` block in `CONTRIBUTING.md` and
`AGENTS.md` through `jl-config` (same pattern as `jl-quiz/SKILL.md` BLOCKER
0). If a required value is missing, ask the user with explicit options and
continue.

## Verify the blocker is an external/manual unblocker with verifiable evidence (AC3)

1. The agent checks the item: is it an external/manual unblocker (for
   example awaiting an external team or system, a licence, access, or a
   legal/contractual matter) and not something done in this repository?
2. The agent records verifiable evidence for the item (links, sources, or
   the evidence the check found).

## Route non-external work to Implementation (AC3)

If the item is a source, documentation or configuration edit in the
repository, the agent reports that the work is routed to Implementation
instead of doing it in this workflow.

## Record the prerequisite (AC3)

The verified external/manual unblocker is recorded with its evidence.
