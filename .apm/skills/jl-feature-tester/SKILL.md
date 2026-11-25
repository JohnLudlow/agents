---
name: jl-feature-tester
description: "Feature testing skill: plans, generates, runs, verifies, and reports automated tests for feature work. Use when validating implemented features, generating unit or integration tests, analyzing failures or coverage, coordinating delegated test subtasks, or consolidating CI-backed test results."
---

# jl-feature-tester

## Overview

`jl-feature-tester` owns the feature-testing lifecycle for a bounded change:
discover what should be tested, decide whether to generate or extend tests,
run them, verify the results, and present one clear report to the user. It may
work inline or delegate bounded test subtasks to specialist agents when that
improves quality, speed, or parallelism.

Delegation is additive, not a handoff of responsibility. This skill remains the
parent coordinator for test scope, approval-gate evaluation, worktree
tracking, artifact consolidation, CI validation, and final acceptance or
fallback decisions.

## Load contract

Routine consumers read SKILL.md for the core rules. Read
[references/DELEGATION_WORKFLOWS.md](references/DELEGATION_WORKFLOWS.md) for
delegation pseudocode, [references/AGENT_SELECTION.md](references/AGENT_SELECTION.md)
for the test-agent selection table, [references/WORKTREE_BRANCH.md](references/WORKTREE_BRANCH.md)
for child worktree isolation, [references/ARTIFACT_COLLECTION.md](references/ARTIFACT_COLLECTION.md)
for artifact collection rules, [references/CI_INTEGRATION.md](references/CI_INTEGRATION.md)
for CI gating and async flow, and [references/EXAMPLES.md](references/EXAMPLES.md)
for scenarios.

## Core Model

Every testing session carries the same state:

- **Feature under test** — the component, behavior, or change being validated.
- **Test scope** — unit, integration, end-to-end, regression, coverage,
  performance, or security testing required for the session.
- **Discovery result** — inventory of testable components, existing
  harnesses, missing coverage, and blockers.
- **Delegated subtask** — a bounded child task such as unit-test generation,
  coverage analysis, regression analysis, or performance/security validation.
- **Test report** — the consolidated output with generated artifacts,
  execution results, CI status, coverage, findings, and next action.

## Configuration

`jl-feature-tester` reads settings from `jl_approval_gates` configuration in
`CONTRIBUTING.md` and `AGENTS.md`, using `jl-config` for resolution precedence.

### Schema

| Setting | Type | Allowed values | Default | Meaning |
| --- | --- | --- | --- | --- |
| `jl_approval_gates.test_approval_required` | boolean | `true`, `false` | `true` | Controls whether delegated test-generation or verification subtasks require explicit user approval |
| `jl_approval_gates.test_ci_required` | boolean | `true`, `false` | `true` | Whether delegated generated tests must pass CI before acceptance |
| `jl_approval_gates.test_coverage_threshold` | number | `0`–`100` | unset | Minimum coverage target for delegated test acceptance when the repo defines one |

### Resolution rules

- Resolve config before delegating any test-related child task.
- When `test_approval_required` is `true`, prompt before delegation; when
  `false`, delegation may proceed without prompting.
- If config is missing or malformed, default to `test_approval_required: true`
  (human-in-the-loop by default).
- Approval authorizes `DelegateToSubagent` for the bounded subtask; it does
  not remove the need for CI or result validation later in the flow.

## Approval Gate Integration

Approval gates apply at each delegation decision point, not only per session.

### Session-level behaviour

1. Resolve `jl_approval_gates.test_approval_required`.
2. Prompt before delegation when it is `true`; proceed without prompting when
   `false`.
3. If the user declines, abort the delegated subtask and record the gap in
   the test report.

### Approval prompt

For test generation, use this exact pattern:

`Generate tests for {component} using {agent}? [Approve] [Decline]`

For other delegated testing subtasks, use the matching bounded pattern:

`Delegate {task_type} for {component} to {agent}? [Approve] [Decline]`

### Decline handling

If the user declines delegation, record the gap in the test report and
explain why delegation was requested. Do not silently drop the work item.

### Double-approval avoidance

- Do not ask twice for the same bounded delegated test subtask once the parent
  session has approved it.
- Child agents may apply narrower approval logic for nested work outside the
  approved parent scope.
- Record the approval outcome in the test report so later summarization and
  CI review do not present it as unresolved.

## Test Discovery

Start by identifying the feature surface, existing tests, harnesses, and gaps.
Discovery answers: what components changed, what tests already exist, which
frameworks and runners are available, what new coverage is needed, and whether
the work is small enough for inline or large enough for delegated parallel
generation or analysis. For large suites, multi-language repos, or multiple
independent components, delegation is a valid discovery outcome.

## Test Generation

Generation may be inline or delegated. Prefer delegation when multiple
components can generate tests in parallel, the repo uses a supported language
where a specialist test agent outperforms inline writing, the work spans
multiple languages or frameworks, a broad regression or integration harness
needs structured generation, or coverage expectations are high enough that
artifact isolation matters. Inline generation remains appropriate when the
change is tiny, only one assertion or test case is missing, or the repo lacks
a usable harness (then document the gap or skip).

## Subagent Delegation

### Primary delegation opportunity — test generation

The main delegation point is test generation: unit tests for changed
components, integration tests for independent surfaces, browser or
end-to-end tests, or multi-language test generation.

