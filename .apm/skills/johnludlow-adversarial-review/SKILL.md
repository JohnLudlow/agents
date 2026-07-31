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

**PASS with NITS:** All five checkpoints clear, but 1+ minor findings exist
(list them; implementer may choose to address before release or defer).

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
2. **Read requirements** — Understand what the user asked for (see original
   request/issue)
3. **Apply checklist** — Independently evaluate each of the five checkpoints
   (Correctness, Completeness, Consistency, Standards, Edge Cases)
4. **Grade findings** — For each finding, assign severity: critical (blocks
   release), major (should fix), minor/nit (nice to fix)
5. **Render verdict** —
   - If no critical/major findings: **PASS** (or **PASS with NITS** if minors exist)
   - If critical or major findings exist: **FAIL** and list them with fixes
6. **Return structured report** — Artifact is unsafe to release if verdict is
   FAIL; agent must revise and request re-review

## Integration

This skill is **model-invoked** and works across all harnesses (CLI, browser,
Azure DevOps). Agents can autonomously invoke it after completing a subtask,
plan, or deliverable.

For integration patterns, cross-harness considerations, fleet mode workarounds,
and temperature settings, see **[INTEGRATION.md](references/INTEGRATION.md)**.

## Examples

For concrete examples of how to apply the five-checkpoint checklist across
plan reviews, code reviews, and design reviews, see **[EXAMPLES.md](references/EXAMPLES.md)**:

- Plan Review → FAIL (how critical + major findings block release)
- Code Review → PASS with NITS (how minor findings are deferred)
- Design Review → PASS (how comprehensive reviews clear all checkpoints)

## Usage Guardrails & Requirements

Before starting a review, see **[GUARDRAILS.md](references/GUARDRAILS.md)** for:

- When NOT to use this skill (stylistic nitpicking, opinions without substance)
- Pre-review requirements checklist (temperature, artifact loading, checklist
  application)
- Severity mapping reference (how to calibrate critical vs. major vs. minor)
