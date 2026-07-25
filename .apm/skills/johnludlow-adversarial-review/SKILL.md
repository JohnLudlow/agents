# johnludlow-adversarial-review

Adversarial quality gate skill for planning artifacts, implementation changes,
and design decisions.

## Scope

Use this skill when you (or another agent invoking you) need a ruthless, cold
review of planned work, code, or design decisions **before completion**.

Use when:

- A planning agent has produced a plan artifact (markdown, PRD, implementation
  plan, etc.) and needs review before surfacing to user
- An implementation agent has made code changes and needs correctness/completeness
  check before PR
- A design agent has created architecture decisions and needs failure-mode
  analysis
- Any agent producing a deliverable needs severity-graded feedback with PASS/FAIL
  verdict before declaring completion

## Review Checklist

Every review proceeds through five independent checkpoints. Fail on _any_
checkpoint and the verdict is **FAIL** — the artifact must be revised before
release.

### ✓ Correctness

- **Verify facts**: Does the artifact contradict itself? Does it match the stated requirements?
- **Check logic**: Are assumptions justified? Are conclusions sound?
- **Validate references**: Do all links work? Do code examples compile/run? Do file paths exist?
- **Severity**: If false, critical. If misleading, major. If outdated reference, minor.

### ✓ Completeness

- **Missing scope**: Does the artifact cover what the user asked for? Are all requirements met?
- **Missing edge cases**: What breaks this plan/code/design? What wasn't considered?
- **Missing alternatives**: Are tradeoffs documented? Why was this approach chosen over others?
- **Severity**: If user requirement missing, critical. If alternative unexamined, major. If edge case untested, minor.

### ✓ Consistency

- **Internal harmony**: Does terminology stay constant? Do examples match rules stated?
- **Alignment with repo**: Does this follow project conventions, documented standards, or established patterns?
- **Cross-file coherence**: If this spans multiple files, are relationships clear and non-contradictory?
- **Severity**: If core term redefined mid-artifact, critical. If style inconsistent, minor.

### ✓ Standards & Best Practices

- **Following guidance**: Does this match the project's AGENTS.md, CONTRIBUTING.md, or local instructions?
- **Anti-patterns**: Does it violate known best practices (e.g., negation prompts, premature completion, duplication)?
- **Security & risk**: Does it introduce security holes, performance regressions, or maintenance debt?
- **Severity**: If violates documented standard, major. If nit of style, nit. If security risk, critical.

### ✓ Edge Cases & Failure Modes

- **What could go wrong**: If this plan runs into obstacles, will it recover? If this code breaks, where?
- **Boundary conditions**: What happens at scale, under load, with invalid input, on timeout?
- **Maintenance burden**: Will future developers understand this? Will it rot?
- **Severity**: If no recovery path, critical. If unclear documentation, major. If minor edge untested, nit.

## Verdict Logic

**PASS:** All five checkpoints clear (no critical, major, or unaddressed minor findings).

**FAIL:** Any checkpoint has critical or major findings (use list below to
communicate them).

**PASS with NITS:** All five checkpoints clear, but 1+ minor findings exist (list them; implementer may choose to address before release or defer).

## Reporting Format

List findings by checkpoint. Each finding:

```text
**[CHECKPOINT]** — [severity]
Finding: [concise description]
Impact: [why this matters]
Fix: [what to change]
```

Example:

```text
**Correctness** — critical
Finding: Plan says "deploy to production on Friday" but user specified Tuesday
Impact: Timing is wrong; deployment window misses SLA
Fix: Correct deployment date to Tuesday 8am UTC

**Completeness** — major
Finding: Plan doesn't cover rollback strategy
Impact: If deployment fails mid-week, no recovery path documented
Fix: Add "Rollback" section with steps and failure conditions
```

## Workflow

1. **Load the artifact** — Fetch the plan, code, or design document produced
   by the agent/user
2. **Read requirements** — Understand what the user asked for (reference the original request/issue)
3. **Apply checklist** — Independently evaluate each of the five checkpoints (Correctness, Completeness, Consistency, Standards, Edge Cases)
4. **Grade findings** — For each finding, assign severity: critical (blocks release), major (should fix), minor/nit (nice to fix)
5. **Render verdict** —
   - If no critical/major findings: **PASS** (or **PASS with NITS** if minors exist)
   - If critical or major findings exist: **FAIL** and list them with fixes
