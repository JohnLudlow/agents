/**
 * Harness Detection Module (AC5.1 / #190)
 *
 * Phase 1 implements detection for:
 * - Copilot CLI
 * - Browser
 * - Azure DevOps (GitHub-linked vs Azure Repos candidates)
 * - Unknown fallback
 *
 * Detection is cached per session. Consumers should initialize session state
 * once at startup and reuse the returned result.
 */

export const Harness = {
  COPILOT_CLI: 'copilot-cli',
  BROWSER: 'browser',
  AZURE_DEVOPS: 'azure-devops',
  AZURE_DEVOPS_GITHUB: 'azure-devops-github',
  AZURE_DEVOPS_AZURE_REPOS: 'azure-devops-azure-repos',
  KIRO: 'kiro',
  OPENCODE: 'opencode',
  PI: 'pi',
  UNKNOWN: 'unknown'
} as const;
export type Harness = typeof Harness[keyof typeof Harness];

export const AzureRepoType = {
  GITHUB: 'github',
  AZURE_REPOS: 'azure-repos',
  UNKNOWN: 'unknown'
} as const;
export type AzureRepoType = typeof AzureRepoType[keyof typeof AzureRepoType];

export interface HarnessCapabilityFlags {
  fleetModeAvailable: boolean;
  subagentSpawningAvailable: boolean;
  sequentialSpawningFallback: boolean;
}

/**
 * Backward-compatible top-level flags are duplicated alongside the nested
 * `capabilities` object so existing fleet-mode consumers can keep using the
 * flat fields while new callers use the Phase 1 API shape.
 */
export interface HarnessCapabilities extends HarnessCapabilityFlags {
  harness: Harness;
  capabilities: HarnessCapabilityFlags;
  detectionReason: string;
  attemptedHarnesses: string[];
  azureRepoType?: AzureRepoType;
  canDetectAtRuntime: boolean;
  sequentialSpawningAvailable: boolean;
}

export interface HarnessSessionState extends HarnessCapabilities {
  initializedAt: string;
}

export interface StructuredLogger {
  info(message: string, data?: Record<string, unknown>): void;
}

const AZURE_DEVOPS_ENV_KEYS = [
  'SYSTEM_TEAMFOUNDATIONCOLLECTIONURI',
  'SYSTEM_COLLECTIONURI',
  'SYSTEM_TEAMPROJECT',
  'BUILD_REPOSITORY_URI',
  'BUILD_REPOSITORY_PROVIDER',
  'SYSTEM_PULLREQUEST_SOURCEREPOSITORYURI'
] as const;

const GITHUB_URL_PATTERN = /(^|:\/\/|@)([^/]*\.)?github\.com([/:]|$)/i;
const AZURE_REPOS_URL_PATTERN =
  /(^|:\/\/|@)(dev\.azure\.com|vs-ssh\.visualstudio\.com|[^/]+\.visualstudio\.com)([/:]|$)/i;

let cachedDetection: HarnessCapabilities | undefined;
let cachedSessionState: HarnessSessionState | undefined;

/**
 * Detects the current harness. The first match wins and the result is cached
 * for the lifetime of the current process/session.
 */
export function detectHarness(): HarnessCapabilities {
  if (cachedSessionState) {
    return cloneDetection(cachedSessionState);
  }

  if (cachedDetection) {
    return cloneDetection(cachedDetection);
  }

  const attemptedHarnesses: string[] = [];

  attemptedHarnesses.push(Harness.COPILOT_CLI);
  if (hasCopilotCliMarker()) {
    return cacheDetectionResult(
      createDetectionResult(
        Harness.COPILOT_CLI,
        'COPILOT_CLI_MODE environment variable exists',
        attemptedHarnesses
      )
    );
  }

  attemptedHarnesses.push(Harness.BROWSER);
  if (isBrowserHarness()) {
    return cacheDetectionResult(
      createDetectionResult(
        Harness.BROWSER,
        'window object detected',
        attemptedHarnesses
      )
    );
  }

  attemptedHarnesses.push(Harness.AZURE_DEVOPS);
  const azureDevOpsDetection = detectAzureDevOps(attemptedHarnesses);
  if (azureDevOpsDetection) {
    return cacheDetectionResult(azureDevOpsDetection);
  }

  return cacheDetectionResult(
    createDetectionResult(
      Harness.UNKNOWN,
      'No detection mechanism matched the Phase 1 harnesses',
      attemptedHarnesses
    )
  );
}

/**
 * Initializes and returns the cached session state for downstream consumers.
 * Structured logs are emitted once per session, when the state is first
 * initialized.
 */
