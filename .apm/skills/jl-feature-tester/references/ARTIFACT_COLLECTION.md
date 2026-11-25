---
description: "Expected child outputs and consolidation rules for delegated testing"
---

# Test Artifact Collection

Detailed artifact collection rules for jl-feature-tester.

## Expected child outputs

- generated test files
- test run results
- coverage reports or coverage deltas
- failure or regression findings
- performance metrics when applicable
- security findings when applicable
- blocked items or harness limitations

### Consolidation rules

The parent test report should gather:

- all generated test files across all delegated tasks
- component-to-language-to-framework mapping
- pass/fail summary per task and overall
- total or reported coverage and threshold status
- regression findings
- performance or security findings when those paths ran
- CI status for generated changes
- recommendation: accept, reject, revise, or fall back inline

If the user accepts:

- merge the accepted test files into the feature branch
- update any directly related CI configuration if the generated tests require it
- record the consolidated validation result

If the user rejects:

- request revision from the delegated path when appropriate
- or fall back to inline test writing or gap documentation

## See Also

- [SKILL.md](../SKILL.md#test-artifact-collection) — Routine policy
