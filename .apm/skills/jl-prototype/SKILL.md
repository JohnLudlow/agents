---
name: jl-prototype
description: "Prototyping skill: generates a time-boxed, stack-agnostic prototype on its own branch after running jl-quiz to confirm shared understanding. Use when the user wants to sanity-check an idea, try out a technique, or build a throwaway demo before committing to real implementation."
---

# Prototype

## Overview

This skill produces a time-boxed prototype — runnable code, an IaC deployment,
a visual/UX mockup, a docs sample, or an architecture sketch — that
demonstrates one technique against one stated requirement set. It never
starts generating without first running `jl-quiz` to confirm what is
actually being tried and why; a prototype built on an assumption is wasted
effort twice over.

A prototype is not a first draft of production code. It exists to answer one
question — "does this technique work / feel right / meet the requirement?" —
and then either evolves or gets discarded. Keep that framing throughout: the
`jl-quiz` questions below exist to pin down the question before any
artifact gets written.

This skill also supports nested subagent delegation when a prototype session
surfaces work that is too broad, benefits from parallel execution, or needs a
specialist agent. Delegation is additive, not a replacement for the prototype
flow: `jl-prototype` remains responsible for the parent quiz, branch strategy,
artifact consolidation, and final handoff.

## Core Model

Every prototype session carries the same state:

- **Objective** — the one question the prototype exists to answer.
- **Technique** — the specific approach, pattern, or idea being demonstrated.
- **Stack** — the language, framework, or tooling the prototype is built in.
- **Keep-vs-discard intent** — whether the user expects to evolve this into
  real work or throw it away once the question is answered.
- **Branch** — the git branch the prototype lives on; never the working
  branch the user was already on.
- **Parent prototype branch** — the top-level `prototype/<slug>` branch for the
  session.
- **Delegated subtask** — a bounded child task spun out to a specialist agent
  when the prototype session benefits from separation of concerns or parallel
  execution.
- **Prototype report** — the central roll-up of quiz decisions, delegated
  results, self-check outcomes, and keep/discard or merge recommendations.

## Configuration

`jl-prototype` reads settings from `jl_approval_gates` configuration in
`CONTRIBUTING.md` and `AGENTS.md`, or inherits an already-resolved parent
session decision when invoked from `jl-recon`.

### Schema

| Setting | Type | Allowed values | Default | Meaning |
| --- | --- | --- | --- | --- |
| `jl_approval_gates.prototype_approval_mode` | string | `always`, `inherit`, `never` | `inherit` | Controls whether delegated prototype subtasks require an approval prompt |
| `jl_approval_gates.prototype_task_overrides.<task_type>` | string | `always`, `inherit`, `never` | unset | Per-task override for `design`, `implementation`, `test`, or `parallel-research` |
| `jl_approval_gates.prototype_fallback_on_decline` | string | `inline`, `manual` | `inline` | What to do when the user declines delegation |

### Resolution rules

- Resolve config before delegating any child task.
- If `prototype_approval_mode` is `inherit`, use the parent session's already
  resolved prototype gate when `jl-prototype` was entered from `jl-recon`;
  otherwise treat it as `always`.
- Apply `prototype_task_overrides.<task_type>` when present; per-task overrides
  take precedence over the session default.
- If config is missing, malformed, or unresolved, fall back to
  `prototype_approval_mode: inherit` and
  `prototype_fallback_on_decline: inline`.
- Delegation approval governs whether `jl-prototype` may call
  `DelegateToSubagent`; it does not require a second prompt after a child
  agent has already been explicitly approved for that same bounded subtask.

### Approval prompt

When the resolved mode for a subtask requires approval, use this exact pattern:

`Delegate {task_type} to {target_agent}? [Approve] [Decline]`

If declined:

- continue inline when fallback resolves to `inline`, or
- mark the subtask as manual in the prototype report when fallback resolves to
  `manual`.

## When Invoked

Follow these steps in order. Do not skip ahead to Generation while any step
below remains open.

### 1. Run jl-quiz

Load and run `jl-quiz` now. Its BLOCKER 0 (preference resolution) and
mode selection apply unchanged — this skill does not duplicate or override
them.

Surface these decisions through the quiz (fold synonyms together; do not ask
about the same decision twice):

