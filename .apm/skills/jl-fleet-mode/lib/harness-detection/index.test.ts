import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AzureRepoType,
  Harness,
  detectHarness,
  getHarnessSessionState,
  initializeHarnessSessionState,
  resetHarnessDetectionStateForTests,
  type StructuredLogger
} from './index.ts';

type MutableGlobals = typeof globalThis & {
  window?: unknown;
  VSS?: unknown;
  TFS?: unknown;
  azureDevOps?: unknown;
};

const originalEnv = {
  COPILOT_CLI_MODE: process.env.COPILOT_CLI_MODE,
  SYSTEM_TEAMFOUNDATIONCOLLECTIONURI: process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI,
  SYSTEM_COLLECTIONURI: process.env.SYSTEM_COLLECTIONURI,
  SYSTEM_TEAMPROJECT: process.env.SYSTEM_TEAMPROJECT,
  BUILD_REPOSITORY_URI: process.env.BUILD_REPOSITORY_URI,
  BUILD_REPOSITORY_PROVIDER: process.env.BUILD_REPOSITORY_PROVIDER,
  SYSTEM_PULLREQUEST_SOURCEREPOSITORYURI: process.env.SYSTEM_PULLREQUEST_SOURCEREPOSITORYURI,
  SYSTEM_PULLREQUEST_SOURCEREPOSITORYPROVIDER:
    process.env.SYSTEM_PULLREQUEST_SOURCEREPOSITORYPROVIDER,
  // Phase 2 environment variables
  KIRO_CLI_MODE: process.env.KIRO_CLI_MODE,
  KIRO_IDE_SESSION: process.env.KIRO_IDE_SESSION,
  OPENCODE_MODE: process.env.OPENCODE_MODE,
  PI_MODE: process.env.PI_MODE
};

const originalGlobals = {
  window: (globalThis as MutableGlobals).window,
  VSS: (globalThis as MutableGlobals).VSS,
  TFS: (globalThis as MutableGlobals).TFS,
  azureDevOps: (globalThis as MutableGlobals).azureDevOps
};

afterEach(() => {
  restoreEnvironment();
  restoreGlobals();
  resetHarnessDetectionStateForTests();
});