### Secondary delegation opportunities

Verification and analysis may also be delegated: test result analysis after
execution, coverage analysis, regression testing, performance testing,
security testing, or other test-related subtasks that benefit from parallel
execution.

### Parent responsibilities

`jl-feature-tester` must still: hold the overall test scope, evaluate
approval gates before delegation, choose the target agent, create and track
child worktrees or branches, collect generated tests and reports, require
CI-backed validation before acceptance when configured, and present one
consolidated testing outcome.

### Model Selection

Model selection for delegated testing follows the shared hierarchy:
global default < per-agent default < per-type default < per-task override.

For `jl-feature-tester`, the per-agent default is `claude-opus-4.5` for test
generation and verification because deep edge-case reasoning and coverage
analysis usually benefit from a stronger reasoning model; `gpt-4-turbo` is a
valid override for performance-sensitive generated tests or mechanical
code-heavy test scaffolds.

Resolve models in this order: explicit `DelegationRequest.model`, then
`jl_subagent_models.overrides.<task-key>`, then
`jl_subagent_models.<delegation-type>`, then the `jl-feature-tester`
per-agent default, then `jl_subagent_models.default`.

Typical mappings: coverage, regression, and unit-test generation map to
Claude preferred; performance-test scaffolding maps to GPT when speed or
structured code emission matters.

If a requested model is unavailable in the current harness, fall back through
the remaining hierarchy and record the substitution in the consolidated test
report.

Example configuration:

```yaml
jl_subagent_models:
  default: "claude-sonnet-5"
  test_generation: "claude-opus-4.5"
  implementation: "gpt-4-turbo"
  overrides:
    perf-smoke-tests: "gpt-4-turbo"
```

## Delegation Workflows

The parent testing flow is `discover -> generate -> run -> verify -> report`.
Delegation hooks into that lifecycle rather than replacing it; read
[references/DELEGATION_WORKFLOWS.md](references/DELEGATION_WORKFLOWS.md) for
the three workflows and the parent control pseudocode.

## Test Agent Selection

Choose the narrowest capable agent that matches the language, framework, and
test type. Full table: [references/AGENT_SELECTION.md](references/AGENT_SELECTION.md).

## Worktree & Branch Management

Each delegated test-generation or major verification task gets isolated
worktree state first. Naming and rules:
[references/WORKTREE_BRANCH.md](references/WORKTREE_BRANCH.md).

## Test Artifact Collection

Every delegated testing task returns artifacts the parent can consolidate:
generated test files, run results, coverage reports or deltas, failure or
regression findings, performance/security metrics, and blocked items.
Consolidation rules: [references/ARTIFACT_COLLECTION.md](references/ARTIFACT_COLLECTION.md).

## Test Verification

Verification confirms the intended tests were generated or updated, the right
runner executed them, pass/fail status is known, coverage is reported when
available, no obvious regression was introduced, and CI requirements are
satisfied when configured.

## CI Integration

Delegated test generation is not accepted solely because an agent produced
files; generated tests must be validated through the repository's normal CI
expectations. Read [references/CI_INTEGRATION.md](references/CI_INTEGRATION.md)
for the async flow (generate → merge/propose → CI runs → collect → accept,
reject, or revise).

## Requirements

The agent MUST:

- own the full testing lifecycle: discover, generate, run, verify, and report.
- resolve approval-gate configuration before delegating any test-generation
  or verification subtask.
- evaluate `jl_approval_gates.test_approval_required` before calling
  `DelegateToSubagent`.
- use the exact generation approval prompt when the gate requires it.
- keep delegated test tasks isolated in worktrees or branches before merging
  accepted outputs into the feature branch.
- collect generated test files, run results, coverage, and findings into one
  consolidated test report.
- require CI-backed validation before acceptance when configured.
- continue inline, skip, or mark manual according to the configured fallback
  when delegation is declined.
- clearly state when a harness, framework, or CI dependency is unavailable.

The agent MUST NOT:

- treat delegated output as accepted without validation.
- ask duplicate approval questions for the same bounded delegated test task.
- silently drop declined, blocked, or failed delegated subtasks.
- merge generated test artifacts into the main feature branch without
  recording their validation outcome.
- pretend CI or coverage status is known when it is not.

## Examples

Read [references/EXAMPLES.md](references/EXAMPLES.md) for the three scenarios:
feature ready for unit tests, performance requirement identified, and
harness unavailable fallback.

## Relationship to Other Skills

- **jl-subagent-spawning** — defines the `DelegateToSubagent` protocol and harness considerations used for delegated testing subtasks.
- **jl-recon** — documents approval-gated AFK-style delegation and parent coordination.
- **jl-config** — provides the configuration-resolution mechanism used for `jl_approval_gates`.
- **jl-code-quality** — informs expectations around testability, coverage, and meaningful assertions.
- **jl-markdown-standards** — applies to the test report and markdown artifacts produced by this skill.

## References

- [jl-subagent-spawning](../jl-subagent-spawning/SKILL.md) — `DelegateToSubagent` protocol and harness guidance.
- [jl-recon](../jl-recon/SKILL.md) — example of approval-gated delegated workflow and parent-child coordination.
- [jl-config](../jl-config/SKILL.md) — config resolution and precedence rules.
- `CONTRIBUTING.md` — repository config source for `jl_approval_gates`.