- **Requirements** — what must the prototype demonstrate to answer the
  objective?
- **Interesting technique** — which specific pattern, library, or idea is
  being tried?
- **Tech stack** — which language/framework/tooling?
- **Audience & purpose** — who looks at this, and what decision does it feed?
- **Keep vs discard** — is this expected to evolve into real work, or answer
  the question and get thrown away?
- **Acceptance criteria** — how will the user know the prototype answered the
  objective?
- **Output location** — confirm the branch-based convention below (step 2)
  fits, or surface any objection now rather than after the branch exists.

If the quiz surfaces a design subquestion that is too large to resolve inside
the current prototype conversation, or clearly needs specialist expertise,
delegation is allowed at that point. The parent prototype flow still owns the
decision record and must fold the child result back into the session before
continuing.

**Completion criterion:** the quiz has reached and the user has confirmed
shared understanding — objective plus every resolved decision restated back
to them — exactly as `jl-quiz` requires. Do not proceed to Generation
until this is confirmed, unless the unresolved item has been explicitly spun
out as an approved delegated subtask.

### 2. Create the branch

Create `prototype/<slug>`, where `<slug>` is a short kebab-case derivation of
the confirmed objective. The prototype lives on its own branch, never on the
branch the user was already on.

If the invoking agent lacks branch-creation permission, stop and ask the user
how they want to proceed. Do not fall back to writing the prototype onto the
current branch without asking — that silently changes the blast radius of
the work the user agreed to.

**Completion criterion:** the branch exists and is checked out, or the user
has explicitly told you how to proceed without one.

### 3. Scaffold the artifact

Build the artifact the quiz-agreed requirements and technique call for, in
the confirmed stack. The shape is deliberately broad — runnable code, an IaC
deployment, a visual/UX mockup, a docs sample, an architecture sketch — so
scaffold whichever of these the objective actually needs, not a default.

Keep it time-boxed: a prototype demonstrates the technique, it does not
productionise it. Stop scaffolding once the technique is demonstrated against
the confirmed acceptance criteria — resist the pull to keep polishing.

If implementation scope becomes too large for one prototype session, or if
parallel execution would materially improve throughput, delegation is allowed
here. Typical child agents:

- `jl-feature-implementer` for bounded implementation work
- `jl-feature-documenter` for supporting docs or usage notes
- `polyglot-test-agent` for test generation and execution
- `jl-feature-tester` for prototype validation tasks

### 4. Write the README

Write `README.md` from
[`assets/prototype-readme-template.md`](./assets/prototype-readme-template.md),
populated with the quiz-agreed objective, technique, stack, how to run it, and
keep/discard status.

### 5. Add and run the self-check

Add a self-check — a script, or explicit run/verify steps — that confirms the
technique is actually demonstrated, not just that the code compiles or the
file exists.

Run the self-check if the invoking agent has permission to execute it in this
environment. If not, hand the exact steps to the user in your response and
wait for them to confirm the result before treating the prototype as done.

Test generation or expanded verification may be delegated when a specialist
agent can produce better coverage, run in parallel, or package results more
cleanly than the parent prototype session can inline.

**Completion criterion:** the self-check has been run (by you or the user)
and its result — pass or fail — is known, not merely written down.

### 6. Route to review, then hand off

If keep-vs-discard was resolved as **evolve**, invoke `jl-feature-reviewer`
on the prototype before handoff. If it was resolved as **discard**, skip the
reviewer — a throwaway artifact does not need a quality gate.

Hand off with the branch left local. Never push or open a PR unless the user
explicitly asks for it in this session. If keep-vs-discard is **discard**,
offer to delete the branch; if **evolve**, keep it and say so.

If delegated subtasks created child worktrees, include them in the handoff and
offer cleanup when the parent prototype closes.

## Subagent Delegation

Delegate when one of these is true:

- A design subquestion surfaced during the quiz is large enough to deserve its
  own bounded investigation.
- The implementation work needed to demonstrate the prototype is too large for
  one prototype session.
- Test generation, validation, or self-check expansion would benefit from a
  specialist testing agent.
- The prototype has independent subtasks that can run in parallel without
  losing parent control of scope.
- The work needs external expertise already embodied in a repository agent.

Do not delegate merely to avoid owning the prototype flow. `jl-prototype`
must still:

