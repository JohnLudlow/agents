/**
 * End-to-End Integration Test: Fleet Mode Runtime Lifecycle
 *
 * Validates complete end-to-end flow:
 * 1. Runtime harness detection
 * 2. Session initialization
 * 3. Spawning mode resolution and fallback handling
 * 4. Audit logging and session tracking
 *
 * Verifies behavior across all 6 target harnesses:
 * - Copilot CLI (native fleet mode)
 * - Browser (inline execution fallback)
 * - Azure DevOps (GitHub-backed fleet vs Azure Repos sequential)
 * - Kiro (fleet subagents)
 * - Pi (sequential fallback pending vendor confirmation)
 * - OpenCode (sequential fallback pending vendor confirmation)
 * - Unknown environment (conservative sequential fallback)
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  detectHarness,
  Harness,
  resetHarnessDetectionStateForTests,
  type HarnessCapabilities
} from './harness-detection/index.ts';

import {
  SpawningMode,
  initializeFleetModeSession,
  resolveSpawningMode,
  getActivationLog,
  getLastSelectedMode
} from './fleet-mode-activation/index.ts';

describe('Fleet Mode End-to-End Integration', () => {
  const originalEnv = { ...process.env };
  const originalWindow = (globalThis as any).window;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.COPILOT_CLI_MODE;
    delete process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI;
    delete process.env.BUILD_REPOSITORY_PROVIDER;
    delete process.env.BUILD_REPOSITORY_URI;
    delete (globalThis as any).window;
    delete (globalThis as any).VSS;
    delete (globalThis as any).TFS;
    resetHarnessDetectionStateForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    if (originalWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = originalWindow;
    }
    delete (globalThis as any).VSS;
    delete (globalThis as any).TFS;
    resetHarnessDetectionStateForTests();
  });

  describe('Full Lifecycle: Copilot CLI', () => {
    it('detects CLI, activates fleet mode, logs decisions', () => {
      process.env.COPILOT_CLI_MODE = '1';

      // 1. Detect harness
      const capabilities = detectHarness();
      assert.equal(capabilities.harness, Harness.COPILOT_CLI);
      assert.equal(capabilities.fleetModeAvailable, true);
      assert.equal(capabilities.sequentialSpawningAvailable, true);

      // 2. Initialize session
      const session = initializeFleetModeSession(capabilities);
      assert.equal(session.selectedMode, SpawningMode.FLEET);
      assert.equal(session.activationLog.length, 1);

      // 3. Resolve spawning mode for parallel subtask dispatch
      const { mode: task1Mode, log: task1Log } = resolveSpawningMode(session, SpawningMode.FLEET);
      assert.equal(task1Mode, SpawningMode.FLEET);
      assert.equal(task1Log.mode, SpawningMode.FLEET);

      // 4. Verify log contains timestamps and event trace
      const logSummary = getActivationLog(session);
      assert.match(logSummary, /mode_selected/);
      assert.equal(getLastSelectedMode(session), SpawningMode.FLEET);
    });
  });

  describe('Full Lifecycle: Browser Environment', () => {
    it('detects browser, falls back silently to inline mode', () => {
      (globalThis as any).window = { document: {} };

      // 1. Detect harness
      const capabilities = detectHarness();
      assert.equal(capabilities.harness, Harness.BROWSER);
      assert.equal(capabilities.fleetModeAvailable, false);
      assert.equal(capabilities.sequentialSpawningAvailable, false);

      // 2. Initialize session
      const session = initializeFleetModeSession(capabilities);
      assert.equal(session.selectedMode, SpawningMode.INLINE);

      // 3. Agent requests fleet mode -> graceful silent fallback to inline
      const { mode, log } = resolveSpawningMode(session, SpawningMode.FLEET);
      assert.equal(mode, SpawningMode.INLINE);
      assert.equal(log.event, 'fallback_attempted');
      assert.match(log.reason, /Agent requested fleet.*available/i);

      // 4. Verify audit trail records fallback
      assert.equal(session.activationLog.length, 2);
      assert.equal(getLastSelectedMode(session), SpawningMode.INLINE);
    });
  });

  describe('Full Lifecycle: Azure DevOps', () => {
    it('detects Azure DevOps Azure Repos and initializes sequential fallback', () => {
      process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI = 'https://dev.azure.com/example';
      process.env.BUILD_REPOSITORY_PROVIDER = 'TfsGit';
      process.env.BUILD_REPOSITORY_URI =
        'https://dev.azure.com/example/project/_git/johnludlow-agents';

      const capabilities = detectHarness();
      assert.equal(capabilities.harness, Harness.AZURE_DEVOPS_AZURE_REPOS);
      assert.equal(capabilities.sequentialSpawningAvailable, true);
      assert.equal(capabilities.canDetectAtRuntime, true);

      const session = initializeFleetModeSession(capabilities);
      assert.equal(session.selectedMode, SpawningMode.SEQUENTIAL);

      // Requesting fleet mode falls back to sequential when fleet unavailable
      const { mode, log } = resolveSpawningMode(session, SpawningMode.FLEET);
      assert.equal(mode, SpawningMode.SEQUENTIAL);
      assert.equal(log.event, 'fallback_attempted');
    });

    it('activates fleet mode for GitHub-linked Azure DevOps capabilities', () => {
      const gitHubLinkedCapabilities: HarnessCapabilities = {
        harness: Harness.AZURE_DEVOPS_GITHUB,
        fleetModeAvailable: true,
        subagentSpawningAvailable: true,
        sequentialSpawningFallback: true,
        capabilities: {
          fleetModeAvailable: true,
          subagentSpawningAvailable: true,
          sequentialSpawningFallback: true
        },
        sequentialSpawningAvailable: true,
        canDetectAtRuntime: true,
        azureRepoType: 'github',
        attemptedHarnesses: [Harness.AZURE_DEVOPS],
        detectionReason: 'Azure DevOps with GitHub connection'
      };

      const session = initializeFleetModeSession(gitHubLinkedCapabilities);
      assert.equal(session.selectedMode, SpawningMode.FLEET);

      const { mode } = resolveSpawningMode(session);
      assert.equal(mode, SpawningMode.FLEET);
    });
  });

  describe('Full Lifecycle: Kiro, Pi, OpenCode Phase 2 Harnesses', () => {
    it('handles Kiro capabilities with fleet mode support', () => {
      const kiroCapabilities: HarnessCapabilities = {
        harness: Harness.KIRO,
        fleetModeAvailable: true,
        subagentSpawningAvailable: true,
        sequentialSpawningFallback: true,
        capabilities: {
          fleetModeAvailable: true,
          subagentSpawningAvailable: true,
          sequentialSpawningFallback: true
        },
        sequentialSpawningAvailable: true,
        canDetectAtRuntime: false,
        attemptedHarnesses: [Harness.KIRO],
        detectionReason: 'Kiro environment detected'
      };

      const session = initializeFleetModeSession(kiroCapabilities);
      const { mode } = resolveSpawningMode(session);
      assert.equal(mode, SpawningMode.FLEET);
    });

    it('handles Pi capabilities with conservative sequential fallback', () => {
      const piCapabilities: HarnessCapabilities = {
        harness: Harness.PI,
        fleetModeAvailable: false,
        subagentSpawningAvailable: false,
        sequentialSpawningFallback: true,
        capabilities: {
          fleetModeAvailable: false,
          subagentSpawningAvailable: false,
          sequentialSpawningFallback: true
        },
        sequentialSpawningAvailable: true,
        canDetectAtRuntime: false,
        attemptedHarnesses: [Harness.PI],
        detectionReason: 'Pi environment detected'
      };

      const session = initializeFleetModeSession(piCapabilities);
      assert.equal(session.selectedMode, SpawningMode.SEQUENTIAL);

      const { mode } = resolveSpawningMode(session, SpawningMode.FLEET);
      assert.equal(mode, SpawningMode.SEQUENTIAL);
    });

    it('handles OpenCode capabilities with conservative sequential fallback', () => {
      const openCodeCapabilities: HarnessCapabilities = {
        harness: Harness.OPENCODE,
        fleetModeAvailable: false,
        subagentSpawningAvailable: false,
        sequentialSpawningFallback: true,
        capabilities: {
          fleetModeAvailable: false,
          subagentSpawningAvailable: false,
          sequentialSpawningFallback: true
        },
        sequentialSpawningAvailable: true,
        canDetectAtRuntime: false,
        attemptedHarnesses: [Harness.OPENCODE],
        detectionReason: 'OpenCode environment detected'
      };

      const session = initializeFleetModeSession(openCodeCapabilities);
      assert.equal(session.selectedMode, SpawningMode.SEQUENTIAL);
    });
  });

  describe('Full Lifecycle: Unknown Environment', () => {
    it('uses conservative sequential mode when environment cannot be detected', () => {
      const capabilities = detectHarness();
      assert.equal(capabilities.harness, Harness.UNKNOWN);
      assert.equal(capabilities.canDetectAtRuntime, false);
      assert.equal(capabilities.fleetModeAvailable, false);
      assert.equal(capabilities.sequentialSpawningAvailable, true);

      const session = initializeFleetModeSession(capabilities);
      assert.equal(session.selectedMode, SpawningMode.SEQUENTIAL);

      const { mode, log } = resolveSpawningMode(session, SpawningMode.FLEET);
      assert.equal(mode, SpawningMode.SEQUENTIAL);
      assert.equal(log.event, 'fallback_attempted');
    });
  });

  describe('Multi-Task Workflow Execution Simulation', () => {
    it('handles a sequence of 5 independent subtasks with consistent audit logging in CLI', () => {
      process.env.COPILOT_CLI_MODE = '1';

      const capabilities = detectHarness();
      const session = initializeFleetModeSession(capabilities);

      const subtasks = [
        { name: 'research-task', requestedMode: SpawningMode.FLEET },
        { name: 'planning-task', requestedMode: SpawningMode.FLEET },
        { name: 'review-task', requestedMode: SpawningMode.FLEET },
        { name: 'inline-validation', requestedMode: undefined },
        { name: 'final-task', requestedMode: undefined }
      ];

      const executionResults: SpawningMode[] = [];

      for (const task of subtasks) {
        const { mode } = resolveSpawningMode(session, task.requestedMode);
        executionResults.push(mode);
      }

      assert.deepEqual(executionResults, [
        SpawningMode.FLEET,
        SpawningMode.FLEET,
        SpawningMode.FLEET,
        SpawningMode.FLEET,
        SpawningMode.FLEET
      ]);

      // 1 initial + 5 subtasks = 6 log entries
      assert.equal(session.activationLog.length, 6);
    });

    it('handles a sequence of subtasks in Browser with automatic fallback on every task', () => {
      (globalThis as any).window = { document: {} };

      const capabilities = detectHarness();
      const session = initializeFleetModeSession(capabilities);

      const subtasks = [
        { name: 'research-task', requestedMode: SpawningMode.FLEET },
        { name: 'planning-task', requestedMode: SpawningMode.FLEET },
        { name: 'review-task', requestedMode: SpawningMode.SEQUENTIAL }
      ];

      const executionResults: SpawningMode[] = [];

      for (const task of subtasks) {
        const { mode } = resolveSpawningMode(session, task.requestedMode);
        executionResults.push(mode);
      }

      assert.deepEqual(executionResults, [
        SpawningMode.INLINE,
        SpawningMode.INLINE,
        SpawningMode.INLINE
      ]);

      // 1 initial + 3 fallback tasks = 4 log entries
      assert.equal(session.activationLog.length, 4);
      assert.equal(session.activationLog[1].event, 'fallback_attempted');
    });
  });
});
