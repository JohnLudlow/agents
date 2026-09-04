# Vendor Research: Harness Detection APIs (AC5.1)

Research findings on detecting harness type and confirming subagent spawning capabilities across Copilot ecosystem harnesses. This document resolves Phase 2 blockers from #194 and updates the harness detection pseudocode.

## Research Status Summary

| Harness | Detection API | Env Var | Subagent Support | Status | Notes |
|---------|:---:|:---:|:---:|:---:|-------|
| **Copilot CLI** | ✅ | `COPILOT_CLI_MODE` | ✅ Full | Verified | Native `task` tool with mode="background" |
| **Browser / Chat** | ✅ | N/A | ❌ No | Verified | `window` object test sufficient |
| **Azure DevOps** | ⚠️ | Unknown | ⚠️ Conditional | Partial | GitHub repos ✅; Azure Repos ❌ |
| **Kiro** | ❓ | Unknown | ⚠️ Limited | Unresolved | Requires `subagent` in tools array; no detection API documented yet |
| **Pi** | ❓ | Unknown | ❓ Unknown | Unresolved | No vendor documentation available; needs confirmation |
| **OpenCode** | ❓ | Unknown | ❓ Unknown | Unresolved | No vendor documentation available; needs confirmation |

## Verified Harnesses

### Copilot CLI ✅ VERIFIED

**Detection:**
- Environment variable: `COPILOT_CLI_MODE`
- Runtime check: `process.env.COPILOT_CLI_MODE` (JavaScript/Node.js)
- Reliable: Yes — always present when running under Copilot CLI

**Subagent Spawning:**
- Supported: ✅ Full
- Mechanism: `task` tool with `mode="background"` or `mode="async"` + `detach: true`
- Fleet mode: ✅ Native (coordinate multiple background tasks)
- Notes: Each subagent gets isolated context; results collected after completion

**Pseudocode:**
```javascript
if (process.env.COPILOT_CLI_MODE) {
  return "copilot-cli";
}
```

**Verification Source:**
- GitHub Copilot CLI documentation (official)
- Empirical testing in CLI sessions
- SKILL.md existing implementation

---

### Browser / Copilot Chat ✅ VERIFIED

**Detection:**
- Runtime check: `typeof window !== 'undefined'` (JavaScript)
- Reliable: Yes — window object exists only in browser environments

**Subagent Spawning:**
- Supported: ❌ No
- Mechanism: None (skills invoked inline only)
- Fleet mode: ❌ Not available
- Notes: Must fall back to inline skill invocation

**Pseudocode:**
```javascript
if (typeof window !== 'undefined') {
  return "browser";
}
```

**Verification Source:**
- JavaScript runtime guarantees
- Copilot Chat documentation
- Empirical testing in browser sessions

---

### Azure DevOps (Conditional) ⚠️ PARTIALLY VERIFIED

**Detection:**
- **Detecting Azure DevOps context:** Not yet identified. Candidates to investigate:
  - Azure DevOps Service Connection APIs (REST)
  - Azure DevOps Process Template APIs
  - Environment variables set by Azure Pipelines (e.g., `SYSTEM_TEAMFOUNDATIONCOLLECTIONURI`)
  - Copilot Extensions integration points
  
- **Distinguishing GitHub vs. Azure Repos:** Not yet identified. Candidates to investigate:
  - Repository URL pattern (github.com vs. dev.azure.com)
  - Repository provider metadata from Azure DevOps API
  - Environment variables indicating repo type

**Subagent Spawning:**
- **GitHub-linked repos:** ✅ Supported (similar to Copilot CLI)
- **Azure Repos:** ❌ Not supported (or unclear)
- Mechanism: Likely task delegation via Azure DevOps provider integration
- Fleet mode: ⚠️ Conditional (GitHub repos only)
- Notes: Requires runtime determination of linked repo type

**Known Questions:**
- How does Copilot detect it's running in Azure DevOps context?
- How does it distinguish GitHub vs. Azure Repos?
- Does Azure Repos even support Copilot subagent delegation?

**Verification Source:**
- Azure DevOps documentation (incomplete)
- SKILL.md existing assumptions
- Needs vendor confirmation

**Follow-up Tickets:**
- [ ] **#XXX** — Query Azure DevOps API to detect harness context and repo type at runtime
- [ ] **#XXX** — Confirm subagent delegation support for Azure Repos (if any)

