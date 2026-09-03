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

import { detectHarness, Harness, AzureRepoType } from '../index';

describe('Harness Detection', () => {
  // Save original state
  const originalEnv = process.env.COPILOT_CLI_MODE;
  const originalWindow = global.window;

  afterEach(() => {
    // Restore environment
    if (originalEnv === undefined) {
      delete process.env.COPILOT_CLI_MODE;
    } else {
      process.env.COPILOT_CLI_MODE = originalEnv;
    }

    // Restore window
    if (originalWindow === undefined) {
      delete (global as any).window;
    } else {
      (global as any).window = originalWindow;
    }
  });

  describe('Copilot CLI Detection', () => {
    it('detects Copilot CLI when COPILOT_CLI_MODE env var exists', () => {
      process.env.COPILOT_CLI_MODE = '1';

      const capabilities = detectHarness();

      expect(capabilities.harness).toBe(Harness.COPILOT_CLI);
      expect(capabilities.fleetModeAvailable).toBe(true);
      expect(capabilities.sequentialSpawningAvailable).toBe(true);
      expect(capabilities.canDetectAtRuntime).toBe(true);
      expect(capabilities.detectionReason).toContain('COPILOT_CLI_MODE');
    });

    it('does not detect Copilot CLI when env var is missing', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (global as any).window;
      delete (globalThis as any).VSS;
      delete (globalThis as any).TFS;

      const capabilities = detectHarness();

      expect(capabilities.harness).not.toBe(Harness.COPILOT_CLI);
    });
  });

  describe('Browser Detection', () => {
    it('detects Browser when window object exists', () => {
      delete process.env.COPILOT_CLI_MODE;
      (global as any).window = { document: {} };

      const capabilities = detectHarness();

      expect(capabilities.harness).toBe(Harness.BROWSER);
      expect(capabilities.fleetModeAvailable).toBe(false);
      expect(capabilities.sequentialSpawningAvailable).toBe(false);
      expect(capabilities.canDetectAtRuntime).toBe(true);
      expect(capabilities.detectionReason).toContain('window object');
    });

    it('requires both window and window.document for browser detection', () => {
      delete process.env.COPILOT_CLI_MODE;
      (global as any).window = {}; // No document

      const capabilities = detectHarness();

      expect(capabilities.harness).not.toBe(Harness.BROWSER);
    });
  });

  describe('Azure DevOps Detection', () => {
    it('detects Azure DevOps when VSS global exists', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (global as any).window;
      (globalThis as any).VSS = {};

      const capabilities = detectHarness();

      expect(capabilities.harness).toBe(Harness.AZURE_DEVOPS);
      expect(capabilities.sequentialSpawningAvailable).toBe(true);
      expect(capabilities.canDetectAtRuntime).toBe(true);
      expect(capabilities.detectionReason).toContain('Azure DevOps');
    });

    it('detects Azure DevOps when TFS global exists', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (global as any).window;
      (globalThis as any).TFS = {};

      const capabilities = detectHarness();

      expect(capabilities.harness).toBe(Harness.AZURE_DEVOPS);
      expect(capabilities.sequentialSpawningAvailable).toBe(true);
    });

    it('returns UNKNOWN repo type until Phase 2 research completes', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (global as any).window;
      (globalThis as any).VSS = {};

      const capabilities = detectHarness();

      expect(capabilities.harness).toBe(Harness.AZURE_DEVOPS);
      expect(capabilities.azureRepoType).toBe(AzureRepoType.UNKNOWN);
      // Fleet mode availability is conditional on repo type; UNKNOWN means unknown
      // Conservative behavior: assume false until we know for sure
    });
  });

  describe('Unknown Harness Detection', () => {
    it('defaults to UNKNOWN when no detection mechanism matches', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (global as any).window;
      delete (globalThis as any).VSS;
      delete (globalThis as any).TFS;

      const capabilities = detectHarness();

      expect(capabilities.harness).toBe(Harness.UNKNOWN);
      expect(capabilities.fleetModeAvailable).toBe(false);
      expect(capabilities.sequentialSpawningAvailable).toBe(true);
      expect(capabilities.canDetectAtRuntime).toBe(false);
      expect(capabilities.detectionReason).toContain('No detection mechanism matched');
    });

    it('provides sequential spawning fallback for unknown harnesses', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (global as any).window;

      const capabilities = detectHarness();

      // Even for unknown harnesses, sequential spawning should be available
      // (inline work is always an option)
      expect(capabilities.sequentialSpawningAvailable).toBe(true);
    });
  });

  describe('Detection Order (Specificity)', () => {
    it('prefers Copilot CLI over Browser', () => {
      process.env.COPILOT_CLI_MODE = '1';
      (global as any).window = { document: {} };

      const capabilities = detectHarness();

      expect(capabilities.harness).toBe(Harness.COPILOT_CLI);
    });

    it('prefers Browser over Azure DevOps', () => {
      delete process.env.COPILOT_CLI_MODE;
      (global as any).window = { document: {} };
      (globalThis as any).VSS = {};

      const capabilities = detectHarness();

      expect(capabilities.harness).toBe(Harness.BROWSER);
    });
  });

  describe('Phase 2 Blockers', () => {
    it('Kiro detection returns false until API is documented', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (global as any).window;

      const capabilities = detectHarness();

      // Kiro detection is Phase 2 blocker; should not match yet
      expect(capabilities.harness).not.toBe(Harness.KIRO);
    });

    it('Pi detection returns false until API is documented', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (global as any).window;

      const capabilities = detectHarness();

      // Pi detection is Phase 2 blocker; should not match yet
      expect(capabilities.harness).not.toBe(Harness.PI);
    });

    it('OpenCode detection returns false until API is documented', () => {
      delete process.env.COPILOT_CLI_MODE;
      delete (global as any).window;

      const capabilities = detectHarness();

      // OpenCode detection is Phase 2 blocker; should not match yet
      expect(capabilities.harness).not.toBe(Harness.OPENCODE);
    });
  });

  describe('Error Handling', () => {
    it('never throws on error; always returns valid capabilities', () => {
      // Even if detection is broken, the function should not throw
      expect(() => {
        const capabilities = detectHarness();
        expect(capabilities).toBeDefined();
        expect(capabilities.harness).toBeDefined();
      }).not.toThrow();
    });

    it('provides detectionReason for logging', () => {
      const capabilities = detectHarness();

      expect(capabilities.detectionReason).toBeDefined();
      expect(typeof capabilities.detectionReason).toBe('string');
      expect(capabilities.detectionReason.length).toBeGreaterThan(0);
    });
  });

  describe('Capability Flags Consistency', () => {
    it('sets sensible defaults across all harnesses', () => {
      const allHarnesses = [
        { harness: Harness.COPILOT_CLI, shouldHaveFleet: true },
        { harness: Harness.BROWSER, shouldHaveFleet: false },
        { harness: Harness.AZURE_DEVOPS, shouldHaveFleet: null }, // Conditional
        { harness: Harness.UNKNOWN, shouldHaveFleet: false }
      ];

      for (const test of allHarnesses) {
        delete process.env.COPILOT_CLI_MODE;
        delete (global as any).window;
        delete (globalThis as any).VSS;
        delete (globalThis as any).TFS;

        // Setup harness
        if (test.harness === Harness.COPILOT_CLI) {
          process.env.COPILOT_CLI_MODE = '1';
        } else if (test.harness === Harness.BROWSER) {
          (global as any).window = { document: {} };
        } else if (test.harness === Harness.AZURE_DEVOPS) {
          (globalThis as any).VSS = {};
        }

        const capabilities = detectHarness();
        if (test.harness === Harness.AZURE_DEVOPS) {
          // Conditional; depends on repo type
          expect(capabilities.harness).toBe(Harness.AZURE_DEVOPS);
        } else {
          expect(capabilities.fleetModeAvailable).toBe(test.shouldHaveFleet);
        }
      }
    });
  });
});