describe('Harness Detection', () => {
  describe('Copilot CLI detection', () => {
    it('detects Copilot CLI from COPILOT_CLI_MODE and derives capability flags', () => {
      process.env.COPILOT_CLI_MODE = '1';

      const detection = detectHarness();

      assert.equal(detection.harness, Harness.COPILOT_CLI);
      assert.deepEqual(detection.capabilities, {
        fleetModeAvailable: true,
        subagentSpawningAvailable: true,
        sequentialSpawningFallback: true
      });
      assert.equal(detection.fleetModeAvailable, true);
      assert.equal(detection.subagentSpawningAvailable, true);
      assert.equal(detection.sequentialSpawningFallback, true);
      assert.equal(detection.sequentialSpawningAvailable, true);
      assert.match(detection.detectionReason, /COPILOT_CLI_MODE/);
    });
  });

  describe('Browser detection', () => {
    it('detects Browser when window exists', () => {
      (globalThis as MutableGlobals).window = {};

      const detection = detectHarness();

      assert.equal(detection.harness, Harness.BROWSER);
      assert.deepEqual(detection.capabilities, {
        fleetModeAvailable: false,
        subagentSpawningAvailable: false,
        sequentialSpawningFallback: false
      });
      assert.equal(detection.subagentSpawningAvailable, false);
      assert.equal(detection.sequentialSpawningFallback, false);
      assert.match(detection.detectionReason, /window object/);
    });

    it('stops after the first match and prefers Copilot CLI over Browser', () => {
      process.env.COPILOT_CLI_MODE = '1';
      (globalThis as MutableGlobals).window = {};

      const detection = detectHarness();

      assert.equal(detection.harness, Harness.COPILOT_CLI);
    });
  });

  describe('Azure DevOps detection', () => {
    it('detects GitHub-linked Azure DevOps from pipeline environment variables', () => {
      process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI = 'https://dev.azure.com/example';
      process.env.BUILD_REPOSITORY_PROVIDER = 'GitHub';
      process.env.BUILD_REPOSITORY_URI = 'https://github.com/JohnLudlow/agents';

      const detection = detectHarness();

      assert.equal(detection.harness, Harness.AZURE_DEVOPS_GITHUB);
      assert.equal(detection.azureRepoType, AzureRepoType.GITHUB);
      assert.deepEqual(detection.capabilities, {
        fleetModeAvailable: true,
        subagentSpawningAvailable: true,
        sequentialSpawningFallback: true
      });
    });

    it('detects Azure Repos Azure DevOps from provider metadata', () => {
      process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI = 'https://dev.azure.com/example';
      process.env.BUILD_REPOSITORY_PROVIDER = 'TfsGit';
      process.env.BUILD_REPOSITORY_URI =
        'https://dev.azure.com/example/project/_git/johnludlow-agents';

      const detection = detectHarness();

      assert.equal(detection.harness, Harness.AZURE_DEVOPS_AZURE_REPOS);
      assert.equal(detection.azureRepoType, AzureRepoType.AZURE_REPOS);
      assert.deepEqual(detection.capabilities, {
        fleetModeAvailable: false,
        subagentSpawningAvailable: false,
        sequentialSpawningFallback: true
      });
    });

    it('detects Azure DevOps from VSS global and repo URL candidates', () => {
      (globalThis as MutableGlobals).VSS = {
        getWebContext: () => ({
          repository: {
            url: 'https://github.com/JohnLudlow/agents'
          }
        })
      };

      const detection = detectHarness();

      assert.equal(detection.harness, Harness.AZURE_DEVOPS_GITHUB);
      assert.equal(detection.azureRepoType, AzureRepoType.GITHUB);
    });

    it('falls back to unknown if Azure DevOps context exists but repo type is ambiguous', () => {
      process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI = 'https://dev.azure.com/example';
      delete process.env.BUILD_REPOSITORY_PROVIDER;
      delete process.env.BUILD_REPOSITORY_URI;

      const detection = detectHarness();

      assert.equal(detection.harness, Harness.UNKNOWN);
      assert.match(detection.detectionReason, /Phase 1.*Phase 2/);
    });
  });

  describe('Session state initialization and logging', () => {
    it('stores detection once per session and reuses the cached result', () => {
      process.env.COPILOT_CLI_MODE = '1';

      const firstDetection = detectHarness();
      const sessionState = initializeHarnessSessionState({
        info() {}
      });
      delete process.env.COPILOT_CLI_MODE;
      (globalThis as MutableGlobals).window = {};
      const secondDetection = detectHarness();

      assert.equal(firstDetection.harness, Harness.COPILOT_CLI);
      assert.equal(secondDetection.harness, Harness.COPILOT_CLI);
      assert.deepEqual(sessionState.capabilities, firstDetection.capabilities);
      assert.deepEqual(getHarnessSessionState()?.capabilities, firstDetection.capabilities);
    });

    it('logs detection result and capability flags at initialization', () => {
      process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI = 'https://dev.azure.com/example';
      process.env.BUILD_REPOSITORY_PROVIDER = 'GitHub';
      process.env.BUILD_REPOSITORY_URI = 'https://github.com/JohnLudlow/agents';

      const logEntries: Array<{ message: string; data?: Record<string, unknown> }> = [];
      const logger: StructuredLogger = {
        info(message, data) {
          logEntries.push({ message, data });
        }
      };

      const sessionState = initializeHarnessSessionState(logger);

      assert.equal(sessionState.harness, Harness.AZURE_DEVOPS_GITHUB);
      assert.equal(logEntries.length, 2);
      assert.equal(logEntries[0].message, 'Harness detected');
      assert.equal(logEntries[1].message, 'Harness capabilities initialized');
      assert.equal(logEntries[1].data?.fleetModeAvailable, true);
      assert.equal(logEntries[1].data?.subagentSpawningAvailable, true);
      assert.equal(logEntries[1].data?.sequentialSpawningFallback, true);
    });

    it('logs the fallback path when detection resolves to unknown', () => {
      const logEntries: Array<{ message: string; data?: Record<string, unknown> }> = [];
      const logger: StructuredLogger = {
        info(message, data) {
          logEntries.push({ message, data });
        }
      };

      const sessionState = initializeHarnessSessionState(logger);

      assert.equal(sessionState.harness, Harness.UNKNOWN);
      assert.equal(logEntries.length, 3);
      assert.equal(logEntries[0].message, 'Harness detection falling back to unknown');
      assert.deepEqual(logEntries[0].data?.tried, [
        Harness.COPILOT_CLI,
        Harness.BROWSER,
        Harness.AZURE_DEVOPS,
        Harness.KIRO,
        Harness.OPENCODE,
        Harness.PI
      ]);
    });
  });

  describe('Integration sequence', () => {
    it('tries CLI then Browser then Azure DevOps then Unknown fallback', () => {
      process.env.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI = 'https://dev.azure.com/example';
      process.env.BUILD_REPOSITORY_PROVIDER = 'TfsGit';
      process.env.BUILD_REPOSITORY_URI =
        'https://dev.azure.com/example/project/_git/johnludlow-agents';

      const detection = detectHarness();

      assert.deepEqual(detection.attemptedHarnesses, [
        Harness.COPILOT_CLI,
        Harness.BROWSER,
        Harness.AZURE_DEVOPS
      ]);
      assert.equal(detection.harness, Harness.AZURE_DEVOPS_AZURE_REPOS);
    });
  });

  describe('Phase 2: Kiro detection', () => {
    it('detects Kiro from KIRO_CLI_MODE environment variable', () => {
      process.env.KIRO_CLI_MODE = '1';

      const detection = detectHarness();

      assert.equal(detection.harness, Harness.KIRO);
      assert.equal(detection.fleetModeAvailable, false);
      assert.equal(detection.sequentialSpawningAvailable, true);
    });

    it('detects Kiro from KIRO_IDE_SESSION environment variable', () => {
      process.env.KIRO_IDE_SESSION = 'session-123';

      const detection = detectHarness();

      assert.equal(detection.harness, Harness.KIRO);
      assert.equal(detection.detectionReason, 'Kiro harness detected via environment variables (KIRO_CLI_MODE or KIRO_IDE_SESSION)');
    });

    it('prioritizes Kiro detection after Azure DevOps in sequence', () => {
      process.env.KIRO_CLI_MODE = '1';

      const detection = detectHarness();

      assert.deepEqual(detection.attemptedHarnesses, [
        Harness.COPILOT_CLI,
        Harness.BROWSER,
        Harness.AZURE_DEVOPS,
        Harness.KIRO
      ]);
    });
  });

  describe('Phase 2: OpenCode detection', () => {
    it('detects OpenCode from OPENCODE_MODE environment variable', () => {
      process.env.OPENCODE_MODE = '1';

      const detection = detectHarness();

      assert.equal(detection.harness, Harness.OPENCODE);
      assert.equal(detection.fleetModeAvailable, false);
      assert.equal(detection.sequentialSpawningAvailable, true);
    });

    it('prioritizes OpenCode after Kiro in sequence', () => {
      process.env.OPENCODE_MODE = '1';

      const detection = detectHarness();

      assert.deepEqual(detection.attemptedHarnesses, [
        Harness.COPILOT_CLI,
        Harness.BROWSER,
        Harness.AZURE_DEVOPS,
        Harness.KIRO,
        Harness.OPENCODE
      ]);
    });
  });

  describe('Phase 2: Pi detection', () => {
    it('detects Pi from PI_MODE environment variable', () => {
      process.env.PI_MODE = '1';

      const detection = detectHarness();

      assert.equal(detection.harness, Harness.PI);
      assert.equal(detection.fleetModeAvailable, false);
      assert.equal(detection.sequentialSpawningAvailable, true);
    });

    it('prioritizes Pi after OpenCode in sequence', () => {
      process.env.PI_MODE = '1';

      const detection = detectHarness();

      assert.deepEqual(detection.attemptedHarnesses, [
        Harness.COPILOT_CLI,
        Harness.BROWSER,
        Harness.AZURE_DEVOPS,
        Harness.KIRO,
        Harness.OPENCODE,
        Harness.PI
      ]);
    });

    it('falls back to unknown when no Phase 2 harness markers are found', () => {
      const detection = detectHarness();

      assert.equal(detection.harness, Harness.UNKNOWN);
      assert.deepEqual(detection.attemptedHarnesses, [
        Harness.COPILOT_CLI,
        Harness.BROWSER,
        Harness.AZURE_DEVOPS,
        Harness.KIRO,
        Harness.OPENCODE,
        Harness.PI
      ]);
    });
  });
});

