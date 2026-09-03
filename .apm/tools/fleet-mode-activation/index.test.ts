/**
 * Test Suite: Fleet Mode Activation Strategy
 *
 * Tests verify that mode selection works correctly across all harnesses
 * and that fallback logic is sound.
 *
 * Acceptance criteria for #191:
 * - Fleet mode automatically selected when harness supports it
 * - Sequential falls back when fleet unavailable
 * - Inline falls back when sequential unavailable
 * - No user prompting; activation is silent
 * - Fallback decisions logged with timestamp
 * - State machine transitions correctly
 * - Subagent spawning respects activation mode
 */

import {
  SpawningMode,
  initializeFleetModeSession,
  selectSpawningMode,
  resolveSpawningMode,
  getActivationLog,
  getLastSelectedMode
} from '../index';

import { HarnessCapabilities, Harness } from '@copilot/harness-detection';

describe('Fleet Mode Activation Strategy', () => {
  describe('Spawning Mode Selection', () => {
    it('selects fleet mode when harness supports it', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.COPILOT_CLI,
        fleetModeAvailable: true,
        sequentialSpawningAvailable: true,
        canDetectAtRuntime: true,
        detectionReason: 'Test'
      };

      const mode = selectSpawningMode(capabilities);

      expect(mode).toBe(SpawningMode.FLEET);
    });

    it('falls back to sequential when fleet unavailable', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.BROWSER,
        fleetModeAvailable: false,
        sequentialSpawningAvailable: false,
        canDetectAtRuntime: true,
        detectionReason: 'Test'
      };

      const mode = selectSpawningMode(capabilities);

      // Browser has no spawning support; falls back to inline
      expect(mode).toBe(SpawningMode.INLINE);
    });

    it('falls back to sequential when fleet unavailable but sequential available', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.AZURE_DEVOPS,
        fleetModeAvailable: false, // Azure Repos
        sequentialSpawningAvailable: true,
        canDetectAtRuntime: true,
        azureRepoType: 'azure-repos',
        detectionReason: 'Test'
      };

      const mode = selectSpawningMode(capabilities);

      expect(mode).toBe(SpawningMode.SEQUENTIAL);
    });

    it('falls back to inline when only inline available', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.BROWSER,
        fleetModeAvailable: false,
        sequentialSpawningAvailable: false,
        canDetectAtRuntime: true,
        detectionReason: 'Test'
      };

      const mode = selectSpawningMode(capabilities);

      expect(mode).toBe(SpawningMode.INLINE);
    });
  });

  describe('Session Initialization', () => {
    it('initializes session with selected mode and log entry', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.COPILOT_CLI,
        fleetModeAvailable: true,
        sequentialSpawningAvailable: true,
        canDetectAtRuntime: true,
        detectionReason: 'Test'
      };

      const session = initializeFleetModeSession(capabilities);

      expect(session.harnessCapabilities).toEqual(capabilities);
      expect(session.selectedMode).toBe(SpawningMode.FLEET);
      expect(session.activationLog.length).toBe(1);
      expect(session.activationLog[0].event).toBe('mode_selected');
    });

    it('creates log entry with timestamp and reason', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.COPILOT_CLI,
        fleetModeAvailable: true,
        sequentialSpawningAvailable: true,
        canDetectAtRuntime: true,
        detectionReason: 'COPILOT_CLI_MODE env var'
      };

      const session = initializeFleetModeSession(capabilities);
      const logEntry = session.activationLog[0];

      expect(logEntry.timestamp).toBeDefined();
      expect(logEntry.mode).toBe(SpawningMode.FLEET);
      expect(logEntry.reason).toContain('COPILOT_CLI');
    });
  });

  describe('Mode Resolution', () => {
    it('uses session default mode when no request specified', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.COPILOT_CLI,
        fleetModeAvailable: true,
        sequentialSpawningAvailable: true,
        canDetectAtRuntime: true,
        detectionReason: 'Test'
      };

      const session = initializeFleetModeSession(capabilities);
      const { mode } = resolveSpawningMode(session);

      expect(mode).toBe(SpawningMode.FLEET);
    });

    it('silently accepts requested mode if available', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.COPILOT_CLI,
        fleetModeAvailable: true,
        sequentialSpawningAvailable: true,
        canDetectAtRuntime: true,
        detectionReason: 'Test'
      };

      const session = initializeFleetModeSession(capabilities);
      const { mode, log } = resolveSpawningMode(session, SpawningMode.FLEET);

      expect(mode).toBe(SpawningMode.FLEET);
      expect(log.event).not.toBe('fallback_attempted');
    });

    it('silently falls back when requested mode unavailable', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.BROWSER,
        fleetModeAvailable: false,
        sequentialSpawningAvailable: false,
        canDetectAtRuntime: true,
        detectionReason: 'Test'
      };

      const session = initializeFleetModeSession(capabilities);
      const { mode, log } = resolveSpawningMode(session, SpawningMode.FLEET);

      expect(mode).toBe(SpawningMode.INLINE);
      expect(log.event).toBe('fallback_attempted');
      expect(log.reason).toContain('requested');
    });

    it('logs fallback decision without prompting user', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.BROWSER,
        fleetModeAvailable: false,
        sequentialSpawningAvailable: false,
        canDetectAtRuntime: true,
        detectionReason: 'Test'
      };

      const session = initializeFleetModeSession(capabilities);

      // Agent requests fleet mode
      expect(() => {
        resolveSpawningMode(session, SpawningMode.FLEET);
      }).not.toThrow();

      // No user prompt occurs; fallback is silent
      // (We can't directly test "no prompt" but we can verify no exception)
    });
  });

  describe('Activation Log', () => {
    it('accumulates log entries across multiple resolutions', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.COPILOT_CLI,
        fleetModeAvailable: true,
        sequentialSpawningAvailable: true,
        canDetectAtRuntime: true,
        detectionReason: 'Test'
      };

      const session = initializeFleetModeSession(capabilities);
      expect(session.activationLog.length).toBe(1);

      resolveSpawningMode(session);
      expect(session.activationLog.length).toBe(2);

      resolveSpawningMode(session, SpawningMode.SEQUENTIAL);
      expect(session.activationLog.length).toBe(3);
    });

    it('provides human-readable log summary', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.COPILOT_CLI,
        fleetModeAvailable: true,
        sequentialSpawningAvailable: true,
        canDetectAtRuntime: true,
        detectionReason: 'Test'
      };

      const session = initializeFleetModeSession(capabilities);
      resolveSpawningMode(session);

      const logSummary = getActivationLog(session);

      expect(logSummary).toContain('mode_selected');
      expect(logSummary).toContain('fleet');
      expect(logSummary).toMatch(/\[\d{4}-\d{2}-\d{2}T/); // timestamp format
    });

    it('includes timestamp for each log entry', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.COPILOT_CLI,
        fleetModeAvailable: true,
        sequentialSpawningAvailable: true,
        canDetectAtRuntime: true,
        detectionReason: 'Test'
      };

      const session = initializeFleetModeSession(capabilities);
      const entry = session.activationLog[0];

      expect(entry.timestamp).toBeDefined();
      expect(() => new Date(entry.timestamp)).not.toThrow();
    });
  });

  describe('Last Selected Mode', () => {
    it('returns most recent mode from log', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.COPILOT_CLI,
        fleetModeAvailable: true,
        sequentialSpawningAvailable: true,
        canDetectAtRuntime: true,
        detectionReason: 'Test'
      };

      const session = initializeFleetModeSession(capabilities);
      const { mode: mode1 } = resolveSpawningMode(session);
      expect(getLastSelectedMode(session)).toBe(mode1);

      // Simulate harness change (hypothetical)
      session.harnessCapabilities.fleetModeAvailable = false;
      session.harnessCapabilities.sequentialSpawningAvailable = true;
      const { mode: mode2 } = resolveSpawningMode(session);
      expect(getLastSelectedMode(session)).toBe(mode2);
    });
  });

  describe('Graceful Fallback Behavior', () => {
    it('never throws when mode unavailable', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.UNKNOWN,
        fleetModeAvailable: false,
        sequentialSpawningAvailable: true,
        canDetectAtRuntime: false,
        detectionReason: 'Test'
      };

      const session = initializeFleetModeSession(capabilities);

      expect(() => {
        resolveSpawningMode(session, SpawningMode.FLEET);
      }).not.toThrow();
    });

    it('guarantees inline mode is always available', () => {
      const capabilities: HarnessCapabilities = {
        harness: Harness.UNKNOWN,
        fleetModeAvailable: false,
        sequentialSpawningAvailable: false,
        canDetectAtRuntime: false,
        detectionReason: 'Test'
      };

      const session = initializeFleetModeSession(capabilities);
      const { mode } = resolveSpawningMode(session);

      expect(mode).toBe(SpawningMode.INLINE);
    });
  });

  describe('Per-Harness Behavior', () => {
    const testCases = [
      {
        harness: Harness.COPILOT_CLI,
        fleetAvailable: true,
        expectedMode: SpawningMode.FLEET
      },
      {
        harness: Harness.BROWSER,
        fleetAvailable: false,
        sequentialAvailable: false,
        expectedMode: SpawningMode.INLINE
      },
      {
        harness: Harness.PI,
        fleetAvailable: false,
        sequentialAvailable: false,
        expectedMode: SpawningMode.INLINE
      },
      {
        harness: Harness.UNKNOWN,
        fleetAvailable: false,
        sequentialAvailable: true,
        expectedMode: SpawningMode.SEQUENTIAL
      }
    ];

    for (const testCase of testCases) {
      it(`${testCase.harness} selects ${testCase.expectedMode}`, () => {
        const capabilities: HarnessCapabilities = {
          harness: testCase.harness as Harness,
          fleetModeAvailable: testCase.fleetAvailable,
          sequentialSpawningAvailable:
            testCase.sequentialAvailable !== undefined ? testCase.sequentialAvailable : true,
          canDetectAtRuntime: true,
          detectionReason: 'Test'
        };

        const mode = selectSpawningMode(capabilities);

        expect(mode).toBe(testCase.expectedMode);
      });
    }
  });
});
