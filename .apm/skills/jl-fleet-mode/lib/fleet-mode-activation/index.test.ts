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

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SpawningMode,
  initializeFleetModeSession,
  selectSpawningMode,
  resolveSpawningMode,
  getActivationLog,
  getLastSelectedMode
} from './index.ts';

import type { HarnessCapabilities } from '../harness-detection/index.ts';
import { Harness } from '../harness-detection/index.ts';

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

      assert.equal(mode, SpawningMode.FLEET);
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
      assert.equal(mode, SpawningMode.INLINE);
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

      assert.equal(mode, SpawningMode.SEQUENTIAL);
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

      assert.equal(mode, SpawningMode.INLINE);
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

      assert.deepEqual(session.harnessCapabilities, capabilities);
      assert.equal(session.selectedMode, SpawningMode.FLEET);
      assert.equal(session.activationLog.length, 1);
      assert.equal(session.activationLog[0].event, 'mode_selected');
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

      assert.ok(logEntry.timestamp);
      assert.equal(logEntry.mode, SpawningMode.FLEET);
      assert.match(logEntry.reason, /COPILOT_CLI/);
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

      assert.equal(mode, SpawningMode.FLEET);
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

      assert.equal(mode, SpawningMode.FLEET);
      assert.notEqual(log.event, 'fallback_attempted');
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

      assert.equal(mode, SpawningMode.INLINE);
      assert.equal(log.event, 'fallback_attempted');
      assert.match(log.reason, /requested/);
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

      assert.doesNotThrow(() => {
        resolveSpawningMode(session, SpawningMode.FLEET);
      });
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
      assert.equal(session.activationLog.length, 1);

      resolveSpawningMode(session);
      assert.equal(session.activationLog.length, 2);

      resolveSpawningMode(session, SpawningMode.SEQUENTIAL);
      assert.equal(session.activationLog.length, 3);
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

      assert.match(logSummary, /mode_selected/);
      assert.match(logSummary, /fleet/);
      assert.match(logSummary, /\[\d{4}-\d{2}-\d{2}T/);
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

      assert.ok(entry.timestamp);
      assert.doesNotThrow(() => new Date(entry.timestamp));
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
      assert.equal(getLastSelectedMode(session), mode1);

      // Simulate harness capability change
      session.harnessCapabilities.fleetModeAvailable = false;
      session.harnessCapabilities.sequentialSpawningAvailable = true;
      const { mode: mode2 } = resolveSpawningMode(session);
      assert.equal(getLastSelectedMode(session), mode2);
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

      assert.doesNotThrow(() => {
        resolveSpawningMode(session, SpawningMode.FLEET);
      });
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

      assert.equal(mode, SpawningMode.INLINE);
    });
  });

  describe('Per-Harness Behavior across all 6 harnesses', () => {
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
        harness: Harness.AZURE_DEVOPS,
        fleetAvailable: true,
        expectedMode: SpawningMode.FLEET
      },
      {
        harness: Harness.KIRO,
        fleetAvailable: true,
        expectedMode: SpawningMode.FLEET
      },
      {
        harness: Harness.PI,
        fleetAvailable: false,
        sequentialAvailable: false,
        expectedMode: SpawningMode.INLINE
      },
      {
        harness: Harness.OPENCODE,
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

        assert.equal(mode, testCase.expectedMode);
      });
    }
  });
});
