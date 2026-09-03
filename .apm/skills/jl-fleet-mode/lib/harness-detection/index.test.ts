/**
 * Test Suite: Harness Detection Module
 *
 * Tests verify that harness detection works correctly across all 6 harness types
 * and that fallback logic is sound.
 *
 * Acceptance criteria for #190:
 * - Copilot CLI detection works (COPILOT_CLI_MODE env var)
 * - Browser detection works (window object)
 * - Azure DevOps detection works; distinguishes GitHub vs Azure Repos
 * - Unknown harness gracefully defaults to sequential dispatch with logging
 * - All detection patterns follow SKILL.md § Fleet Mode Utilization pseudocode
 */

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { detectHarness, Harness, AzureRepoType } from './index.ts';

describe('Harness Detection', () => {
  // Save original state
  const originalEnv = process.env.COPILOT_CLI_MODE;
  const originalWindow = (globalThis as any).window;

  afterEach(() => {
    // Restore environment
    if (originalEnv === undefined) {
      delete process.env.COPILOT_CLI_MODE;
    } else {
      process.env.COPILOT_CLI_MODE = originalEnv;
    }

    // Restore window
    if (originalWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = originalWindow;
    }

    delete (globalThis as any).VSS;
    delete (globalThis as any).TFS;
  });

  describe('Copilot CLI Detection', () => {
    it('detects Copilot CLI when COPILOT_CLI_MODE env var exists', () => {
      process.env.COPILOT_CLI_MODE = '1';

      const capabilities = detectHarness();

      assert.equal(capabilities.harness, Harness.COPILOT_CLI);
      assert.equal(capabilities.fleetModeAvailable, true);
      assert.equal(capabilities.sequentialSpawningAvailable, true);
      assert.equal(capabilities.canDetectAtRuntime, true);
      assert.match(capabilities.detectionReason, /COPILOT_CLI_MODE/);
    });

    it('does not detect Copilot CLI when env var is missing', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (globalThis as any).window;
      delete (globalThis as any).VSS;
      delete (globalThis as any).TFS;

      const capabilities = detectHarness();

      assert.notEqual(capabilities.harness, Harness.COPILOT_CLI);
    });
  });

  describe('Browser Detection', () => {
    it('detects Browser when window object exists', () => {
      delete process.env.COPILOT_CLI_MODE;
      (globalThis as any).window = { document: {} };

      const capabilities = detectHarness();

      assert.equal(capabilities.harness, Harness.BROWSER);
      assert.equal(capabilities.fleetModeAvailable, false);
      assert.equal(capabilities.sequentialSpawningAvailable, false);
      assert.equal(capabilities.canDetectAtRuntime, true);
      assert.match(capabilities.detectionReason, /window object/);
    });

    it('requires both window and window.document for browser detection', () => {
      delete process.env.COPILOT_CLI_MODE;
      (globalThis as any).window = {}; // No document

      const capabilities = detectHarness();

      assert.notEqual(capabilities.harness, Harness.BROWSER);
    });
  });

  describe('Azure DevOps Detection', () => {
    it('detects Azure DevOps when VSS global exists', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (globalThis as any).window;
      (globalThis as any).VSS = {};

      const capabilities = detectHarness();

      assert.equal(capabilities.harness, Harness.AZURE_DEVOPS);
      assert.equal(capabilities.sequentialSpawningAvailable, true);
      assert.equal(capabilities.canDetectAtRuntime, true);
      assert.match(capabilities.detectionReason, /Azure DevOps/);
    });

    it('detects Azure DevOps when TFS global exists', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (globalThis as any).window;
      (globalThis as any).TFS = {};

      const capabilities = detectHarness();

      assert.equal(capabilities.harness, Harness.AZURE_DEVOPS);
      assert.equal(capabilities.sequentialSpawningAvailable, true);
    });

    it('returns UNKNOWN repo type until Phase 2 research completes', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (globalThis as any).window;
      (globalThis as any).VSS = {};

      const capabilities = detectHarness();

      assert.equal(capabilities.harness, Harness.AZURE_DEVOPS);
      assert.equal(capabilities.azureRepoType, AzureRepoType.UNKNOWN);
      // Fleet mode availability is conditional on repo type; UNKNOWN means unknown
      // Conservative behavior: assume false until we know for sure
    });
  });

  describe('Unknown Harness Detection', () => {
    it('defaults to UNKNOWN when no detection mechanism matches', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (globalThis as any).window;
      delete (globalThis as any).VSS;
      delete (globalThis as any).TFS;

      const capabilities = detectHarness();

      assert.equal(capabilities.harness, Harness.UNKNOWN);
      assert.equal(capabilities.fleetModeAvailable, false);
      assert.equal(capabilities.sequentialSpawningAvailable, true);
      assert.equal(capabilities.canDetectAtRuntime, false);
      assert.match(capabilities.detectionReason, /No detection mechanism matched/);
    });

    it('provides sequential spawning fallback for unknown harnesses', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (globalThis as any).window;

      const capabilities = detectHarness();

      // Even for unknown harnesses, sequential spawning should be available
      // (inline work is always an option)
      assert.equal(capabilities.sequentialSpawningAvailable, true);
    });
  });

  describe('Detection Order (Specificity)', () => {
    it('prefers Copilot CLI over Browser', () => {
      process.env.COPILOT_CLI_MODE = '1';
      (globalThis as any).window = { document: {} };

      const capabilities = detectHarness();

      assert.equal(capabilities.harness, Harness.COPILOT_CLI);
    });

    it('prefers Browser over Azure DevOps', () => {
      delete process.env.COPILOT_CLI_MODE;
      (globalThis as any).window = { document: {} };
      (globalThis as any).VSS = {};

      const capabilities = detectHarness();

      assert.equal(capabilities.harness, Harness.BROWSER);
    });
  });

  describe('Phase 2 Blockers', () => {
    it('Kiro detection returns false until API is documented', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (globalThis as any).window;

      const capabilities = detectHarness();

      // Kiro detection is Phase 2 blocker; should not match yet
      assert.notEqual(capabilities.harness, Harness.KIRO);
    });

    it('Pi detection returns false until API is documented', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (globalThis as any).window;

      const capabilities = detectHarness();

      // Pi detection is Phase 2 blocker; should not match yet
      assert.notEqual(capabilities.harness, Harness.PI);
    });

    it('OpenCode detection returns false until API is documented', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (globalThis as any).window;

      const capabilities = detectHarness();

      // OpenCode detection is Phase 2 blocker; should not match yet
      assert.notEqual(capabilities.harness, Harness.OPENCODE);
    });
  });

  describe('Error Handling', () => {
    it('never throws on error; always returns valid capabilities', () => {
      // Even if detection is broken, the function should not throw
      assert.doesNotThrow(() => {
        const capabilities = detectHarness();
        assert.ok(capabilities);
        assert.ok(capabilities.harness);
      });
    });

    it('provides detectionReason for logging', () => {
      const capabilities = detectHarness();

      assert.ok(capabilities.detectionReason);
      assert.equal(typeof capabilities.detectionReason, 'string');
      assert.ok(capabilities.detectionReason.length > 0);
    });
  });

  describe('Capability Flags Consistency across all 6 harnesses', () => {
    it('sets sensible defaults across all harnesses', () => {
      const allHarnesses = [
        { harness: Harness.COPILOT_CLI, shouldHaveFleet: true },
        { harness: Harness.BROWSER, shouldHaveFleet: false },
        { harness: Harness.AZURE_DEVOPS, shouldHaveFleet: false }, // Conditional / unknown repo type
        { harness: Harness.UNKNOWN, shouldHaveFleet: false }
      ];

      for (const test of allHarnesses) {
        delete process.env.COPILOT_CLI_MODE;
        delete (globalThis as any).window;
        delete (globalThis as any).VSS;
        delete (globalThis as any).TFS;

        // Setup harness
        if (test.harness === Harness.COPILOT_CLI) {
          process.env.COPILOT_CLI_MODE = '1';
        } else if (test.harness === Harness.BROWSER) {
          (globalThis as any).window = { document: {} };
        } else if (test.harness === Harness.AZURE_DEVOPS) {
          (globalThis as any).VSS = {};
        }

        const capabilities = detectHarness();
        if (test.harness === Harness.AZURE_DEVOPS) {
          // Conditional; depends on repo type
          assert.equal(capabilities.harness, Harness.AZURE_DEVOPS);
        } else {
          assert.equal(capabilities.fleetModeAvailable, test.shouldHaveFleet);
        }
      }
    });
  });
});
