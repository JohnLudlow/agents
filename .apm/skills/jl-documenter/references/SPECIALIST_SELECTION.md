---
description: "Full specialist selection table for section types"
---

# Specialist Selection

Detailed specialist selection for jl-documenter. The entry point keeps a compact
summary inline; read this for the full table.

| Section type | Typical audience | Use when | Target agent |
| --- | --- | --- | --- |
| `feature` | developers or users | feature behavior, workflows, shipped capabilities, implementation-adjacent guidance | `jl-feature-documenter` |
| `api` | developers and integrators | endpoint, contract, request/response, SDK, or usage reference | `api-documentation-specialist` |
| `user-guide` | end users or operators | task-based guidance, onboarding, tutorials, walkthroughs | `user-documentation-specialist` |
| `architecture` | developers, maintainers, architects | design intent, system boundaries, component interaction, trade-offs | `architecture-documenter` |
| `troubleshooting` | operators, support, maintainers | diagnosis steps, failure modes, remediation guidance | `support-documentation-specialist` |
| `performance` | operators, advanced developers | tuning, profiling, scaling, bottlenecks, capacity guidance | specialist performance documenter |
| `security` | operators, security reviewers, developers | hardening, threat notes, safe defaults, compliance-sensitive guidance | specialist security documenter |
| `migration` | existing adopters and maintainers | version-to-version changes, upgrade sequence, compatibility notes | migration documenter |
| `localization` | locale-specific audiences | translated or region-tailored guidance | language-specific documenter |

Selection rules:

- Prefer `jl-feature-documenter` for feature documentation and implementation-adjacent sections
  already aligned to repository documentation patterns.

- Prefer the most audience-matched specialist when the section is a standalone discipline such as
  API, architecture, or troubleshooting.

- Prefer the narrowest competent specialist rather than a general documenter when terminology,
  examples, or validation are domain-sensitive.

- If no specialist exists in the current harness, document the gap and fall back according to config.

## See Also

- [SKILL.md](../SKILL.md#specialized-documenter-selection) — Compact summary and read trigger
