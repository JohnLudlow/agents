# Recon Map: Clarify and Enforce Correct Document Placement

**Parent issue**: #111  
**Map location**: `.avaylerflow/111-document-placement-clarity/map.md`

## Destination

A spec with detailed explanations of:

1. **What's happening** — agent confusion about document placement across repo-local vs. shipped contexts
2. **How it works** — the role/scenario/document-type framework
3. **How to fix it** — rules and patterns for agents and human maintainers to follow
4. **Where it lives** — available to agents maintaining this repo

## Decisions So Far

### ✅ Ticket 1: Clarify spec location — RESOLVED

- **Decision**: Put framework in `AGENTS.md` + implement linter check
- **Rationale**: AGENTS.md is loaded by agents when working in this repo (concrete). Linter check provides automatic enforcement.
- **Action taken**: Updated `AGENTS.md` with full section "Repository Structure and Document Placement Rules" including:
  - Roles & contexts table
  - Document types & placement rules (9 types with correct/incorrect locations)
  - Decision rules (4 concrete rules)
  - Worked examples

### ✅ Ticket 2: Implement linter check — COMPLETE

- **File created**: `scripts/lint-document-placement.js` (84 lines)
- **What it does**: Scans `.apm/agents/` and `.apm/skills/` for actual code violations
  - Detects: `require()` or `readFileSync()` calls to repo-local files
  - Smart filtering: ignores documentation *about* these files (reduces false positives)
- **Test result**: ✅ **PASS** — zero violations found in current codebase
- **Usage**: `node scripts/lint-document-placement.js`

## Frontier (Open, Unblocked Tickets)

### Ticket 3: Audit existing agents [READY]

**Type**: Research (may run AFK)  
**Blockers**: None

Scan current agents in `.apm/agents/` for violations of the framework:
- Do any agents or skills reference files in `/docs/` or `/scripts/`?
- Are there any skill config details in AGENTS.md or CONTRIBUTING.md?
- Are there skill templates or guides outside of `.apm/skills/*/references/` or `assets/`?

**Output**: Audit report with findings, severity, and remediation steps

---

### Ticket 4: Define enforcement mechanism [READY]

**Type**: Quiz  
**Blockers**: None (independent)

How do we prevent violations going forward?

**Options**:
- A. Pre-commit hook that runs the linter (developer convenience)
- B. CI/CD check that blocks merges if violations found (mandatory gate)
- C. Both A and B (best of both worlds)
- D. Add linter as optional `npm run lint` command (voluntary)

---

### Ticket 5: Fix any violations found [BLOCKED by Ticket 3]

**Type**: Task  
**Blockers**: Ticket 3 (need audit to know what to fix)

Remediate any violations found by the audit. Move misplaced files to correct locations.

## Not Yet Specified (Fog of War)

### Fog 2: Enforcement timing

**Question**: When should the linter run?

- A. On every commit (pre-commit hook)
- B. During CI/CD (blocks merge if violations found)
- C. On-demand (developer runs it manually)
- D. Combination (e.g., pre-commit warning, CI/CD hard block)

**Why it matters**: Determines how quickly violations are caught and how much friction developers experience.

---

### Fog 3: Remediation scope

**Question**: For violations found in existing code, how aggressive should we be?

- A. Fix all violations in one sweep
- B. Fix only high-severity violations
- C. Flag violations but don't fix; add to tracking board
- D. Create a separate ticket per violation type

**Why it matters**: Determines scope of follow-up work after audit completes.

## Out of Scope

(none yet)

---

## References

- **Framework**: [AGENTS.md — Repository Structure and Document Placement Rules](https://github.com/JohnLudlow/agents/blob/main/AGENTS.md#repository-structure-and-document-placement-rules)
- **Linter**: [scripts/lint-document-placement.js](https://github.com/JohnLudlow/agents/blob/main/scripts/lint-document-placement.js)
- **Parent issue**: [#111 — Bug: agents keep putting skill docs in stupid places](https://github.com/JohnLudlow/agents/issues/111)

---

**Next step**: Resolve Fog 2 (enforcement timing). Proceed with Ticket 3 (audit) after Ticket 4 (enforcement decision) is made.
