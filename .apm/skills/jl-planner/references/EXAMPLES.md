---
description: "Illustrative jl-planner delegation scenarios"
---

# Examples

Illustrative scenarios for jl-planner delegation.

## Example 1: Large epic split across feature planners

A large epic includes authentication, billing, and notification work.

1. `jl-planner` completes clarification and creates the master planning frame.
2. Scope is too large for one agent pass.
3. The planner partitions the work into auth and billing/notifications
   breakdowns.
4. It asks approval for each delegated breakdown.
5. Two `jl-feature-planner` child tasks run in parallel.
6. Returned component plans are merged into the master plan, with dependencies
   normalized into one rollout sequence.

### Example 2: Parallel research for complex dependencies

A migration plan depends on:

- third-party API limits
- framework compatibility
- existing internal library fit

The planner identifies these as independent research questions, approves or
inherits the research gate, delegates them in parallel, then folds the findings
into assumptions, risks, and sequencing before presenting the consolidated plan.

### Example 3: Harness unavailable, inline fallback

The planner is running in a harness without subagent spawning support.

1. It identifies that delegated breakdown would help.
2. It resolves the gate and determines delegation is desirable.
3. Harness support is unavailable.
4. It warns the user and offers inline continuation.
5. The planner continues inline and records that delegation was unavailable for
   this session.

## See Also

- [SKILL.md](../SKILL.md) — Planning model
- [DELEGATION_WORKFLOWS.md](DELEGATION_WORKFLOWS.md) — Full workflows