- hold the parent objective,
- gate and record the decision to delegate,
- manage the branch and worktree hierarchy,
- collect child artifacts, and
- present one consolidated report to the user.

### Recommended target agents

| Subtask type | Typical trigger | Target agent |
| --- | --- | --- |
| `design` | quiz reveals a deep design fork or specialist question | `jl-feature-planner` or another bounded design-capable agent |
| `implementation` | prototype code is too broad for one session | `jl-feature-implementer` |
| `test` | prototype artifacts need generated tests or broader validation | `polyglot-test-agent` or `jl-feature-tester` |
| `parallel-research` | independent research or validation can proceed concurrently | bounded specialist agent appropriate to the stack |

### Model Selection

Model selection for prototype delegations follows the shared hierarchy:
global default < per-agent default < per-type default < per-task override.

For `jl-prototype`, the per-agent default is:

- `claude-sonnet-5` for design and parallel research
- `gpt-4-turbo` for implementation
- `claude-opus-4.5` for test-oriented validation when deeper reasoning matters

Resolve models in this order:

1. explicit `DelegationRequest.model`
2. `jl_subagent_models.overrides.<task-key>`
3. `jl_subagent_models.<delegation-type>`
4. `jl-prototype` per-agent default for the current subtask
5. `jl_subagent_models.default`

If the selected model is unavailable in the current harness, fall through to
the next candidate and warn in the parent prototype report.

Example configuration:

```yaml
jl_subagent_models:
  default: "claude-sonnet-5"
  implementation: "gpt-4-turbo"
  test_generation: "claude-opus-4.5"
  overrides:
    prototype-auth-spike: "claude-opus-4.5"
```

## Approval Gate Integration

Approval gates apply at each delegation decision point, not only once at
session start.

### Session-level behaviour

1. Resolve `jl_approval_gates.prototype_approval_mode`.
2. If `jl-prototype` was launched from `jl-recon`, inherit the parent gate when
   the mode resolves to `inherit`.
3. Before calling `DelegateToSubagent`, resolve any per-task override for the
   current task type.
4. If the effective mode is `always`, prompt the user.
5. If the effective mode is `never`, delegate without prompting.
6. If the user declines, use the configured fallback.

### Double-approval avoidance

- Do not ask twice for the same bounded delegated subtask just because the
  child agent has its own internal approval mechanism.
- The parent prototype gate authorizes the spawn of the child task.
- Child-agent approval gates still apply for any further nested action inside
  that child's own workflow that is broader than the approved parent request.
- Record in the prototype report that the parent already approved the child
  delegation so later summarization does not present it as missing consent.

### Decline handling

If the user declines delegation:

- continue inline when practical, or
- mark the subtask as manual with a short reason in the prototype report.

Do not silently drop the work item.

## Delegation Workflows

The parent prototype flow owns the decision points below.

### Design subquestion workflow

```text
Run jl-quiz
  -> surface design subquestion
  -> decide if scope exceeds inline quiz handling
  -> resolve prototype approval gate
  -> if approval required, ask:
       "Delegate design to {target_agent}? [Approve] [Decline]"
  -> if approved, call DelegateToSubagent(design)
  -> collect child design decisions into prototype report
  -> resume parent quiz with updated shared understanding
```

### Implementation workflow

```text
Prototype scaffold planned
  -> detect implementation slice too large for one session
  -> partition into bounded child task
  -> resolve prototype approval gate or inherited parent gate
  -> if approved, call DelegateToSubagent(implementation)
       on child branch/worktree
  -> collect code artifacts, notes, and self-check outputs
  -> integrate accepted result into parent prototype branch
```

### Test generation workflow

```text
Prototype artifact exists
  -> determine test or verification gap
  -> resolve per-task approval override for test delegation
  -> if approved, call DelegateToSubagent(test)
       using polyglot-test-agent or jl-feature-tester
  -> collect generated tests, test results, and gaps
  -> summarize pass/fail status in prototype report
```

### Parent control pseudocode

```text
for each surfaced subtask:
  classify subtask type
  resolve effective approval mode
  if mode requires prompt:
    ask "Delegate {task_type} to {target_agent}? [Approve] [Decline]"
  if approved:
    create child worktree + child branch
    DelegateToSubagent(subtask)
    collect returned artifacts
  else if fallback == inline:
    continue inline
  else:
    mark subtask manual
finalize consolidated prototype report
```

