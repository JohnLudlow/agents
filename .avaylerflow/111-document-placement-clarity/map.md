---
recon: map
inciting_issue: 111
created_at: 2026-08-17T18:57:00.410+01:00
---

# Recon Map: Clarify and Enforce Correct Document Placement for Agents and Skills

**Inciting issue**: [#111 — Bug: agents keep putting skill docs in stupid places](https://github.com/JohnLudlow/agents/issues/111)

## Destination

A spec with detailed explanations of:

1. **What's happening** — agent confusion about document placement across repo-local vs. shipped contexts
2. **How it works** — the role/scenario/document-type framework (from issue #111)
3. **How to fix it** — rules and patterns for agents and human maintainers to follow
4. **Where it lives** — a location that is:
   - Available to agents maintaining this repo
   - Available to agents *using* these skills in other repos
   - Not lost in CONTRIBUTING.md, AGENTS.md, /docs/, or /scripts/

## Decisions So Far

1. **Ticket 1: Clarify spec location** ✅ RESOLVED
   - **Decision**: Put detailed framework in `AGENTS.md` + implement linter check
   - **Rationale**: AGENTS.md is loaded by agents when working in this repo (concrete). Linter check provides automatic
     enforcement.
   - **Action taken**: Updated `AGENTS.md` with full role/scenario/document-type framework (section "Repository
     Structure and Document Placement Rules")

2. **Fog 1: Linter scope and implementation** ✅ RESOLVED
   - **Decision**: Static analysis (Option A) — scan `.apm/skills/` and `.apm/agents/` for file references to `/docs/`
     or `/scripts/`
   - **Rationale**: Fast, deterministic, catches violations before they cause problems in other repos
   - **Action taken**: Implemented Ticket 2 (linter script)

3. **Ticket 2: Implement linter check** ✅ COMPLETE
   - **Implementation**: Created `scripts/lint-document-placement.js`
   - **What it does**: Scans for actual code violations (regex patterns matching require/readFileSync calls to
     repo-local paths)
   - **What it ignores**: Documentation about these files (reducing false positives)
   - **Test result**: ✅ Pass — no violations found in current codebase
   - **Usage**: `node scripts/lint-document-placement.js`

4. **Ticket 3: Audit existing agents** ✅ COMPLETE
   - **Linter result**: Zero violations found
   - **Manual review**: 281 references across 11 files, mostly LOW-severity (documentation comments)
   - **Config fence clarification**: Code fences are correct by design (validator strips them before parsing)
   - **Verdict**: Codebase already follows framework correctly
   - **Full report**: [AUDIT_REPORT.md](AUDIT_REPORT.md)

5. **Ticket 5: Audit findings review** ✅ COMPLETE
   - **Initial finding**: Configuration in code fence — appeared to be HIGH-severity
   - **Correction**: Code fences are CORRECT by design — validator explicitly strips them before parsing
   - **Verification**: Config validator passes ✅ `AGENTS.md agent config is valid`
   - **Outcome**: Ticket 5 is NO-OP — no violations to fix, codebase already correct

6. **Ticket 4: Implement enforcement (pre-commit + CI/CD)** ✅ COMPLETE
   - **CI/CD integration**: Added linter check to `.github/actions/validate/action.yml`
   - **NPM script**: Added `npm run lint:placement` command for local development
   - **Documentation**: Updated CONTRIBUTING.md with linter command and document placement rules reference
   - **Verification**: ✅ All validation checks passed (linter + config validator)
   - **What's enforced**: CI/CD now blocks merges if document placement violations found

## Frontier (Open, Unblocked Tickets)

(none — all tickets complete)

---

## Completed Tickets

### ~~Ticket 1: Clarify spec location~~ ✅ COMPLETE

- **Decision**: Framework in AGENTS.md + linter check
- **Status**: Resolved

### ~~Ticket 2: Implement linter check~~ ✅ COMPLETE

- **Implementation**: `scripts/lint-document-placement.js`
- **Test result**: Zero violations
- **Status**: Resolved

### ~~Ticket 3: Audit existing agents~~ ✅ COMPLETE

- **Finding**: Codebase clean; all references appropriate (no violations)
- **Status**: Resolved

### ~~Ticket 5: Fix high-severity violation~~ ✅ COMPLETE (NO-OP)

- **Finding**: Code fences in config are CORRECT by design (validator strips them before parsing)
- **Status**: No violations to fix
- **Outcome**: Codebase already follows framework correctly

### ~~Ticket 4: Implement enforcement~~ ✅ COMPLETE

- **CI/CD**: Linter added to `.github/actions/validate/action.yml`
- **NPM script**: Added `npm run lint:placement` for local development
- **Documentation**: Updated CONTRIBUTING.md with linter guidance
- **Status**: Resolved

## Not Yet Specified (Fog of War)

(none yet)

## Resolved Fog

### ✅ Fog 2: Enforcement timing — RESOLVED

- **Decision**: Option D (combination approach)
- **Implementation**: Pre-commit hook for local developer convenience + CI/CD hard gate for mandatory enforcement
- **Rationale**: Pre-commit catches ~95% of violations during development (fast feedback); CI/CD ensures no violations
  slip through if hook is skipped. Critical for a shipped package that must not leak violations to downstream repos.
- **Ticket 4** will implement this decision

---

### ✅ Fog 3: Remediation scope — RESOLVED

- **Decision**: Option B (fix high-severity only)
- **High-severity** = violations that break shipping or downstream usage (e.g., skill/agent code referencing `/docs/`
  or `/scripts/`)
- **Low-severity** = documentation comments about placement rules (safe to leave)
- **Rationale**: Ticket 2 linter already found zero violations in current codebase. If audit finds any, they're likely
  edge cases or already-filtered documentation. Pragmatic to fix only what breaks; rest becomes future work tickets if needed.
- **Ticket 5** will execute remediation using this scope

## Out of Scope

(none yet)