export function initializeHarnessSessionState(
  logger: StructuredLogger = structuredConsoleLogger
): HarnessSessionState {
  if (cachedSessionState) {
    return cloneSessionState(cachedSessionState);
  }

  const detection = detectHarness();
  const initializedAt = new Date().toISOString();

  cachedSessionState = {
    ...detection,
    initializedAt
  };

  if (cachedSessionState.harness === Harness.UNKNOWN) {
    logger.info('Harness detection falling back to unknown', {
      fallbackHarness: Harness.UNKNOWN,
      reason: cachedSessionState.detectionReason,
      tried: cachedSessionState.attemptedHarnesses,
      timestamp: initializedAt
    });
  }

  logger.info('Harness detected', {
    harness: cachedSessionState.harness,
    azureRepoType: cachedSessionState.azureRepoType,
    detectionReason: cachedSessionState.detectionReason,
    timestamp: initializedAt
  });

  logger.info('Harness capabilities initialized', {
    harness: cachedSessionState.harness,
    ...cachedSessionState.capabilities,
    timestamp: initializedAt
  });

  return cloneSessionState(cachedSessionState);
}

export function getHarnessSessionState(): HarnessSessionState | undefined {
  return cachedSessionState ? cloneSessionState(cachedSessionState) : undefined;
}

export function resetHarnessDetectionStateForTests(): void {
  cachedDetection = undefined;
  cachedSessionState = undefined;
}

function cacheDetectionResult(result: HarnessCapabilities): HarnessCapabilities {
  cachedDetection = { ...result, capabilities: { ...result.capabilities } };
  return cloneDetection(cachedDetection);
}

function hasCopilotCliMarker(): boolean {
  return Boolean(process.env.COPILOT_CLI_MODE);
}

function isBrowserHarness(): boolean {
  try {
    const browserWindow = (globalThis as { window?: { document?: unknown } }).window;
    return typeof browserWindow !== 'undefined';
  } catch {
    return false;
  }
}

function detectAzureDevOps(attemptedHarnesses: string[]): HarnessCapabilities | null {
  if (!hasAzureDevOpsContext()) {
    return null;
  }

  const azureRepoType = detectAzureRepoType();
  if (azureRepoType === AzureRepoType.UNKNOWN) {
    return null;
  }

  if (azureRepoType === AzureRepoType.GITHUB) {
    return createDetectionResult(
      Harness.AZURE_DEVOPS_GITHUB,
      'Azure DevOps context detected with GitHub-linked repository',
      attemptedHarnesses,
      azureRepoType
    );
  }

  return createDetectionResult(
    Harness.AZURE_DEVOPS_AZURE_REPOS,
    'Azure DevOps context detected with Azure Repos-hosted repository',
    attemptedHarnesses,
    azureRepoType
  );
}

function hasAzureDevOpsContext(): boolean {
  try {
    const hasAzureDevOpsEnv = AZURE_DEVOPS_ENV_KEYS.some((key) => hasEnvironmentValue(key));
    const globals = globalThis as {
      VSS?: unknown;
      TFS?: unknown;
      azureDevOps?: unknown;
    };
    const hasAzureDevOpsGlobal =
      typeof globals.VSS !== 'undefined' ||
      typeof globals.TFS !== 'undefined' ||
      typeof globals.azureDevOps !== 'undefined';

    return hasAzureDevOpsEnv || hasAzureDevOpsGlobal;
  } catch {
    return false;
  }
}

function detectAzureRepoType(): AzureRepoType {
  const providerCandidates = collectAzureRepositoryProviders();
  for (const providerCandidate of providerCandidates) {
    const normalizedProvider = providerCandidate.toLowerCase();
    if (normalizedProvider.includes('github')) {
      return AzureRepoType.GITHUB;
    }

    if (
      normalizedProvider.includes('azure') ||
      normalizedProvider.includes('tfs') ||
      normalizedProvider.includes('git')
    ) {
      return AzureRepoType.AZURE_REPOS;
    }
  }

  const repositoryUrlCandidates = collectAzureRepositoryUrls();
  for (const repositoryUrlCandidate of repositoryUrlCandidates) {
    if (GITHUB_URL_PATTERN.test(repositoryUrlCandidate)) {
      return AzureRepoType.GITHUB;
    }

    if (AZURE_REPOS_URL_PATTERN.test(repositoryUrlCandidate)) {
      return AzureRepoType.AZURE_REPOS;
    }
  }

  return AzureRepoType.UNKNOWN;
}

