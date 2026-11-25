---
description: "CI gating rules and async flow for generated tests"
---

# CI Integration

Detailed CI gating and async flow for jl-feature-tester.

## CI gating

- generated tests must pass in CI before acceptance when `test_ci_required` is true
- coverage must meet the configured threshold when one is defined
- no regressions should be introduced by generated tests or their supporting configuration
- failures, quarantines, or flaky behaviour must be surfaced in the final report rather than hidden

### Async flow

```text
tests generated
  -> committed or staged on delegated branch
  -> merged or proposed into feature branch
  -> CI runs
  -> results collected
  -> user accepts / rejects / requests revision
```

If CI cannot run in the current environment, say so clearly and treat final
acceptance as pending external validation rather than silently complete.

### Test Verification

Verification covers more than "tests ran". It confirms the intended tests were
generated or updated, the right runner executed them, pass/fail status is
known, coverage is reported when available, no obvious regression was
introduced, and CI requirements are satisfied when configured. Delegation is
appropriate for result analysis when it is large, noisy, cross-language, or
specialist, such as coverage triage, performance analysis, or security-focused
verification.

## See Also

- [SKILL.md](../SKILL.md#ci-integration) — Gating rules inline
- [SKILL.md](../SKILL.md#test-verification) — Test verification inline