### Concrete examples

1. Research delegation with override:
   delegate a difficult design spike with `model: "claude-opus-4.5"`; if the
   harness supports it, use Opus instead of the prototype defaults.
2. Test generation with per-type model:
   use `jl_subagent_models.test_generation: "claude-opus-4.5"` for reasoning
   about edge-case unit tests while leaving implementation on `gpt-4-turbo`.
3. Harness fallback:
   if browser harness cannot honor `gpt-4-turbo` for an implementation subtask,
   fall back to `claude-sonnet-5` or the global default and record the warning.

## Branch & Worktree Management

Delegated prototype subtasks must stay grouped under the parent prototype
branch.

### Parent branch

- Parent branch: `prototype/<slug>`

### Child worktrees

Each delegated subtask gets:

- worktree name:
  `worktree-proto-{subtask-id}-{unix-seconds}`
- child branch under the parent prototype branch namespace, for example:
  `prototype/<slug>/<subtask-id>`

This preserves a clear hierarchy:

```text
prototype/<slug>                      parent prototype branch
  ├─ prototype/<slug>/design-auth     delegated design branch
  ├─ prototype/<slug>/impl-api        delegated implementation branch
  └─ prototype/<slug>/tests-smoke     delegated test branch
```

### Rules

- Never reuse the user's pre-existing working branch for delegated prototype
  work.
- Keep each delegated experiment isolated to its own child worktree.
- Record the worktree path, child branch, owning subtask, and cleanup status in
  the prototype report.
- When the parent prototype closes, offer to clean up child worktrees.
- If the prototype is kept and evolved, keep the parent branch and only remove
  child worktrees whose results have been merged or intentionally discarded.
- If the prototype is discarded, offer to remove the parent branch and all
  child worktrees together.

## Artifact Collection

Every delegated subtask must return artifacts in a form the parent prototype
session can consolidate.

### Expected child outputs

- **Design delegation** — design decisions, options considered, unresolved
  risks, and a recommendation
- **Implementation delegation** — code artifacts, setup notes, self-check
  output, and any blocked items
- **Test delegation** — generated tests, test execution results, and remaining
  gaps
- **Parallel research or validation** — findings, evidence, and recommended
  next step

### Consolidation rules

The parent prototype report should gather:

- objective and confirmed quiz decisions,
- every delegated subtask and its approval outcome,
- child branch and worktree details,
- returned artifacts and findings,
- self-check and test status,
- final recommendation: keep, discard, or merge selected child outputs.

Present one consolidated handoff to the user with options to:

- keep the prototype as-is,
- discard selected or all delegated artifacts,
- merge selected child results into the parent prototype branch.

## Decision Gate

This skill's main decision gate is still the quiz-confirmed shared
understanding before generation. Subagent delegation adds narrower approval
gates inside that broader flow:

- before spinning out a delegated design subquestion,
- before delegating a bounded implementation slice,
- before delegating test generation or parallel validation.

If the prototype request grows materially, re-run the relevant quiz portion on
the delta rather than treating delegation as permission to expand scope
silently.

## Quiz Modes

`jl-quiz` Mode A and Mode B still apply unchanged. Delegation is an escape
valve when the selected quiz mode surfaces a subquestion that is too broad,
too specialist, or too parallelizable for the current parent prototype thread.

- Use inline quiz progression when the question can be resolved within the
  parent prototype session.
- Use delegation when resolving the subquestion separately will improve
  quality, speed, or clarity without losing parent control of scope.

## Guardrails

Refuse, and explain why, rather than working around:

- Anything outside the objective the quiz confirmed. If the request has grown
  since confirmation, re-run the quiz on the delta rather than absorbing it
  silently.
- Production-grade deliverables. A request for hardened, fully-tested,
  deployment-ready output is not a prototype request — say so and ask whether
  they want the prototype skill or a real implementation flow.
- Mutating a real environment (deploying to a live cloud account, writing to
  production data) without explicit approval for that specific action, even
  if the user already approved the prototype in general.
- Anything that requires secrets or credentials to run. A prototype that only
  works with real credentials has failed to be a prototype.