function restoreEnvironment(): void {
  restoreEnvKey('COPILOT_CLI_MODE', originalEnv.COPILOT_CLI_MODE);
  restoreEnvKey(
    'SYSTEM_TEAMFOUNDATIONCOLLECTIONURI',
    originalEnv.SYSTEM_TEAMFOUNDATIONCOLLECTIONURI
  );
  restoreEnvKey('SYSTEM_COLLECTIONURI', originalEnv.SYSTEM_COLLECTIONURI);
  restoreEnvKey('SYSTEM_TEAMPROJECT', originalEnv.SYSTEM_TEAMPROJECT);
  restoreEnvKey('BUILD_REPOSITORY_URI', originalEnv.BUILD_REPOSITORY_URI);
  restoreEnvKey('BUILD_REPOSITORY_PROVIDER', originalEnv.BUILD_REPOSITORY_PROVIDER);
  restoreEnvKey(
    'SYSTEM_PULLREQUEST_SOURCEREPOSITORYURI',
    originalEnv.SYSTEM_PULLREQUEST_SOURCEREPOSITORYURI
  );
  restoreEnvKey(
    'SYSTEM_PULLREQUEST_SOURCEREPOSITORYPROVIDER',
    originalEnv.SYSTEM_PULLREQUEST_SOURCEREPOSITORYPROVIDER
  );
  // Phase 2 restoration
  restoreEnvKey('KIRO_CLI_MODE', originalEnv.KIRO_CLI_MODE);
  restoreEnvKey('KIRO_IDE_SESSION', originalEnv.KIRO_IDE_SESSION);
  restoreEnvKey('OPENCODE_MODE', originalEnv.OPENCODE_MODE);
  restoreEnvKey('PI_MODE', originalEnv.PI_MODE);
}

function restoreGlobals(): void {
  restoreGlobalValue('window', originalGlobals.window);
  restoreGlobalValue('VSS', originalGlobals.VSS);
  restoreGlobalValue('TFS', originalGlobals.TFS);
  restoreGlobalValue('azureDevOps', originalGlobals.azureDevOps);
}

function restoreEnvKey(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}

function restoreGlobalValue(key: keyof MutableGlobals, value: unknown): void {
  const globals = globalThis as MutableGlobals;
  if (value === undefined) {
    delete globals[key];
    return;
  }

  globals[key] = value;
}
