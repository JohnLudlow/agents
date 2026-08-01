# Review Examples

## Example 1: Plan Review → FAIL

**Artifact:** Markdown plan from jl-feature-planner

**Verdict:** ❌ **FAIL**

**Findings:**

```text
**Completeness** — critical
Finding: Plan has zero test cases for the feature
Impact: No way to verify implementation meets requirements; regression risk
Fix: Add "Acceptance Criteria" section with at least 3 test cases
     (happy path, edge case, error case)

**Correctness** — major
Finding: Plan references "UserRepository.GetAsync()" but codebase uses
         "UserRepository.FetchAsync()"
Impact: Code examples won't compile; misleads implementer
Fix: Update all examples to use FetchAsync()

**Edge Cases** — minor
Finding: Plan doesn't cover what happens if database is down
Impact: Unclear if feature should fail fast or retry
Fix: Add note: "On DB timeout, return 503 Service Unavailable after 5s"
```

**Action:** Plan returned to agent with FAIL verdict. Agent must address
critical + major findings before re-review.

---

## Example 2: Code Review → PASS with NITS

**Artifact:** C# implementation changes from jl-feature-implementer

**Verdict:** ✅ **PASS with NITS**

**Findings:**

```text
**Correctness** — nit
Finding: XML doc comment misspells "occured" (should be "occurred")
Impact: Documentation has typo
Fix: Correct spelling in UsersController.cs line 42

**Standards** — nit
Finding: Method UserService.ValidateAsync doesn't use CancellationToken
         parameter
Impact: Inconsistent with project standard (all async methods accept
        CancellationToken)
Fix: Add cancellationToken parameter and pass to downstream calls
```

**Action:** Code approved for PR. Implementer may address nits before merge or
leave as-is (minor issues).

---

## Example 3: Design Review → PASS

**Artifact:** Architecture decision from design agent

**Verdict:** ✅ **PASS**

**Findings:** None. All five checkpoints clear. Design is correct, complete,
consistent, follows standards, and handles edge cases.

**Action:** Design approved. Proceed to implementation planning.