## Requirements

The agent MUST:

- Run `jl-quiz` to completion — objective and every decision
  confirmed by the user — before writing any artifact, except for a bounded
  delegated subtask explicitly approved through the prototype delegation gate.
- Create and use a dedicated `prototype/<slug>` branch, or get explicit user
  direction when branch creation is unavailable.
- Write `README.md` from `assets/prototype-readme-template.md`.
- Include a self-check and know its result (pass/fail) before calling the
  work done.
- Invoke `jl-feature-reviewer` when keep-vs-discard resolves to
  evolve.
- Resolve prototype approval-gate configuration before delegating a child task.
- Keep delegated prototype subtasks isolated in child worktrees and child
  branches under the parent prototype branch.
- Collect delegated artifacts into one consolidated prototype report.
- Keep the branch local unless the user explicitly asks to push or open a PR.

The agent MUST NOT:

- Generate before shared understanding is confirmed.
- Scaffold anything outside the quiz-confirmed objective.
- Produce a production-grade deliverable under the guise of a prototype.
- Mutate a real environment without explicit, action-specific approval.
- Generate anything that requires secrets or credentials to run or verify.
- Delegate a child task without evaluating the effective prototype approval
  gate.
- Ask duplicative approval questions for the exact same bounded child
  delegation.
- Push, open a PR, or delete the branch without the user asking first.

## Examples

### Example 1 — design quiz delegates implementation

A design-heavy prototype quiz confirms the objective but surfaces a large,
bounded implementation slice for a sample API. `jl-prototype` resolves the
prototype approval gate, asks
`Delegate implementation to jl-feature-implementer? [Approve] [Decline]`,
spawns the child branch and worktree, then folds the returned code and notes
into the parent prototype report.

### Example 2 — prototype code delegates test generation

The prototype artifact exists, but its self-check is too shallow to answer the
objective confidently. `jl-prototype` resolves the `test` task override,
delegates test generation to `polyglot-test-agent`, then records the generated
tests, pass/fail output, and remaining gaps in the consolidated report.

### Example 3 — jl-recon prototype ticket delegates nested work

`jl-recon` routes a Prototype ticket into `jl-prototype`. During the prototype
session, a deep design fork and a separate verification task emerge. The
prototype skill inherits the parent approval mode from the recon session,
delegates only the bounded child tasks that need separation, and reports the
results back in a single prototype summary rather than scattering them across
uncoordinated child outputs.

## Relationship to Other Skills

- **jl-quiz** — mandatory pre-step; this skill's Objective, Technique,
  Stack, Audience & purpose, Keep vs discard, Acceptance criteria, and Output
  location decisions are all surfaced through it, not asked separately.
- **jl-subagent-spawning** — defines the `DelegateToSubagent` protocol and
  harness constraints used when prototype work is delegated.
- **jl-recon** — may invoke this skill for Prototype tickets and may supply
  inherited approval-gate context for delegated prototype work.
- **jl-markdown-standards** — applies to the generated `README.md` and any
  markdown prototype report material.
- **jl-code-quality** — applies to any code the prototype contains,
  scaled to a time-boxed artifact rather than production code.
- **jl-issue-management** — not used directly; a prototype lives on a
  branch, not in an issue tracker.
- **jl-feature-implementer** — typical target for delegated implementation
  slices.
- **jl-feature-tester** — typical target for delegated validation work when a
  dedicated testing flow is needed.
- **jl-feature-reviewer** — invoked only when keep-vs-discard resolves
  to evolve.
- **polyglot-test-agent** — typical target for delegated cross-language test
  generation.
- **Wayfinder** (future) — will reference this skill as one of the paths it
  can route into; this skill remains standalone-referenceable and does not
  depend on Wayfinder.

## References

- [jl-subagent-spawning](../jl-subagent-spawning/SKILL.md) — delegate-to-
  subagent protocol, harness notes, and coordination constraints
- [jl-recon](../jl-recon/SKILL.md) — parent ticket routing and AFK delegation
  pattern this skill can inherit from
- [CONTRIBUTING.md](../../../CONTRIBUTING.md) — repository configuration and
  approval-gate defaults

## Assets

- `assets/prototype-readme-template.md` — template for the generated
  `README.md`. See step 4 above for usage.
