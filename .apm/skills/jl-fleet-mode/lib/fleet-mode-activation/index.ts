/**
 * Fleet Mode Activation Strategy (AC5.1)
 *
 * Automatic spawning mode selection with graceful fallback.
 * Agents use this at delegation time to decide whether to spawn in fleet mode
 * (parallel), sequential (one at a time), or inline (no spawning).
 *
 * Decision: Agents never prompt the user; activation is silent and automatic.
 *
 * Reference: SKILL.md § Fleet Mode Utilization and Harness Detection
 *            SKILL.md § Activation Strategy: Automatic with Fallback
 */

import type { HarnessCapabilities } from '../harness-detection/index.ts';
import { Harness } from '../harness-detection/index.ts';

/**
 * Spawning modes in priority order (best to worst).
 * Agents try fleet first, fallback to sequential, fallback to inline.
 */
export const SpawningMode = {
  FLEET: 'fleet',
  SEQUENTIAL: 'sequential',
  INLINE: 'inline'
} as const;
export type SpawningMode = typeof SpawningMode[keyof typeof SpawningMode];

/**
 * Session state for fleet mode coordination.
 * Initialize once at session start; reuse throughout session.
 */
export interface FleetModeSession {
  harnessCapabilities: HarnessCapabilities;
  selectedMode: SpawningMode;
  activationLog: ActivationLogEntry[];
}

export interface ActivationLogEntry {
  timestamp: string;
  event: 'mode_selected' | 'fallback_attempted' | 'mode_unavailable';
  mode: SpawningMode;
  reason: string;
}

/**
 * Initialize fleet mode session with detected harness capabilities.
 * Call this once at session start.
 */
export function initializeFleetModeSession(
  harnessCapabilities: HarnessCapabilities
): FleetModeSession {
  const session: FleetModeSession = {
    harnessCapabilities,
    selectedMode: selectSpawningMode(harnessCapabilities),
    activationLog: []
  };

  const log: ActivationLogEntry = {
    timestamp: new Date().toISOString(),
    event: 'mode_selected',
    mode: session.selectedMode,
    reason: selectReasonForMode(harnessCapabilities, session.selectedMode)
  };

  session.activationLog.push(log);
  return session;
}

/**
 * Determine which spawning mode to use for the current harness.
 *
 * Decision logic (fallback chain):
 * 1. Try fleet mode if available
 * 2. Fall back to sequential if fleet unavailable
 * 3. Fall back to inline if sequential unavailable
 *
 * This selection is automatic; never block the agent or prompt the user.
 */
export function selectSpawningMode(
  capabilities: HarnessCapabilities
): SpawningMode {
  // Try fleet mode first (maximizes parallelization)
  if (capabilities.fleetModeAvailable) {
    return SpawningMode.FLEET;
  }

  // Fall back to sequential dispatch (one subagent at a time, isolated context)
  if (capabilities.sequentialSpawningAvailable) {
    return SpawningMode.SEQUENTIAL;
  }

  // Last resort: inline (no spawning, run work in current session)
  // Note: All harnesses support inline; this should rarely be reached
  return SpawningMode.INLINE;
}

/**
 * Explain why a mode was selected (for logging and debugging).
 */
function selectReasonForMode(
  capabilities: HarnessCapabilities,
  mode: SpawningMode
): string {
  switch (mode) {
    case SpawningMode.FLEET:
      return `${capabilities.harness} supports fleet mode (${capabilities.detectionReason})`;

    case SpawningMode.SEQUENTIAL:
      if (capabilities.fleetModeAvailable === false) {
        return `Fleet mode unavailable in ${capabilities.harness}; using sequential dispatch`;
      }
      return `Sequential dispatch available in ${capabilities.harness}`;

    case SpawningMode.INLINE:
      return `Fleet and sequential modes unavailable in ${capabilities.harness}; using inline work`;

    default:
      return 'Unknown mode selection reason';
  }
}

/**
 * Request a specific mode or use session default.
 *
 * Agents can optionally request a mode (e.g., "I need fleet mode for this"),
 * but the request is advisory. If the requested mode is unavailable,
 * silently fall back to the next best option without prompting the user.
 *
 * @param session - Current fleet mode session
 * @param requestedMode - Optional: preferred mode (advisory only)
 * @returns Selected mode and log of decisions made
 */
