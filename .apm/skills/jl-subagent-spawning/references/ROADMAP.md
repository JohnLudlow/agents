# Implementation Roadmap

## Phase 1 (Complete)

- ✅ Convert jl-feature-reviewer agent → jl-adversarial-review skill
- ✅ Document cross-harness behavior (this reference)
- ✅ Document fleet mode patterns and harness detection (AC5.1, #185/#186)

## Phase 2 (Future: Harness Detection and Automatic Activation)

Implement harness detection in both planner agents and automatically activate fleet mode when available.

### Key Decisions from AC5.1 (#185, #186)

**Harness Detection Pattern (from #185 Research):**

```text
AT SESSION START:
  harness = detect_harness()
    - If env var COPILOT_CLI_MODE exists: return "copilot-cli" ✅ VERIFIED
    - Else if window object exists (JavaScript): return "browser" ✅ VERIFIED
    - Else if Azure DevOps APIs available: return "azure-devops" ⚠️ Detection API unknown
    - Else if Kiro orchestrator context: return "kiro" ❓ Detection API unknown
    - Else: return "unknown"
```

**Verified Capabilities:**

- ✅ Copilot CLI: Full fleet mode support via `task` tool (native, use mode="background")
- ✅ Kiro IDE/CLI: Full subagent spawning (requires `subagent` in tools array, but detection API not yet documented)
- ⚠️ Azure DevOps: Subagent spawning ONLY for GitHub-linked repos (NOT Azure Repos); detection API not yet documented
- ❌ Browser: No subagent spawning, skills inline only
- ❓ Pi: Capabilities completely unknown; vendor confirmation needed
- ❓ OpenCode: Capabilities completely unknown; vendor confirmation needed

**Activation Strategy (from #186 Quiz):**

- Automatic: Agents always use fleet mode when available (no user opt-in required)
- Fallback chain: Fleet mode → sequential subagent dispatch → herdr (expert workaround) → inline
- Rationale: Clean per-subagent context prevents context depletion; silent fallback with logging

### Implementation Tasks

**Phase 2 splits into two phases:**

#### Phase 2a: Harness Detection (Ready Now — #190)

Implement runtime harness detection at session startup. See `references/HARNESS_DETECTION_IMPLEMENTATION.md` for full specification.

**Scope:**
- ✅ Copilot CLI detection (verified, ready now)
- ✅ Browser detection (verified, ready now)
- ⚠️ Azure DevOps detection (partially verified, detection API candidates in #194)
- ❓ Kiro/OpenCode/Pi detection (blocked on #194 vendor research follow-ups)

**Implementation effort:**
- Phase 2a (Verified + Partial): ~1–2 hours
  - CLI detection: 15 min
  - Browser detection: 15 min
  - Azure DevOps detection: 1–1.5 hrs
  - Session state initialization: 15–30 min
- Phase 2b (Unresolved harnesses): 1–2 hrs each (after vendor research)

**Deliverable:** `HarnessDetector` module that returns detected harness + capability flags

#### Phase 2b: Fleet Mode Activation (After #190 — #191)

Implement automatic fleet mode activation based on detected harness.

```text
AT SESSION START:
  harness = detect_harness()  [via HarnessDetector from #190]
  Store harness in session_state for reference

WHEN SPAWNING SUBAGENT(S):
  activation_mode = selectActivationMode(harness, sessionState)
  
  If activation_mode == "fleet":
    Use task tool with mode="background" for automatic parallelization
  Else if activation_mode == "sequential":
    Spawn each subagent one at a time, each with isolated context
  Else (inline):
    Run work directly in parent session, no subagent spawning

ALWAYS (before completion):
  Invoke jl-adversarial-review skill (works in all harnesses)
  If skill unavailable: continue without review (graceful degradation)
```

**Implementation effort:** ~2–3 hours (state machine, fallback chain, logging)

## Phase 2.5 (Current: Vendor Research — #194)

Research and document harness detection APIs for unresolved harnesses. See `references/VENDOR_RESEARCH_HARNESS_DETECTION.md` for detailed findings.

**Status:**
- ✅ Copilot CLI: Detection verified (`COPILOT_CLI_MODE` env var)
- ✅ Browser: Detection verified (`window` object)
- ⚠️ Azure DevOps: Partial verification (detection API still unknown; GitHub vs. Azure Repos distinction not yet documented)
- ❓ Kiro: Unresolved (no detection API documented; vendor confirmation pending)
- ❓ OpenCode: Unresolved (capabilities unknown; vendor confirmation pending)
- ❓ Pi: Unresolved (capabilities unknown; vendor confirmation pending)

**Blockers (awaiting vendor research outcomes):**
- [ ] Azure DevOps detection API (detection mechanism for Azure DevOps context + repo type distinction)
- [ ] Kiro detection API or environment variable
- [ ] OpenCode capabilities and detection API
- [ ] Pi capabilities and detection API

**Research document:** `references/VENDOR_RESEARCH_HARNESS_DETECTION.md` — findings, candidates, follow-up tickets for each unresolved harness.

**Implementation effort:** 0 hours (research only; implementation blocked on vendor confirmations)

---

## Phase 3 (Future: User-Facing Documentation)

Create user documentation:

- ✅ Add "Subagent Spawning and Fleet Mode" section to docs/README.md (completed in #193)
- Link to fleet mode troubleshooting guide
- Document how to detect your harness (Copilot CLI vs. browser vs. Azure DevOps vs. others)
- Examples: when to use `/fleet`, how fallback chain works

**Implementation effort:** ~2 hours (copy vendor research findings into user-facing format)

---

## Phase 4 (Speculative: Unified DelegateToSubagent API)

If harness ecosystem provides stable capability, implement a unified `DelegateToSubagent` API that abstracts harness differences. See SKILL.md
"DelegateToSubagent API Status" section for details.

**Implementation effort:** TBD (depends on harness API availability)

---

## Remaining Open Questions (Phase 2–4 Blockers)

**Phase 2 blockers (vendor research):**
- [ ] **Kiro detection API** — What environment variable, file, or API should agents check at session start? Candidates in vendor research doc.
- [ ] **Azure DevOps detection API** — How to detect (a) Azure DevOps context, and (b) distinguish GitHub-linked vs. Azure Repos? Candidates in vendor research doc.
- [ ] **Pi capabilities** — Does Pi support subagent spawning? Vendor confirmation needed.
- [ ] **OpenCode capabilities** — Does OpenCode support subagent spawning? Vendor confirmation needed.

**Phase 3–4 blockers (design/implementation):**
- [ ] **Result coordination** — How should agents coordinate results from parallel subagents? Automatic or manual? API shape?
- [ ] **Sequential fallback refinement** — When sequential dispatch is used, should agents prefer herdr if available, or use a different mechanism?
