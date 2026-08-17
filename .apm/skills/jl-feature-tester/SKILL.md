---
name: jl-feature-tester
description: "Feature testing skill: plans, generates, runs, verifies, and reports automated tests for feature work. Use when validating implemented features, generating unit or integration tests, analyzing failures or coverage, coordinating delegated test subtasks, or consolidating CI-backed test results."
---

# jl-feature-tester

## Overview

`jl-feature-tester` owns the feature-testing lifecycle for a bounded change: discover what should be tested, decide whether to generate or extend tests, run them, verify the results, and present one clear report to the user. It may work inline or delegate bounded test subtasks to specialist agents when that improves quality, speed, or parallelism.

Delegation is additive, not a handoff of responsibility. This skill remains the parent coordinator for test scope, approval-gate evaluation, worktree tracking, artifact consolidation, CI validation, and final acceptance or fallback decisions.

## Core Model

Every testing session carries the same state:

- **Feature under test** — the component, behavior, or change being validated.

- **Test scope** — unit, integration, end-to-end, regression, coverage, performance, or security testing required for the session.

- **Discovery result** — the inventory of testable components, existing harnesses, missing coverage, and blockers.

- **Delegated subtask** — a bounded child task such as unit-test generation, coverage analysis, regression analysis, or performance/security validation.

- **Test report** — the consolidated output containing generated artifacts, execution results, CI status, coverage, findings, and recommended next action.

## Configuration

`jl-feature-tester` reads settings from `jl_approval_gates` configuration in `CONTRIBUTING.md` and `AGENTS.md`, using `jl-config` for resolution precedence.

### Schema

| Setting | Type | Allowed values | Default | Meaning |
| --- | --- | --- | --- | --- |
| `jl_approval_gates.test_approval_required` | boolean | `true`, `false` | `true` | Controls whether delegated test-generation or verification subtasks require explicit user approval |
| `jl_approval_gates.test_ci_required` | boolean | `true`, `false` | `true` | Whether delegated generated tests must pass CI before acceptance |
| `jl_approval_gates.test_coverage_threshold` | number | `0`–`100` | unset | Minimum coverage target for delegated test acceptance when the repo defines one |

### Resolution rules

- Resolve config before delegating any test-related child task.

- When `test_approval_required` is `true`, prompt before delegation.

- When `test_approval_required` is `false`, delegation may proceed without prompting.

- If config is missing or malformed, default to `test_approval_required: true` (human-in-the-loop by default).

- Approval authorizes calling `DelegateToSubagent` for the bounded subtask; it does not remove the need for CI or result validation later in the flow.

## Approval Gate Integration

Approval gates apply at each delegation decision point, not only once per session.

### Session-level behaviour

1. Resolve `jl_approval_gates.test_approval_required`.

2. If `test_approval_required` resolves to `true`, prompt the user before delegation.

3. If `test_approval_required` resolves to `false`, proceed to delegation without prompting.

4. If the user declines, abort the delegated subtask and record the gap in the test report.

### Approval prompt

For test generation, use this exact pattern:

`Generate tests for {component} using {agent}? [Approve] [Decline]`

For other delegated testing subtasks, use the matching bounded pattern:

`Delegate {task_type} for {component} to {agent}? [Approve] [Decline]`

### Decline handling

If the user declines delegation, record the gap in the test report and explain why delegation was requested. Do not silently drop the work item.

### Double-approval avoidance

- Do not ask twice for the same bounded delegated test subtask once the parent session has already approved it.

- Child agents may still apply their own narrower approval logic for nested work outside the approved parent scope.

- Record the approval outcome in the test report so later summarization and CI review do not present it as unresolved.

## Test Discovery

Start by identifying the feature surface, existing tests, harnesses, and gaps.

Discovery should answer:

- what components changed,

- what tests already exist,

- which frameworks and runners are available,

- what new coverage is needed,

- whether the work is small enough to handle inline or large enough to benefit from delegated parallel generation or analysis.

