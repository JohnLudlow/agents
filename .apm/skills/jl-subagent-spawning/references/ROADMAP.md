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

Both planner agents should detect their harness at startup and automatically activate fleet mode:

```text
AT SESSION START (pseudocode from HARNESS_FALLBACK.md):
  harness = detect_harness()  [see pattern above]
  Store harness in session_state for reference

WHEN SPAWNING SUBAGENT(S):
  If harness == "copilot-cli":
    Use task tool with mode="background" for automatic parallelization
  Else if harness == "kiro" AND tools.includes("subagent"):
    Use fleet spawning (orchestrator will parallelize)
  Else if harness == "azure-devops" AND linked_repo_is_github:
    Use fleet spawning
  Else (browser, unknown, or fallback needed):
    Use sequential dispatch: spawn each subagent one at a time

ALWAYS (before completion):
  Invoke jl-adversarial-review skill (works in all harnesses)
  If skill unavailable: continue without review (graceful degradation)
```

**Implementation effort:** ~4–5 hours (harness detection APIs for Kiro/Azure, graceful degradation, testing across CLI/Kiro/Azure)

## Phase 3 (Future: User-Facing Documentation)

Create user documentation:

- Add "Subagent Spawning and Fleet Mode" section to docs/README.md
- Link to fleet mode troubleshooting guide
- Document how to detect your harness (Copilot CLI vs. browser vs. Azure DevOps vs. Kiro)
- Examples: when to use `/fleet`, how fallback chain works

**Implementation effort:** ~1–1.5 hours

## Phase 4 (Speculative: Unified DelegateToSubagent API)

If harness ecosystem provides stable capability, implement a unified `DelegateToSubagent` API that abstracts harness differences. See SKILL.md "DelegateToSubagent API Status" section for details.

**Implementation effort:** TBD (depends on harness API availability)

## Open Questions (Phase 2 Blockers)

- [ ] **Kiro detection API** — What environment variable, file, or API should agents check to detect Kiro CLI at session start? (Currently: unknown, defaulting to "unknown" harness)
- [ ] **Azure DevOps detection API** — What API should agents check at runtime to (a) detect Azure DevOps context, and (b) distinguish GitHub vs. Azure Repos? (Currently: unknown, defaulting to "unknown" harness)
- [ ] **Pi capabilities** — Does Pi support subagent spawning? Upstream documentation? Vendor confirmation needed.
- [ ] **OpenCode capabilities** — Does OpenCode support subagent spawning? Upstream documentation? Vendor confirmation needed.
- [ ] **Result coordination** — How should agents coordinate results from parallel subagents? Automatic or manual? API shape?
- [ ] **Sequential fallback refinement** — When sequential dispatch is used, should agents prefer herdr if available, or use a different mechanism?
