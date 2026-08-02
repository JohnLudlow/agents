---
name: jl-token-audit
description: "Audit where your tokens are spent and advise how to spend fewer."
disable-model-invocation: true
---

Audit the current session and skill installation to find where tokens are
**spent**, then advise specific reductions.

## Steps

### 1. Measure

Run `tokenscope` to get the session breakdown by category. Enumerate every
skill visible in context: name, invocation type (model-invoked or
user-invoked), and approximate description size.

**Done when**: tokenscope data collected; every visible skill catalogued
with invocation type and description size.

### 2. Diagnose

For each spender above noise level, classify it against
[TOKEN-COSTS.md](TOKEN-COSTS.md):

- **What** spends (the skill, agent type, or prompt pattern)
- **Why** (the structural cause from the cost model)
- **Impact** (high / medium / low, relative to other spenders)
- **Action** (a specific recommendation to reduce the spend)

**Done when**: every spender above noise level has all four fields. No
spender left without an action.

### 3. Report

Rank findings by impact, highest spend first. Each entry carries its full
diagnosis from step 2.

End with a numbered recommendation list, most impactful first, each
actionable without re-auditing.

**Done when**: ranked report delivered with numbered recommendations.

## Branch: raise an issue

When the user asks, create an issue containing the **full report** — all
spenders, all diagnoses, all recommendations. The issue is self-contained:
a future agent acts on it without re-auditing.

Title: `Token audit: [top finding summary]`
