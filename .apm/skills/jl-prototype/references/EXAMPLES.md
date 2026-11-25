---
description: "Illustrative jl-prototype delegation scenarios"
---

# Examples

Illustrative scenarios for jl-prototype delegation.

## Example 1 — design quiz delegates implementation

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

## See Also

- [SKILL.md](../SKILL.md) — Prototype flow