6. **Return structured report** — Artifact is unsafe to release if verdict is FAIL; agent must revise and request re-review

## Integration

This skill is **model-invoked** (`disable-model-invocation: false`). Agents can autonomously invoke it when:

- A subagent has completed a subtask and needs quality check before returning to parent
- A planning agent has completed artifact generation and needs gate before surfacing to user
- Any agent producing a deliverable wants cold, adversarial feedback

Example agent integration:

```text
If the implementation looks complete:
  Invoke johnludlow-adversarial-review skill for code review
  If verdict is FAIL: iterate and re-review
  If verdict is PASS or PASS with NITS: proceed to next step
```

### Cross-Harness Availability

This skill is designed to work across:

- **Copilot CLI** — agents invoke skill directly via skill system
- **Browser / OpenCode** — agents invoke skill via model-invocation
- **Azure DevOps / Copilot Extensions** — depends on harness agent execution support

**Note on Fleet Mode & Subagent Spawning:** If you need one agent to spawn a reviewer _subagent_ via fleet mode, use the **johnludlow-feature-reviewer agent** instead (maintained as fallback). Fleet mode coordinates agents only, not skills. Skills must be invoked directly within an agent's context. For harnesses that don't support skill invocation, the separate agent provides fallback coverage.

### Temperature

Set model temperature to **0.2** (cold, critical thinking). Adversarial review requires skepticism, not enthusiasm.

## Examples

### Example 1: Plan Review → FAIL (Critical + Major)

**Artifact:** markdown plan from johnludlow-feature-planner

**Verdict:** ❌ **FAIL**

**Findings:**

```text
**Completeness** — critical
Finding: Plan has zero test cases for the feature
Impact: No way to verify implementation meets requirements; regression risk
Fix: Add "Acceptance Criteria" section with at least 3 test cases (happy path, edge case, error case)

**Correctness** — major  
Finding: Plan references "UserRepository.GetAsync()" but codebase uses "UserRepository.FetchAsync()"
Impact: Code examples won't compile; misleads implementer
Fix: Update all examples to use FetchAsync()

**Edge Cases** — minor
Finding: Plan doesn't cover what happens if database is down
Impact: Unclear if feature should fail fast or retry
Fix: Add note: "On DB timeout, return 503 Service Unavailable after 5s"
```

**Action:** Plan returned to agent with FAIL verdict. Agent must address critical + major findings before re-review.

---

### Example 2: Code Review → PASS with NITS

**Artifact:** C# implementation changes from johnludlow-feature-implementer

**Verdict:** ✅ **PASS with NITS**

**Findings:**

```text
**Correctness** — nit
Finding: XML doc comment misspells "occured" (should be "occurred")
Impact: Documentation has typo
Fix: Correct spelling in UsersController.cs line 42

**Standards** — nit
Finding: Method UserService.ValidateAsync doesn't use CancellationToken parameter
Impact: Inconsistent with project standard (all async methods accept CancellationToken)
Fix: Add cancellationToken parameter and pass to downstream calls
```

**Action:** Code approved for PR. Implementer may address nits before merge or leave as-is (minor issues).

---

### Example 3: Design Review → PASS

**Artifact:** Architecture decision from design agent

**Verdict:** ✅ **PASS**

**Findings:** None. All five checkpoints clear. Design is correct, complete, consistent, follows standards, and handles edge cases.

**Action:** Design approved. Proceed to implementation planning.

---

## When NOT to Use This Skill

Do NOT use this skill for:

- **Stylistic critique** — "I prefer semicolons" or "color the heading blue". Use linters and design systems instead.
- **Opinions without substance** — "This feels wrong" requires a checkable reason (Correctness, Completeness, etc.).
- **Nitpicking that won't ship** — Review only findings that block release or materially affect maintainability.

## Requirements

- Temperature set to 0.2 (cold, critical)
- Read the original user request / issue so you understand what "complete" means
- Load the full artifact (don't review a summary)
- Apply the checklist independently (don't skip checkpoints)
- Assign severity honestly (critical if it blocks release, major if it should be fixed, minor if it's nice but deferrable)
- Verdict must be actionable: if FAIL, say exactly what needs to change