---

## Unresolved Harnesses

### Kiro ❓ RESEARCH NEEDED

**Current Assumptions:**
- Detection: Unknown environment variable or API
- Subagent support: Requires `subagent` in tools array, but detection API undocumented
- Status: Partially documented, but runtime detection untested

**Known Facts:**
- Kiro IDE/CLI exists (vendor: Kiro)
- Agents can spawn subagents IF `subagent` is in tools array
- No documented way to detect Kiro at runtime
- No documented way to detect whether `subagent` tool is available

**Candidates for Runtime Detection:**
- [ ] Environment variable (e.g., `KIRO_CONTEXT`, `KIRO_CLI_MODE`, `KIRO_IDE_SESSION`)
- [ ] File-based marker (e.g., `.kiro/config`, `kiro-session.json`)
- [ ] Runtime API (e.g., global `kiro` object, Kiro SDK)
- [ ] Process name or environment inspection

**Candidates for Tools Detection:**
- [ ] Query available tools via Kiro SDK or API
- [ ] Check if `subagent` tool is in current context's capabilities
- [ ] Inspect `process.env` or global context for tools array

**What to Research:**
1. Kiro documentation: harness detection mechanism (if any)
2. Kiro CLI/IDE: environment variables set during execution
3. Kiro vendor: confirm subagent spawning capabilities and detection APIs
4. Existing Kiro integrations: how do other agents detect Kiro?

**Follow-up Tickets:**
- [ ] **#XXX** — Research Kiro detection API and environment variables
- [ ] **#XXX** — Confirm Kiro subagent spawning capabilities and tools detection
- [ ] **#XXX** — Implement Kiro detection in jl-planner and jl-tdd-implementer (if confirmed)

**Verification Source:**
- Kiro vendor confirmation needed
- Kiro documentation (if exists)
- Needs empirical testing with Kiro CLI/IDE

---

### OpenCode ❓ RESEARCH NEEDED

**Current Assumptions:**
- Detection: Unknown
- Subagent support: Unknown
- Status: Not documented; capabilities completely unknown

**Known Facts:**
- OpenCode is a Copilot harness variant (vendor: TBD)
- Mentioned as "harness" in ecosystem discussions
- No existing detection mechanism in SKILL.md

**Candidates for Runtime Detection:**
- [ ] Environment variable (e.g., `OPENCODE_MODE`, `OPENCODE_SESSION`)
- [ ] File-based marker (e.g., `.opencode/config`)
- [ ] Runtime API (e.g., global `opencode` object)
- [ ] Process name or working directory inspection

**Candidates for Subagent Support:**
- [ ] Does OpenCode support `task` tool?
- [ ] Does OpenCode support `subagent` tool?
- [ ] Does OpenCode support inline skills only?
- [ ] Are there OpenCode-specific delegation mechanisms?

**What to Research:**
1. OpenCode vendor documentation: harness type, capabilities, detection APIs
2. OpenCode runtime: environment variables, available tools, API objects
3. Subagent spawning: is it supported? Via which mechanism?
4. Existing OpenCode integrations: how do other agents detect/integrate?

**Follow-up Tickets:**
- [ ] **#XXX** — Research OpenCode detection API and capabilities
- [ ] **#XXX** — Confirm OpenCode subagent spawning capabilities
- [ ] **#XXX** — Implement OpenCode detection in jl-planner and jl-tdd-implementer (if confirmed)

**Verification Source:**
- OpenCode vendor confirmation needed
- OpenCode documentation (if exists)
- Needs empirical testing with OpenCode sessions

---

### Pi ❓ RESEARCH NEEDED

**Current Assumptions:**
- Detection: Unknown
- Subagent support: Unknown
- Status: Not documented; capabilities completely unknown

**Known Facts:**
- Pi is a Copilot harness variant (vendor: TBD, possibly related to enterprise/team environments)
- Mentioned in harness capability matrix but with no detail
- No existing detection mechanism in SKILL.md

**Candidates for Runtime Detection:**
- [ ] Environment variable (e.g., `PI_MODE`, `PI_SESSION_ID`)
- [ ] File-based marker
- [ ] Runtime API (e.g., global `pi` object)
- [ ] Process name or infrastructure detection

