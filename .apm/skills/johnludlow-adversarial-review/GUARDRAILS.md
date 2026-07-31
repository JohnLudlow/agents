# Usage Guardrails

## When NOT to Use This Skill

Do NOT use this skill for:

- **Stylistic critique** — "I prefer semicolons" or "color the heading blue".
  Use linters and design systems instead.
- **Opinions without substance** — "This feels wrong" requires a checkable
  reason (Correctness, Completeness, Standards, Consistency, or Edge Cases).
- **Nitpicking that won't ship** — Review only findings that block release or
  materially affect maintainability.

## Requirements

Every review MUST satisfy these conditions before proceeding:

- [ ] Temperature set to 0.2 (cold, critical thinking)
- [ ] Read the original user request / issue (understand what "complete" means)
- [ ] Load the full artifact (don't review a summary or excerpt)
- [ ] Apply the five-checkpoint checklist independently (don't skip checkpoints)
- [ ] Assign severity honestly:
  - **Critical** if it blocks release
  - **Major** if it should be fixed before release
  - **Minor** if it's nice to fix but deferrable
- [ ] Verdict must be actionable:
  - If FAIL: state exactly what needs to change
  - If PASS with NITS: make each nit specific and fixable
  - If PASS: confirm all checkpoints passed

## Severity Mapping

Use this reference to calibrate severity assignment:

| Severity | Release Impact | Example |
|----------|----------------|---------|
| **Critical** | Blocks release | Missing test cases; security vulnerability; contradicts requirements |
| **Major** | Should fix | Code won't compile; violates documented standard; edge case unhandled |
| **Minor** | Nice to fix | Typo in docs; stylistic inconsistency; cleanup opportunity |
