# Circular Delegation Test Cases (Specification-Level)

Resolves the "Cross-harness testing of circular delegation detection" fog
item from #110 ([#133](https://github.com/JohnLudlow/agents/issues/133)),
within the boundary that ticket's own acceptance criteria anticipated.

## Scope and Why This Is Not a Harness Integration Test Suite

No harness has a real, callable `DelegateToSubagent` runtime dispatch yet —
this is true for every harness in the capability matrix (Copilot CLI,
Browser/OpenCode, Azure DevOps, Kiro), not a gap specific to any one of
them. #110 explicitly scopes this out of Phase 1: "Phase 1 does not
deliver: a `DelegateToSubagent` runtime function." There is nothing to
dispatch to and nothing to instrument per-harness today.

What *does* exist today, and what this reference validates, is the
spawning algorithm itself — the `parentAgentStack` / `maxNestingDepth` /
`taskPermission` gate pseudocode documented in `SKILL.md` → Circular
Delegation Prevention. That algorithm is harness-independent by
construction: it operates purely on the delegation chain and configuration
values, never on a harness-specific dispatch call. Validating its logic in
isolation is meaningful and achievable now; validating it *through* a real
CLI, browser, Azure DevOps, or Kiro dispatch path is not, until Phase 2
ships that dispatch.

**Explicitly out of scope until Phase 2**: exercising these test cases
through an actual per-harness `DelegateToSubagent` call, on any harness.
This is not a gap in this reference — it is the boundary #133's own
acceptance criteria anticipated ("any harness lacking real runtime dispatch
is explicitly noted as out of scope").

## How to Read These Cases

Each case gives a `parentAgentStack` state, a `targetAgent`, the resolved
`maxNestingDepth`, and the delegating agent's `taskPermission`, then the
expected outcome per the algorithm in `SKILL.md`. The gate order matters:
permission, then circularity, then depth — a case that fails an earlier
gate never reaches a later one. These are written to be transliterated
directly into unit tests in whatever language implements Phase 2 dispatch.

## Permission Gate Cases

| # | `taskPermission` | Expected outcome |
|---|---|---|
| P1 | `"deny"` | Rejected: `"Cannot delegate: this agent's task permission is denied"`. No further gates evaluated. |
| P2 | `"ask"` | Passes this gate; proceeds to circularity check. |
| P3 | `"allow"` | Passes this gate; proceeds to circularity check. |

## Circular Delegation Cases

Assume `taskPermission` is `"allow"` for all cases below (permission gate
already passed).

| # | `parentAgentStack` | `targetAgent` | Expected outcome |
|---|---|---|---|
| C1 | `["jl-planner"]` | `jl-feature-planner` | Allowed: `jl-feature-planner` not in stack. |
| C2 | `["jl-planner", "jl-feature-planner"]` | `jl-planner` | Rejected: `"Cannot delegate to jl-planner: already in parent chain"`. |
| C3 | `["jl-planner", "jl-feature-planner"]` | `jl-feature-tester` | Allowed: not in stack; proceeds to depth check. |
| C4 | `[]` | `jl-planner` | Allowed: empty stack, no circularity possible. |

## Nesting Depth Boundary Cases

Assume `taskPermission` is `"allow"` and no circularity for all cases
below. `maxNestingDepth` resolved to the documented default of `3` unless
noted.

| # | `parentAgentStack` length | `maxNestingDepth` | Expected outcome |
|---|---|---|---|
| D1 | `2` (one below limit) | `3` | Allowed: `len(parentAgentStack) = 2 < 3`. Push succeeds; new depth is `3`. |
| D2 | `3` (at limit) | `3` | Rejected: `"Cannot delegate: maximum nesting depth 3 reached"`. |
| D3 | `4` (over limit — should be unreachable in practice, but must still reject) | `3` | Rejected: same message as D2; depth-limit check uses `>=`, not `==`, so any stack at or beyond the limit is rejected. |
| D4 | `1` | `1` (repository override via `jl_subagent_delegation.max_nesting_depth`) | Rejected: demonstrates the configured override is honored, not just the default. |
| D5 | `0` | `1` (repository override) | Allowed: one below the configured limit, mirroring D1 at a different configured depth. |

## Combined Gate-Order Case

| # | Setup | Expected outcome |
|---|---|---|
| G1 | `taskPermission = "deny"`, `parentAgentStack` already contains `targetAgent`, and stack is at `maxNestingDepth` | Rejected at the **permission gate** with the permission-denied message. The circularity and depth violations are real but never evaluated or reported, because the algorithm stops at the first failing gate. |

## Related

- `SKILL.md` → Circular Delegation Prevention — the algorithm these cases
  validate, including the permission gate added in
  [#131](https://github.com/JohnLudlow/agents/issues/131).
- `SKILL.md` → Circular Delegation Prevention → Configuring the Depth
  Limit — the `jl_subagent_delegation.max_nesting_depth` override exercised
  in D4 and D5.
- `HARNESS_FALLBACK.md` → Harness Capability Matrix — confirms no harness
  has real runtime dispatch yet, which is why these cases test the
  algorithm directly rather than through any harness.
