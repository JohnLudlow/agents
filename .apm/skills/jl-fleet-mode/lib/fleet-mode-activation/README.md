---
title: Fleet Mode Activation Strategy
---

## Fleet Mode Activation Strategy (AC5.1)

Automatic spawning mode selection with graceful fallback. Agents never prompt the user; activation is silent and automatic.

## What This Module Does

At delegation time, agents call `selectSpawningMode()` to get the best available spawning mode:

- **Fleet** (parallel subagent dispatch) — if harness supports it
- **Sequential** (one subagent at a time) — if fleet unavailable but sequential available
- **Inline** (no spawning, run in current session) — fallback of last resort

The decision is automatic; no user prompt. If a fallback occurs, the decision is logged for debugging but doesn't interrupt workflow.

## When to Call This Module

### At Session Start

Initialize the session with detected harness capabilities:

```typescript
import { detectHarness, initializeHarnessSessionState } from '@copilot/harness-detection';
import { initializeFleetModeSession } from '@copilot/fleet-mode-activation';

const detection = detectHarness();
const sessionState = initializeHarnessSessionState();
const session = initializeFleetModeSession(detection);

// Reuse session throughout the agent's lifetime
// Log is accumulated: session.activationLog
```

### At Delegation Time

Get the recommended spawning mode for delegating work:

```typescript
const { mode, log } = resolveSpawningMode(session);

if (mode === SpawningMode.FLEET) {
  // Spawn multiple subagents in parallel
} else if (mode === SpawningMode.SEQUENTIAL) {
  // Spawn one subagent at a time
} else {
  // Run work inline
}

// Optionally log the decision
console.log(log.reason);
```

### If an Agent Requests a Specific Mode

Agents can request a mode, but the request is advisory:

```typescript
const { mode, log } = resolveSpawningMode(session, SpawningMode.FLEET);

// If fleet is unavailable, silently falls through to sequential or inline
// Log shows the selected fallback mode for debugging
```

## Decision Logic (Fallback Chain)

```typescript
selectSpawningMode(capabilities):
  if capabilities.fleetModeAvailable:
    return FLEET
  else if capabilities.sequentialSpawningAvailable:
    return SEQUENTIAL
  else:
    return INLINE
```

**Key principle**: This module never blocks and never prompts. It resolves the
best in-harness mode, then logs the decision.

## AC5.3 Fallback Policy (Caller Layer)

If `resolveSpawningMode()` returns `SpawningMode.INLINE` because subagent
delegation is unavailable in the current harness:

1. Stay in the current harness by default.
2. If `HERDR_ENV=1` is present, the calling skill should offer an explicit
   choice: continue inline, or route via Herdr to a sibling session that can
   delegate.
3. Route via Herdr only when the user explicitly requests it.

The Herdr offer belongs to caller policy, not this module's mode-selection
logic.

## Per-Harness Activation Behavior

| Harness | Mode | Reason |
|---------|------|--------|
| Copilot CLI | **Fleet** | Native fleet mode support via background tasks |
| Browser | **Inline** | No subagent spawning support |
| Azure DevOps + GitHub | **Fleet** | Supports fleet mode |
| Azure DevOps + Azure Repos | **Sequential** | No subagent spawning API |
| Kiro | **Fleet** (if tools support) | Fleet mode available if `subagent` in tools |
| Pi | **Sequential** | Capabilities unknown (Phase 2 blocker); conservative fallback |
| OpenCode | **Sequential** | Capabilities unknown (Phase 2 blocker); conservative fallback |
| Unknown | **Sequential** | Detection failed; safe fallback |

## Activation Log

Every decision is logged with timestamp and reason:

```typescript
const log = getActivationLog(session);
console.log(log);

// Output:
// [2026-09-03T23:17:19.000Z] mode_selected: fleet (Copilot CLI supports fleet mode)
// [2026-09-03T23:17:25.000Z] fallback_attempted: inline (Agent requested fleet, unavailable in browser; falling back to inline)
```

Use this log for debugging why agents chose certain spawning modes or fell back.

## Key Design Decisions (Writing-for-Agents Principles)

**Single source of truth**: Implementation follows SKILL.md § Activation Strategy exactly. No duplication.

**No in-module user prompting**: Decision is automatic and silent. Any Herdr
offer on inline fallback is handled by caller policy.

**Conservative defaults**: Unknown capabilities default to sequential dispatch, not parallel.

**Leading word**: "Fallback" used consistently throughout. Emphasizes graceful degradation, never failures.

**Completion criteria**: Mode is selected once per session (or on-demand); agents reuse result. Decision is logged; log is exhaustive for debugging.

## Integration Pattern

Typical agent workflow:

```typescript
// At session start
const detection = detectHarness();
const sessionState = initializeHarnessSessionState();
const session = initializeFleetModeSession(detection);

// At delegation time (potentially many times)
for (const task of independentTasks) {
  const { mode } = resolveSpawningMode(session);

  if (mode === SpawningMode.FLEET) {
    // Spawn in parallel
    await Promise.all(tasks.map(t => spawnSubagent(t)));
  } else if (mode === SpawningMode.SEQUENTIAL) {
    // Spawn one at a time
    for (const t of tasks) {
      await spawnSubagent(t);
    }
  } else {
    // Run inline
    for (const t of tasks) {
      await runInline(t);
    }
  }
}

// At session end, retrieve log for debugging
console.log(getActivationLog(session));
```

## Requesting a Specific Mode

Agents can request a specific mode if they have strong constraints:

```typescript
// "I need fleet mode for this work to be efficient"
const { mode, log } = resolveSpawningMode(session, SpawningMode.FLEET);

if (log.event === 'fallback_attempted') {
  // Fleet not available; silently using the next available mode
  // Agent can log this for context: "Fleet mode unavailable; using fallback"
}
```

The module never blocks or prompts; it selects the best available mode and logs the decision.

## Next Steps

1. **Integrate into agent runtime**: Call `initializeFleetModeSession()` at agent session start
2. **Use at delegation time**: Call `resolveSpawningMode()` when delegating work
3. **Monitor activation log**: Retrieve and analyze `getActivationLog()` for debugging or metrics
4. **#192 Test & Validate**: Integration tests verify activation works across all harnesses
