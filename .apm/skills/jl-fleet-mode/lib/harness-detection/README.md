---
title: Harness Detection Module
---

## Harness Detection Module (AC5.1)

Reliable runtime detection of Copilot harness type and capability flags for fleet mode coordination.

## What This Module Does

At session start, agents call `detectHarness()` once and get back:

- **Harness type** (Copilot CLI, Browser, Azure DevOps, Kiro, OpenCode, Pi, Unknown)
- **Capability flags** (`fleetModeAvailable`, `sequentialSpawningAvailable`)
- **Detection reason** (which mechanism fired; for logging)

Agents use these capabilities to decide whether to spawn subagents in fleet mode, sequential dispatch, or inline.

## When to Call This Module

Call `detectHarness()` exactly once at session initialization, before any subagent spawning decisions:

```typescript
import { detectHarness } from '@copilot/harness-detection';

const capabilities = detectHarness();

if (capabilities.fleetModeAvailable) {
  // Parallel subagent spawning is safe
} else if (capabilities.sequentialSpawningAvailable) {
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
4. **Kiro**: Reserved for Phase 2 vendor research (#205)
5. **Pi**: Reserved for Phase 2 vendor research (#205)
6. **OpenCode**: Reserved for Phase 2 vendor research (#205)
7. **Unknown**: Conservative fallback (sequential spawning available)

## Capability Matrix

| Harness | Fleet Mode | Sequential | Detection Status |
|---------|:----------:|:----------:|------------------|
| Copilot CLI | ✅ Yes | ✅ Yes | ✅ Implemented |
| Browser | ❌ No | ❌ No | ✅ Implemented |
| Azure DevOps + GitHub | ✅ Yes | ✅ Yes | ⚠️ Partial (repo type detection TODO) |
| Azure DevOps + Azure Repos | ❌ No | ✅ Yes | ⚠️ Partial (repo type detection TODO) |
| Kiro | ✅ Yes (assumed) | ✅ Yes | 🔴 Phase 2 blocker (#205) |
| Pi | ❓ Unknown | ❓ Unknown | 🔴 Phase 2 blocker (#205) |
| OpenCode | ❓ Unknown | ❓ Unknown | 🔴 Phase 2 blocker (#205) |
| Unknown | ❌ No | ✅ Yes | ✅ Fallback |

## Azure DevOps Secondary Detection

For Azure DevOps harnesses, the module runs a secondary detection step to determine if the repository is:

- **GitHub-linked** → fleet mode is available
- **Azure Repos** → fleet mode is unavailable (no subagent spawning API)

**Current Status**: Placeholder implementation. Phase 2 vendor research (#205) must document the runtime API for distinguishing repo types.

**TODO**: Replace placeholder `detectAzureRepoType()` with real detection once API is documented.

## Phase 2 Blockers (Vendor Research)

Three harnesses require vendor confirmation before detection can complete:

| Harness | Question | Reference |
|---------|----------|-----------|
| Kiro | What environment variable or API identifies Kiro at runtime? | ROADMAP.md Phase 2 |
| Pi | What environment variable or API identifies Pi? Does Herdr integration matter? | ROADMAP.md Phase 2 |
| OpenCode | What environment variable or API identifies OpenCode? | ROADMAP.md Phase 2 |

See `.apm/skills/jl-subagent-spawning/references/ROADMAP.md` for the full Phase 2 blocker list and tracking status.

## Error Handling

All detection functions are wrapped in try-catch blocks and return conservative defaults on error:

- Unknown harness → sequential spawning available, fleet mode not available
- Detection never throws; it always returns a valid `HarnessCapabilities` object

This means detection failures are graceful: agents fall back to sequential dispatch and logging, not crashes.

## Logging and Debugging

Store and log the `detectionReason` field for debugging:

```typescript
const capabilities = detectHarness();
console.log(`Harness: ${capabilities.harness} (${capabilities.detectionReason})`);
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

1. **Integrate into agent runtime**: Agents must call `detectHarness()` at session start
2. **Use capabilities in spawning strategy**: Make spawn/fallback decisions based on returned flags
3. **Phase 2 vendor research**: Complete #205 to unblock Kiro, Pi, and OpenCode detection
4. **Integration tests**: #192 (Test & Validate Fleet Mode) must verify detection works across all harnesses