function collectAzureRepositoryProviders(): string[] {
  return uniqueNonEmptyStrings([
    process.env.BUILD_REPOSITORY_PROVIDER,
    process.env.SYSTEM_PULLREQUEST_SOURCEREPOSITORYPROVIDER,
    getStringAtPath((globalThis as Record<string, unknown>).VSS, ['context', 'repository', 'provider']),
    getStringAtPath((globalThis as Record<string, unknown>).VSS, [
      'context',
      'repository',
      'providerName'
    ]),
    getStringAtPath((globalThis as Record<string, unknown>).TFS, ['context', 'repository', 'provider']),
    getStringAtPath((globalThis as Record<string, unknown>).TFS, [
      'context',
      'repository',
      'providerName'
    ])
  ]);
}

function collectAzureRepositoryUrls(): string[] {
  const vssGlobal = (globalThis as Record<string, unknown>).VSS;
  const tfsGlobal = (globalThis as Record<string, unknown>).TFS;
  const webContext =
    getAzureWebContext(vssGlobal) ??
    getAzureWebContext(tfsGlobal) ??
    undefined;

  return uniqueNonEmptyStrings([
    process.env.BUILD_REPOSITORY_URI,
    process.env.SYSTEM_PULLREQUEST_SOURCEREPOSITORYURI,
    getStringAtPath(vssGlobal, ['context', 'repository', 'url']),
    getStringAtPath(vssGlobal, ['repository', 'url']),
    getStringAtPath(tfsGlobal, ['context', 'repository', 'url']),
    getStringAtPath(tfsGlobal, ['repository', 'url']),
    getStringAtPath(webContext, ['repository', 'url']),
    getStringAtPath(webContext, ['gitRepository', 'url'])
  ]);
}

function getAzureWebContext(target: unknown): unknown {
  if (!target || typeof target !== 'object') {
    return undefined;
  }

  const candidate = target as { getWebContext?: () => unknown };
  if (typeof candidate.getWebContext !== 'function') {
    return undefined;
  }

  try {
    return candidate.getWebContext();
  } catch {
    return undefined;
  }
}

function createDetectionResult(
  harness: Harness,
  detectionReason: string,
  attemptedHarnesses: string[],
  azureRepoType?: AzureRepoType
): HarnessCapabilities {
  const capabilities = deriveCapabilities(harness);
  const canDetectAtRuntime = harness !== Harness.UNKNOWN;

  return {
    harness,
    ...capabilities,
    capabilities,
    sequentialSpawningAvailable: capabilities.sequentialSpawningFallback,
    detectionReason,
    attemptedHarnesses: [...attemptedHarnesses],
    azureRepoType,
    canDetectAtRuntime
  };
}

function deriveCapabilities(harness: Harness): HarnessCapabilityFlags {
  switch (harness) {
    case Harness.COPILOT_CLI:
      return {
        fleetModeAvailable: true,
        subagentSpawningAvailable: true,
        sequentialSpawningFallback: true
      };

    case Harness.BROWSER:
      return {
        fleetModeAvailable: false,
        subagentSpawningAvailable: false,
        sequentialSpawningFallback: false
      };

    case Harness.AZURE_DEVOPS_GITHUB:
      return {
        fleetModeAvailable: true,
        subagentSpawningAvailable: true,
        sequentialSpawningFallback: true
      };

    case Harness.AZURE_DEVOPS_AZURE_REPOS:
    case Harness.UNKNOWN:
      return {
        fleetModeAvailable: false,
        subagentSpawningAvailable: false,
        sequentialSpawningFallback: true
      };

    case Harness.AZURE_DEVOPS:
    case Harness.KIRO:
    case Harness.OPENCODE:
    case Harness.PI:
      return {
        fleetModeAvailable: false,
        subagentSpawningAvailable: false,
        sequentialSpawningFallback: true
      };
  }
}

function hasEnvironmentValue(key: string): boolean {
  const value = process.env[key];
  return typeof value === 'string' && value.trim().length > 0;
}

function getStringAtPath(target: unknown, path: string[]): string | undefined {
  let current: unknown = target;

  for (const pathSegment of path) {
    if (!current || typeof current !== 'object' || !(pathSegment in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[pathSegment];
  }

  return typeof current === 'string' && current.trim().length > 0 ? current : undefined;
}

function uniqueNonEmptyStrings(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())))];
}

function cloneSessionState(state: HarnessSessionState): HarnessSessionState {
  return {
    ...state,
    capabilities: { ...state.capabilities },
    attemptedHarnesses: [...state.attemptedHarnesses]
  };
}

function cloneDetection(state: HarnessCapabilities): HarnessCapabilities {
  return {
    ...state,
    capabilities: { ...state.capabilities },
    attemptedHarnesses: [...state.attemptedHarnesses]
  };
}

const structuredConsoleLogger: StructuredLogger = {
  info(message, data = {}) {
    console.info(
      JSON.stringify({
        level: 'info',
        message,
        ...data
      })
    );
  }
};
