---
name: jl-fleet-mode
description: Fleet mode coordination modules for parallel subagent spawning across harnesses (AC5.1)
---

# jl-fleet-mode

Shared utility modules for fleet mode coordination. Implements automatic harness detection and spawning mode selection with graceful fallback.

## Overview

This skill provides two core modules used by agents that delegate work to subagents:

1. **Harness Detection** (`lib/harness-detection/`) — Detects which Copilot harness an agent is running in and capability flags
2. **Fleet Mode Activation** (`lib/fleet-mode-activation/`) — Selects spawning mode (fleet/sequential/inline) based on detected harness

## When to Use

Use this skill when:

- Your agent or skill delegates work to subagents
- You need to know which spawning mode to use (parallel fleet vs sequential vs inline)
- You're implementing AC5.1 (Fleet mode as subagent assistant)
- You need to log and debug spawning decisions across harnesses

## Modules

### 1. Harness Detection

**File:** `lib/harness-detection/`

Detects current harness at session start and returns the detected harness plus capability flags.

```typescript
import { detectHarness, initializeHarnessSessionState } from '@copilot/harness-detection';

const detection = detectHarness();
const sessionState = initializeHarnessSessionState();

if (detection.capabilities.fleetModeAvailable) {
  // Copilot CLI or Azure DevOps with GitHub
} else if (detection.capabilities.sequentialSpawningFallback) {
  // Azure Repos or unknown harness
}
```

**Supported harnesses:**

- Copilot CLI (fleet available, COPILOT_CLI_MODE env var)
- Browser (inline only, window object)
- Azure DevOps GitHub-linked (fleet available)
- Azure DevOps Azure Repos (sequential fallback)
- Kiro (Phase 2 blocker: detection API unknown)
- Pi (Phase 2 blocker: capabilities unknown)
- OpenCode (Phase 2 blocker: capabilities unknown)
- Unknown (conservative fallback to sequential)

See `lib/harness-detection/README.md` for full usage guide.

### 2. Fleet Mode Activation

**File:** `lib/fleet-mode-activation/`

Selects spawning mode (fleet/sequential/inline) with automatic fallback and logging.

```typescript
import { initializeFleetModeSession, resolveSpawningMode, SpawningMode } from '@copilot/fleet-mode-activation';

const detection = detectHarness();
const sessionState = initializeHarnessSessionState();
const session = initializeFleetModeSession(detection);

const { mode } = resolveSpawningMode(session);

if (mode === SpawningMode.FLEET) {
  // Spawn subagents in parallel
} else if (mode === SpawningMode.SEQUENTIAL) {
  // Spawn one subagent at a time
} else {
  // Run work inline
}
```

**Key behavior:**

- Automatic mode selection; never prompts the user
- Silent fallback with logging for debugging
- Respects requested mode if available; silently falls back otherwise

See `lib/fleet-mode-activation/README.md` for full usage guide.

## Design Principles

This skill follows "writing-for-agents" principles:

- **Single source of truth**: Implements exactly what SKILL.md § Fleet Mode Utilization documents
- **Progressive disclosure**: Core logic is tight; detailed logging doesn't bloat decision path
- **No-ops removed**: Only decision logic that changes behavior
- **Conservative defaults**: Unknown capabilities fall back to sequential, never crash
- **Completion criteria**: Mode selection deterministic; activation log exhaustive for debugging

## Integration Pattern

Typical agent workflow:

```typescript
// At session start
import { detectHarness, initializeHarnessSessionState } from '@copilot/harness-detection';
import { initializeFleetModeSession } from '@copilot/fleet-mode-activation';

const detection = detectHarness();
const sessionState = initializeHarnessSessionState();
const session = initializeFleetModeSession(detection);

// Store session in agent state for reuse throughout session

// At delegation time
import { resolveSpawningMode, SpawningMode } from '@copilot/fleet-mode-activation';

const { mode, log } = resolveSpawningMode(session);

// Use mode to decide spawning strategy
// Log decision for debugging
```

## Phase 2 Blockers

Three harnesses require vendor research before detection can complete:

| Harness | Question | Tracked in |
|---------|----------|-----------|
| Kiro | What env var or API identifies Kiro at runtime? | #205 |
| Pi | What env var or API identifies Pi? Does Herdr integration matter? | #205 |
| OpenCode | What env var or API identifies OpenCode? | #205 |

See `.apm/skills/jl-subagent-spawning/references/ROADMAP.md` Phase 2 section for detailed blocker tracking.

## References

- SKILL.md § Fleet Mode Utilization and Harness Detection — Authoritative specification
- AC5.1 Planning Map — `docs/plans/map-ac5-1-fleet-mode.md`
- ROADMAP.md — Implementation phases and Phase 2 blockers

## Related Work

- #190 (Impl: Harness Detection Module) — Implemented detectHarness()
- #191 (Impl: Fleet Mode Activation Strategy) — Implemented selectSpawningMode()
- #192 (Impl: Test & Validate Fleet Mode) — Integration tests across harnesses
- #193 (Impl: User-Facing Documentation) — User guide for fleet mode