For large suites, multi-language repositories, or multiple independent components, delegation is a valid discovery outcome rather than an exceptional path.

## Test Generation

Generation may be inline or delegated.

Prefer delegation when:

- multiple components can have tests generated in parallel,

- the repository uses a supported language where a specialist test agent will likely outperform ad hoc inline writing,

- the requested work spans multiple languages or frameworks,

- a broad regression or integration harness needs structured generation,

- coverage expectations are high enough that artifact isolation and consolidation matter.

Inline generation remains appropriate when:

- the change is tiny,

- there is only one simple missing assertion or test case,

- the repository lacks a usable test harness and the best fallback is to document the gap or skip.

## Subagent Delegation

Delegate when a test-related subtask is bounded, parallelizable, or better handled by a specialist.

### Primary delegation opportunity — test generation

The main delegation point is test generation:

- unit tests for one or more changed components,

- integration tests for independent integration surfaces,

- browser or end-to-end tests where a dedicated harness exists,

- multi-language test generation across different frameworks.

### Secondary delegation opportunities

Verification and analysis may also be delegated when useful:

- test result analysis after execution,

- coverage analysis,

- regression testing for a risky change,

- performance testing,

- security testing,

- any other test-related subtask that benefits from parallel execution.

### Parent responsibilities

`jl-feature-tester` must still:

- hold the overall test scope,

- evaluate approval gates before delegation,

- choose the target agent,

- create and track child worktrees or branches,

- collect generated tests and reports,

- require CI-backed validation before acceptance when configured,

- present one consolidated testing outcome.

### Model Selection

Model selection for delegated testing follows the shared hierarchy:
global default < per-agent default < per-type default < per-task override.

For `jl-feature-tester`, the per-agent default is `claude-opus-4.5` for test
generation and verification because deep edge-case reasoning and coverage
analysis usually benefit from a stronger reasoning model. For
performance-sensitive generated tests or mechanical code-heavy test scaffolds,
`gpt-4-turbo` is a valid override.

Resolve models in this order:

1. explicit `DelegationRequest.model`
2. `jl_subagent_models.overrides.<task-key>`
3. `jl_subagent_models.<delegation-type>`
4. `jl-feature-tester` per-agent default
5. `jl_subagent_models.default`

Typical mappings:

- coverage, regression, and unit-test generation -> Claude preferred
- performance-test scaffolding -> GPT preferred when speed or structured code
  emission matters

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

The parent testing flow is:

`discover -> generate -> run -> verify -> report`

Delegation hooks into that lifecycle rather than replacing it.

### Test generation workflow

```text
discover changed components and existing tests
  -> identify testable component or missing coverage
  -> choose inline vs delegated generation
  -> resolve test approval gate for generation
  -> if approval required, ask:
       "Generate tests for {component} using {agent}? [Approve] [Decline]"
  -> if approved, create child worktree/branch
  -> DelegateToSubagent(generation)
  -> collect generated test files and child run results
  -> run or queue parent validation and CI checks
  -> accept, revise, or fall back inline
```

### Verification workflow

```text
tests executed
  -> inspect pass/fail, coverage, regressions, or noisy failures
  -> decide if inline analysis is enough
  -> if not, resolve test approval gate for verification
  -> if approved, DelegateToSubagent(verification)
  -> collect findings, likely root causes, and recommended next steps
  -> fold result into consolidated test report
```

### Parent control pseudocode

```text
discover()
for each component or test gap:
  classify task_type
  select target agent
  resolve effective approval mode
  if prompt required:
    ask for approval
  if approved:
    create child worktree + child branch
    DelegateToSubagent(task_type)
    collect artifacts and child findings
  else:
    apply fallback
run parent validation and CI checks
consolidate generated files, coverage, results, and recommendations
report accept / reject / revise outcome
```

## Test Agent Selection

Choose the narrowest capable agent that matches the language, framework, and test type.

### Default preferences

