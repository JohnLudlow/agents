---
title: Harness Detection Module
---

## Harness Detection Module (AC5.1)

Reliable runtime detection of Copilot harness type and capability flags for fleet mode coordination.

## What This Module Does

At session start, agents call `detectHarness()` once and get back:

- **Harness type** (Copilot CLI, Browser, Azure DevOps GitHub, Azure DevOps Azure Repos, Unknown)
- **Capability flags** (`fleetModeAvailable`, `subagentSpawningAvailable`, `sequentialSpawningFallback`)
- **Detection reason** (which mechanism fired; for logging)

Agents use these capabilities to decide whether to spawn subagents in fleet mode, sequential dispatch, or inline.

## When to Call This Module

Call `detectHarness()` exactly once at session initialization, before any subagent spawning decisions:

```typescript
import { detectHarness, initializeHarnessSessionState } from '@copilot/harness-detection';

const detection = detectHarness();
const sessionState = initializeHarnessSessionState();

if (detection.capabilities.fleetModeAvailable) {
  // Parallel subagent spawning is safe
} else if (detection.capabilities.sequentialSpawningFallback) {
  // Spawn one subagent at a time
} else {
  // Run work inline (last resort)
}
```

Store the result in session state and reuse it throughout the session — detection is idempotent and expensive; run it once.

## Detection Mechanism (Order of Specificity)

Detection runs in this order; first match wins:

1. **Copilot CLI**: Check `COPILOT_CLI_MODE` environment variable
2. **Browser**: Check for JavaScript `window` object
3. **Azure DevOps**: Check for VSS/TFS global objects; secondary detection for repo type
4. **Kiro** (Phase 2): Check `KIRO_CLI_MODE` or `KIRO_IDE_SESSION` environment variables
5. **OpenCode** (Phase 2): Check `OPENCODE_MODE` environment variable
6. **Pi** (Phase 2): Check `PI_MODE` environment variable
7. **Unknown**: Conservative fallback (sequential spawning available)

**Phase 2 Status**: ✅ Detection patterns implemented (#194 vendor research complete). Patterns are based on recommended environment variable conventions from vendor research; final confirmation pending vendor documentation updates.

## Capability Matrix

| Harness | Fleet Mode | Sequential | Detection Status |
|---------|:----------:|:----------:|------------------|
| Copilot CLI | ✅ Yes | ✅ Yes | ✅ Phase 1 |
| Browser | ❌ No | ❌ No | ✅ Phase 1 |
| Azure DevOps + GitHub | ✅ Yes | ✅ Yes | ✅ Phase 1 |
| Azure DevOps + Azure Repos | ❌ No | ✅ Yes | ✅ Phase 1 |
| Kiro | ❌ No | ✅ Yes | ✅ Phase 2 (#194) |
| Pi | ❌ No | ✅ Yes | ✅ Phase 2 (#194) |
| OpenCode | ❌ No | ✅ Yes | ✅ Phase 2 (#194) |
| Unknown | ❌ No | ✅ Yes | ✅ Fallback |

**Note**: Phase 2 harnesses are detected based on environment variable patterns identified in #194 vendor research. Capabilities are conservatively set to sequential spawning only (fleet mode unavailable) pending vendor confirmation of actual subagent support.

## Azure DevOps Secondary Detection

For Azure DevOps harnesses, the module runs a secondary detection step to determine if the repository is:

- **GitHub-linked** → fleet mode is available
- **Azure Repos** → fleet mode is unavailable (no subagent spawning API)

**Current Status**: Phase 1 implementation uses verified runtime candidates:

- Azure DevOps env vars (`SYSTEM_TEAMFOUNDATIONCOLLECTIONURI`, `BUILD_REPOSITORY_URI`, `BUILD_REPOSITORY_PROVIDER`)
- Azure DevOps globals (`VSS`, `TFS`)
- Repository URL/provider heuristics (`github.com` vs `dev.azure.com` / `visualstudio.com`)

## Phase 2 Implementation (AC5.1 Completion)

Phase 2 harness detection is now implemented with the following patterns based on #194 vendor research:

| Harness | Environment Variables | Detection Function | Status |
|---------|----------------------|-------------------|--------|
| Kiro | `KIRO_CLI_MODE`, `KIRO_IDE_SESSION` | `hasKiroMarker()` | ✅ Implemented |
| OpenCode | `OPENCODE_MODE` | `hasOpenCodeMarker()` | ✅ Implemented |
| Pi | `PI_MODE` | `hasPiMarker()` | ✅ Implemented |

**Note on Vendor Confirmation**: These detection patterns follow the conventions established by Copilot CLI and align with recommendations from #194 vendor research. However, final confirmation is still pending from vendors to validate:

- Correctness of environment variable names
- Whether alternative detection mechanisms are preferred (e.g., file-based markers, APIs, globals)
- Actual subagent spawning capabilities for each harness

Adjust detection patterns as needed if vendor documentation specifies different environment variables or APIs.

**Fallback Behavior**: Until vendor confirmation arrives, Phase 2 harnesses are detected but default to sequential spawning availability (fleet mode unavailable). This is the safest approach — agents can run but won't attempt parallel dispatch until capabilities are confirmed.

## Error Handling

All detection functions are wrapped in try-catch blocks and return conservative defaults on error:

- Unknown harness → sequential spawning available, fleet mode not available
- Detection never throws; it always returns a valid `HarnessCapabilities` object

This means detection failures are graceful: agents fall back to sequential dispatch and logging, not crashes.

## Logging and Debugging

Store and log the `detectionReason` field for debugging:

```typescript
const sessionState = initializeHarnessSessionState();
console.log(`Harness: ${sessionState.harness} (${sessionState.detectionReason})`);
```

The reason explains which detection mechanism fired, which is useful when:

- Debugging why fleet mode is unavailable
- Investigating fallback behavior
- Validating harness detection in CI/CD

## Single Source of Truth

This module implements the harness detection patterns documented in:

- `SKILL.md` § Fleet Mode Utilization and Harness Detection (capability matrix, decision tree)
- `ROADMAP.md` (Phase 2 blockers and implementation plan)

The pseudocode in SKILL.md is the authoritative specification. This module's implementation follows it directly.

## Next Steps

1. **Close #190 AC5.2 and AC5.3**: Phase 2 detection is complete (Kiro, OpenCode, Pi)
2. **Unblock #145 Fleet Mode Utilization**: Document fleet mode behavior in jl-recon now that detection supports all harnesses
3. **Integration tests**: #192 (Test & Validate Fleet Mode) should verify detection works with Kiro, OpenCode, Pi markers
4. **Vendor confirmation follow-up**: Monitor #194 for vendor documentation updates; adjust detection patterns if needed
5. **Capability upgrades**: Once vendor confirmation arrives, update `deriveCapabilities()` to set `fleetModeAvailable: true` for confirmed harnesses