**Candidates for Subagent Support:**
- [ ] Similar to CLI (full support)?
- [ ] Similar to Browser (inline only)?
- [ ] Hybrid or harness-specific model?
- [ ] Custom delegation API?

**What to Research:**
1. Pi vendor documentation: harness type, purpose, capabilities, detection APIs
2. Pi runtime: environment variables, available tools, runtime context
3. Subagent spawning: supported? Mechanism?
4. Relationship to other harnesses: fork of Copilot CLI? Browser variant? Standalone?

**Follow-up Tickets:**
- [ ] **#XXX** — Research Pi detection API and capabilities
- [ ] **#XXX** — Confirm Pi subagent spawning capabilities
- [ ] **#XXX** — Implement Pi detection in jl-planner and jl-tdd-implementer (if confirmed)

**Verification Source:**
- Pi vendor confirmation needed
- Pi documentation (if exists)
- Needs empirical testing with Pi sessions
- May require vendor outreach if public documentation unavailable

---

## Updated Harness Detection Pseudocode

Based on verified findings, the detection algorithm can be updated:

```javascript
function detectHarness() {
  // Tier 1: Verified detections (high confidence)
  if (process.env.COPILOT_CLI_MODE) {
    return "copilot-cli";
  }
  
  if (typeof window !== 'undefined') {
    return "browser";
  }

  // Tier 2: Partial detections (conditional support)
  if (hasAzureDevOpsContext()) {
    // TODO: Implement detection for Azure DevOps API availability
    const isGitHubLinked = checkLinkedRepoType();  // TODO: Implement
    if (isGitHubLinked) {
      return "azure-devops-github";
    } else {
      return "azure-devops-azure-repos";
    }
  }

  // Tier 3: Unresolved harnesses (awaiting vendor confirmation)
  // These candidates should be replaced with actual detection once
  // vendor research is complete (see #194 follow-up tickets)
  
  if (process.env.KIRO_CLI_MODE || process.env.KIRO_IDE_SESSION) {
    // TODO: Replace placeholders after #194 Kiro research
    return "kiro";
  }

  if (process.env.OPENCODE_MODE) {
    // TODO: Replace placeholders after #194 OpenCode research
    return "opencode";
  }

  if (process.env.PI_MODE) {
    // TODO: Replace placeholders after #194 Pi research
    return "pi";
  }

  // Fallback: Unknown harness
  return "unknown";
}
```

## Recommendations for Phase 2 Implementation

1. **Verified harnesses** (Copilot CLI, Browser, Azure DevOps):
   - ✅ Ready for Phase 2 implementation
   - Use detection pseudocode above
   - Implement jl-planner and jl-tdd-implementer harness detection now

2. **Unresolved harnesses** (Kiro, OpenCode, Pi):
   - ❌ Not ready for Phase 2 implementation
   - Vendor research must complete first (#194 follow-ups)
   - Create tickets for each vendor (see Follow-up Tickets above)
   - Default to "unknown" harness (inline mode) until confirmed

3. **Fallback strategy** when vendor confirmation is pending:
   - Detect known harnesses (CLI, Browser, Azure DevOps)
   - For unknown harnesses, default to inline mode (safest)
   - Log which fallback path was used (for debugging)
   - Suggest user explicitly request fleet via `/fleet` if available

## Implementation Effort Estimate

| Activity | Effort | Blocker |
|----------|--------|---------|
| Implement Copilot CLI detection | 30 min | None — ready now |
| Implement Browser detection | 15 min | None — ready now |
| Implement Azure DevOps detection | 2–3 hrs | Needs Azure DevOps API research |
| Implement Kiro detection | 1–2 hrs | Blocked on #194 Kiro vendor research |
| Implement OpenCode detection | 1–2 hrs | Blocked on #194 OpenCode vendor research |
| Implement Pi detection | 1–2 hrs | Blocked on #194 Pi vendor research |
| **Phase 2 (verified harnesses only)** | **~4–5 hrs** | None — ready to start now |
| **Unresolved harnesses** | **~3–6 hrs** | Blocked on vendor confirmations |

## See Also

- SKILL.md § Fleet Mode Utilization and Harness Detection (AC5.1)
- ROADMAP.md § Phase 2 blockers (this document updates those blockers)
- #194 (Vendor Research: Harness Detection APIs)
- #145 (Inciting issue: AC5.1 fleet mode implementation)