| Test type | Preferred target | When to use |
| --- | --- | --- |
| Unit tests (generic or mixed-language) | `polyglot-test-agent` | Default choice for most generated unit tests and multi-language repositories |
| Unit tests (C# xUnit) | `csharp-xunit` | When the repo clearly uses xUnit and a language-specific agent is more precise |
| Unit tests (C# NUnit) | `csharp-nunit` | When NUnit is the established framework |
| Unit tests (C# MSTest) | `csharp-mstest` | When MSTest is the established framework |
| Unit tests (Java) | `java-junit` | When JUnit is the established framework |
| Browser or UI tests | `playwright-generate-test` or Playwright testing agents | When a browser automation harness already exists |
| Verification / running tests | `polyglot-test-agent:polyglot-test-tester` or inline runner | When execution should be isolated or standardized |
| Coverage or failing-test repair follow-up | `polyglot-test-agent:polyglot-test-fixer` or other specialist | When generated tests need repair or analysis |
| Performance testing | specialized performance agent | When load, latency, or throughput behaviour matters |
| Security testing | `security-review` or security testing agent | When validating security-sensitive behavior or test coverage |

### Selection rules

- Prefer `polyglot-test-agent` for unit-test generation unless a language-specific test agent clearly matches the existing framework better.

- Prefer language-specific agents when the repository conventions are obvious and the specialist agent reduces adaptation work.

- Prefer a performance-focused agent for performance validation rather than treating it as ordinary regression testing.

- Prefer a security-focused agent for security testing or exploit-oriented validation.

- Fall back to inline generation or analysis when no appropriate agent or harness is available.

## Worktree & Branch Management

Each delegated test-generation or major verification task gets isolated worktree state first.

### Naming

- child worktree:
  `worktree-test-{component}-{unix-seconds}`

- child branch:
  `test/{component}/{unix-seconds}`

If a parent feature branch exists, the child branch may nest under it; the important rule is isolation plus traceability.

### Rules

- Do not generate delegated test code directly on the user's active feature branch first.

- Keep each delegated component or major verification stream in its own worktree initially.

- Track each child worktree by component, language, framework, and intended coverage level.

- Merge accepted generated test files back into the feature branch only after review and validation.

- Auto-clean child worktrees after merge when the workflow allows it, or retain them temporarily when the user wants reviewable isolation.

- Record cleanup status in the consolidated test report.

## Test Artifact Collection

Every delegated testing task must return artifacts that the parent session can consolidate.

### Expected child outputs

- generated test files,

- test run results,

- coverage reports or coverage deltas,

- failure or regression findings,

- performance metrics when applicable,

- security findings when applicable,

- blocked items or harness limitations.

### Consolidation rules

The parent test report should gather:

- all generated test files across all delegated tasks,

- component-to-language-to-framework mapping,

- pass/fail summary per task and overall,

- total or reported coverage and threshold status,

- regression findings,

- performance or security findings when those paths ran,

- CI status for generated changes,

- recommendation: accept, reject, revise, or fall back inline.

If the user accepts:

- merge the accepted test files into the feature branch,

- update any directly related CI configuration if the generated tests require it,

- record the consolidated validation result.

If the user rejects:

- request revision from the delegated path when appropriate, or

- fall back to inline test writing or gap documentation.

## Test Verification

Verification covers more than “tests ran”.

It should confirm:

- the intended tests were actually generated or updated,

- the right runner executed them,

- pass/fail status is known,

- coverage is reported when available,

- no obvious regression was introduced,

- CI requirements are satisfied when configured.

Delegation is appropriate here when result analysis is large, noisy, cross-language, or specialist, such as coverage triage, performance analysis, or security-focused verification.

## CI Integration

Delegated test generation is not accepted solely because an agent produced files. Generated tests must be validated through the repository's normal CI expectations.

### CI gating

Document and apply these rules:

- generated tests must pass in CI before acceptance when `test_ci_required` is true,

- coverage must meet the configured threshold when one is defined,

- no regressions should be introduced by generated tests or their supporting configuration,

- failures, quarantines, or flaky behaviour must be surfaced in the final report rather than hidden.

### Async flow

```text
tests generated
  -> committed or staged on delegated branch
  -> merged or proposed into feature branch
  -> CI runs
  -> results collected
  -> user accepts / rejects / requests revision
```

If CI cannot run in the current environment, say so clearly and treat final acceptance as pending external validation rather than silently complete.

## Requirements

The agent MUST:

- own the full testing lifecycle: discover, generate, run, verify, and report.

- resolve approval-gate configuration before delegating any test-generation or verification subtask.

- evaluate `jl_approval_gates.test_approval_mode` and applicable overrides before calling `DelegateToSubagent`.

- use the exact generation approval prompt:
  `Generate tests for {component} using {agent}? [Approve] [Decline]`
  when the gate requires it.

- keep delegated test tasks isolated in worktrees or branches before merging accepted outputs into the feature branch.

- collect generated test files, run results, coverage, and findings into one consolidated test report.

- require CI-backed validation before acceptance when configured.

- continue inline, skip, or mark manual according to the configured fallback when delegation is declined.

- clearly state when a harness, framework, or CI dependency is unavailable.

The agent MUST NOT:

- treat delegated output as accepted without validation.

- ask duplicate approval questions for the same bounded delegated test task.

- silently drop declined, blocked, or failed delegated subtasks.

- merge generated test artifacts into the main feature branch without recording their validation outcome.

- pretend CI or coverage status is known when it is not.

## Examples

### Example 1 — feature ready for unit tests

A TypeScript feature is implemented with no nearby tests. Discovery finds three changed modules and an existing Jest harness. `jl-feature-tester` resolves the generation gate, asks `Generate tests for user-search using polyglot-test-agent? [Approve] [Decline]`, delegates unit-test generation in parallel worktrees, consolidates the returned test files and run output, then waits for CI before recommending acceptance.

Model example: no explicit model is provided, so the skill first checks
`jl_subagent_models.test_generation`, then its per-agent Claude default, then
the global default.

### Example 2 — performance requirement identified

A service change includes a latency target and increased load risk. After normal correctness tests pass, `jl-feature-tester` classifies performance validation as a separate bounded task, resolves the performance override, delegates to a performance-focused agent, then folds throughput metrics and regressions into the final test report before the user decides whether the feature is acceptable.

Model example: performance-test generation can explicitly request
`gpt-4-turbo` even when ordinary unit tests default to Claude Opus.

### Example 3 — harness unavailable, fallback inline

A repository has code changes but no working test harness for the changed component. The user declines delegation or no suitable agent is available. `jl-feature-tester` follows the configured fallback: it writes tests inline when practical, or records a clear skipped/manual gap with the missing harness details instead of pretending the component is covered.

Model example: a browser harness cannot honor the requested model, so the
delegation result records the fallback to an available Claude or global default
before continuing.

## Relationship to Other Skills

- **jl-subagent-spawning** — defines the `DelegateToSubagent` protocol and harness considerations used for delegated testing subtasks.

- **jl-recon** — provides a documented pattern for approval-gated AFK-style delegation and parent coordination.

- **jl-config** — provides the configuration-resolution mechanism used for `jl_approval_gates`.

- **jl-code-quality** — informs expectations around testability, coverage, and meaningful assertions.

- **jl-markdown-standards** — applies to the test report and any markdown artifacts produced by this skill.

## References

- [jl-subagent-spawning](../jl-subagent-spawning/SKILL.md) — `DelegateToSubagent` protocol and harness guidance.

- [jl-recon](../jl-recon/SKILL.md) — example of approval-gated delegated workflow and parent-child coordination.

- [jl-config](../jl-config/SKILL.md) — config resolution and precedence rules.

- `CONTRIBUTING.md` — repository config source for `jl_approval_gates`.