export function resolveSpawningMode(
  session: FleetModeSession,
  requestedMode?: SpawningMode
): { mode: SpawningMode; log: ActivationLogEntry } {
  let selectedMode = session.selectedMode;
  let logEntry: ActivationLogEntry;

  if (requestedMode && requestedMode !== session.selectedMode) {
    // Agent requested a specific mode; check if it's available
    const availableMode = selectSpawningMode(session.harnessCapabilities);

    if (requestedMode === availableMode) {
      // Requested mode is available; use it
      selectedMode = requestedMode;
      logEntry = {
        timestamp: new Date().toISOString(),
        event: 'mode_selected',
        mode: selectedMode,
        reason: `Agent requested ${requestedMode}; available in ${session.harnessCapabilities.harness}`
      };
    } else {
      // Requested mode is not available; log attempt and use fallback
      logEntry = {
        timestamp: new Date().toISOString(),
        event: 'fallback_attempted',
        mode: availableMode,
        reason: `Agent requested ${requestedMode}, but only ${availableMode} available in ${session.harnessCapabilities.harness}`
      };
      selectedMode = availableMode;
    }
  } else {
    // Use session default
    logEntry = {
      timestamp: new Date().toISOString(),
      event: 'mode_selected',
      mode: selectedMode,
      reason: `Using session default: ${selectedMode}`
    };
  }

  session.activationLog.push(logEntry);
  return { mode: selectedMode, log: logEntry };
}

/**
 * Get human-readable summary of activation log for debugging.
 *
 * Example output:
 *   [2026-09-03T23:17:19.000Z] mode_selected: fleet (Copilot CLI supports fleet mode)
 *   [2026-09-03T23:17:25.000Z] fallback_attempted: sequential (Agent requested fleet but unavailable in Browser)
 *   [2026-09-03T23:17:31.000Z] mode_selected: sequential (Using session default: sequential)
 */
export function getActivationLog(session: FleetModeSession): string {
  return session.activationLog
    .map((entry) => `[${entry.timestamp}] ${entry.event}: ${entry.mode} (${entry.reason})`)
    .join('\n');
}

/**
 * Get last selected mode from session log.
 */
export function getLastSelectedMode(session: FleetModeSession): SpawningMode {
  if (session.activationLog.length === 0) {
    return session.selectedMode;
  }

  const lastEntry = session.activationLog[session.activationLog.length - 1];
  return lastEntry.mode;
}

/**
 * Per-harness activation behavior (for agent guidance).
 *
 * Agents don't call this directly; it's reference material for understanding
 * why a mode was selected. The decision logic in selectSpawningMode() is the
 * authoritative implementation.
 */
export const HARNESS_ACTIVATION_BEHAVIOR = {
  [Harness.COPILOT_CLI]: {
    mode: SpawningMode.FLEET,
    reason: 'Copilot CLI supports native fleet mode via background task dispatch',
    userRecommendation: 'Fleet mode is native. Recommend /fleet to user for parallelizable work.'
  },

  [Harness.BROWSER]: {
    mode: SpawningMode.INLINE,
    reason: 'Browser harness has no subagent spawning support; inline only',
    userRecommendation: 'No spawning available. Run all work inline.'
  },

  [Harness.AZURE_DEVOPS]: {
    mode: 'CONDITIONAL',
    reason: 'Depends on linked repo type: GitHub (fleet) vs Azure Repos (inline)',
    userRecommendation:
      'Check repo type. If GitHub-linked: recommend /fleet. If Azure Repos: inline only.'
  },

  [Harness.KIRO]: {
    mode: SpawningMode.FLEET,
    reason: 'Kiro supports fleet mode if subagent tool is available',
    userRecommendation: 'Fleet mode available if subagent in tools array.'
  },

  [Harness.PI]: {
    mode: SpawningMode.SEQUENTIAL,
    reason: 'Pi capabilities unknown (Phase 2 blocker); conservative default',
    userRecommendation: 'Sequential dispatch as fallback until capabilities confirmed.'
  },

  [Harness.OPENCODE]: {
    mode: SpawningMode.SEQUENTIAL,
    reason: 'OpenCode capabilities unknown (Phase 2 blocker); conservative default',
    userRecommendation: 'Sequential dispatch as fallback until capabilities confirmed.'
  },

  [Harness.UNKNOWN]: {
    mode: SpawningMode.SEQUENTIAL,
    reason: 'Detection failed; conservative fallback',
    userRecommendation: 'Sequential dispatch as safe fallback.'
  }
};
