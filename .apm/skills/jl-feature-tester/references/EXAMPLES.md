---
description: "Illustrative jl-feature-tester scenarios"
---

# Examples

Illustrative scenarios for jl-feature-tester.

## Example 1 — feature ready for unit tests

A TypeScript feature is implemented with no nearby tests. Discovery finds
three changed modules and an existing Jest harness. `jl-feature-tester`
resolves the generation gate, asks
`Generate tests for user-search using polyglot-test-agent? [Approve] [Decline]`,
delegates unit-test generation in parallel worktrees, consolidates the
returned test files and run output, then waits for CI before recommending
acceptance.

Model example: no explicit model is provided, so the skill checks
`jl_subagent_models.test_generation`, then its per-agent Claude default, then
the global default.

### Example 2 — performance requirement identified

A service change includes a latency target and increased load risk. After
normal correctness tests pass, `jl-feature-tester` classifies performance
validation as a separate bounded task, resolves the performance override,
delegates to a performance-focused agent, then folds throughput metrics and
regressions into the final test report before the user decides whether the
feature is acceptable.

Model example: performance-test generation can explicitly request
`gpt-4-turbo` even when ordinary unit tests default to Claude Opus.

### Example 3 — harness unavailable, fallback inline

A repository has code changes but no working test harness for the changed
component. The user declines delegation or no suitable agent is available.
`jl-feature-tester` follows the configured fallback: it writes tests inline
when practical, or records a clear skipped/manual gap with the missing harness
details instead of pretending the component is covered.

Model example: a browser harness cannot honor the requested model, so the
delegation result records the fallback to an available Claude or global
default before continuing.

## See Also

- [SKILL.md](../SKILL.md) — Testing lifecycle
