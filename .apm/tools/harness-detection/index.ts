/**
 * Harness Detection Module (AC5.1)
 *
 * Reliable runtime detection of Copilot harness type and capability flags.
 * Agents use this module at session start to determine whether fleet mode,
 * sequential dispatch, or inline work is available.
 *
 * Reference: SKILL.md § Fleet Mode Utilization and Harness Detection
 */

export enum Harness {
  COPILOT_CLI = 'copilot-cli',
  BROWSER = 'browser',
  AZURE_DEVOPS = 'azure-devops',
  KIRO = 'kiro',
  OPENCODE = 'opencode',
  PI = 'pi',
  UNKNOWN = 'unknown'
}

export enum AzureRepoType {
  GITHUB = 'github',
  AZURE_REPOS = 'azure-repos',
  UNKNOWN = 'unknown'
}

/**
 * Capability flags for the current harness.
 * Agents use these to decide spawning strategy without consulting docs.
 */
export interface HarnessCapabilities {
  harness: Harness;
  fleetModeAvailable: boolean;
  sequentialSpawningAvailable: boolean;
  canDetectAtRuntime: boolean;
  azureRepoType?: AzureRepoType; // populated only for AZURE_DEVOPS
  detectionReason: string; // why this harness was detected (for logging)
}

/**
 * Detect current harness at session start.
 *
 * Runs detection in order of specificity; first match wins.
 * Returns UNKNOWN with sequential fallback if detection fails.
 * All harnesses support at least inline work.
 */
export function detectHarness(): HarnessCapabilities {
  // Check Copilot CLI first (most specific: env var)
  if (process.env.COPILOT_CLI_MODE) {
    return {
      harness: Harness.COPILOT_CLI,
      fleetModeAvailable: true,
      sequentialSpawningAvailable: true,
      canDetectAtRuntime: true,
      detectionReason: 'COPILOT_CLI_MODE environment variable exists'
    };
  }

  // Check Browser (specific: JavaScript window object)
  if (isInBrowser()) {
    return {
      harness: Harness.BROWSER,
      fleetModeAvailable: false,
      sequentialSpawningAvailable: false,
      canDetectAtRuntime: true,
      detectionReason: 'window object detected (JavaScript global)'
    };
  }

  // Check Azure DevOps (requires secondary detection for repo type)
  const azureDevOpsCapabilities = detectAzureDevOps();
  if (azureDevOpsCapabilities) {
    return azureDevOpsCapabilities;
  }

  // Check Kiro (detection API unknown; treat as possible)
  if (isKiroEnvironment()) {
    return {
      harness: Harness.KIRO,
      fleetModeAvailable: true,
      sequentialSpawningAvailable: true,
      canDetectAtRuntime: false, // detection mechanism unknown (fog item)
      detectionReason: 'Kiro-specific environment detected (detection API undocumented)'
    };
  }

  // Check Pi (detection API unknown)
  if (isPiEnvironment()) {
    return {
      harness: Harness.PI,
      fleetModeAvailable: false, // unknown; conservative default
      sequentialSpawningAvailable: false, // unknown; conservative default
      canDetectAtRuntime: false,
      detectionReason: 'Pi environment detected (detection API undocumented)'
    };
  }

  // Check OpenCode (detection API unknown)
  if (isOpenCodeEnvironment()) {
    return {
      harness: Harness.OPENCODE,
      fleetModeAvailable: false, // unknown; conservative default
      sequentialSpawningAvailable: false, // unknown; conservative default
      canDetectAtRuntime: false,
      detectionReason: 'OpenCode environment detected (detection API undocumented)'
    };
  }

  // Unknown harness: conservative fallback
  return {
    harness: Harness.UNKNOWN,
    fleetModeAvailable: false,
    sequentialSpawningAvailable: true, // at least try sequential
    canDetectAtRuntime: false,
    detectionReason: 'No detection mechanism matched; using conservative default'
  };
}

/**
 * Browser detection: JavaScript global `window` object.
 * Used by Copilot Chat in the browser and browser-based environments.
 */
function isInBrowser(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.document !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Azure DevOps detection and secondary detection for repo type.
 *
 * Returns capabilities adjusted for GitHub-linked (supports fleet) vs
 * Azure Repos (no fleet due to API differences).
 *
 * See ROADMAP.md § Phase 2 blockers: "What API detects Azure DevOps and
 * distinguishes repo types at runtime?"
 */
function detectAzureDevOps(): HarnessCapabilities | null {
  try {
    // Check for Azure DevOps SDK objects
    // TODO: Exact detection mechanism to be filled in by Phase 2 vendor research
    // For now, check common patterns agents might use

    // Check for Azure DevOps global object
    const hasAzureDevOpsGlobal = (globalThis as any).VSS !== undefined;

    // Check for TFS SDK
    const hasTfsGlobal = (globalThis as any).TFS !== undefined;

    if (!hasAzureDevOpsGlobal && !hasTfsGlobal) {
      return null; // Not Azure DevOps
    }

    // Detect linked repo type (GitHub vs Azure Repos)
    const repoType = detectAzureRepoType();

    return {
      harness: Harness.AZURE_DEVOPS,
      fleetModeAvailable: repoType === AzureRepoType.GITHUB,
      sequentialSpawningAvailable: true,
      canDetectAtRuntime: true,
      azureRepoType: repoType,
      detectionReason: `Azure DevOps detected (linked repo: ${repoType})`
    };
  } catch {
    return null;
  }
}

/**
 * Detect whether Azure DevOps is linked to GitHub or using Azure Repos.
 *
 * GitHub-linked repos support fleet mode; Azure Repos do not due to API differences.
 *
 * TODO: Phase 2 blocker: What API reliably distinguishes these at runtime?
 * Reference ROADMAP.md § Phase 2 Open Questions.
 */
function detectAzureRepoType(): AzureRepoType {
  try {
    // Placeholder detection logic; to be filled in by Phase 2 vendor research
    const azureObj = (globalThis as any).VSS || (globalThis as any).TFS;
    if (!azureObj) return AzureRepoType.UNKNOWN;

    // TODO: Replace with actual detection API from Phase 2 research
    // For now, return unknown (conservative default)
    return AzureRepoType.UNKNOWN;
  } catch {
    return AzureRepoType.UNKNOWN;
  }
}

/**
 * Kiro environment detection.
 *
 * TODO: Phase 2 blocker: What env var or API detects Kiro at runtime?
 * Reference ROADMAP.md § Phase 2 Open Questions.
 *
 * Currently returns false (conservative default) until detection API is documented.
 */
function isKiroEnvironment(): boolean {
  try {
    // Placeholder: check for Kiro-specific environment variable or global
    // To be filled in by Phase 2 vendor research (#205)
    return false; // Conservative default until detection documented
  } catch {
    return false;
  }
}

/**
 * Pi environment detection.
 *
 * TODO: Phase 2 blocker: What env var or API detects Pi at runtime?
 * Is Herdr integration relevant for detection?
 * Reference ROADMAP.md § Phase 2 Open Questions.
 *
 * Currently returns false (conservative default) until detection API is documented.
 */
function isPiEnvironment(): boolean {
  try {
    // Placeholder: check for Pi-specific environment markers
    // To be filled in by Phase 2 vendor research (#205)
    return false; // Conservative default until detection documented
  } catch {
    return false;
  }
}

/**
 * OpenCode environment detection.
 *
 * TODO: Phase 2 blocker: What env var or API detects OpenCode at runtime?
 * Reference ROADMAP.md § Phase 2 Open Questions.
 *
 * Currently returns false (conservative default) until detection API is documented.
 */
function isOpenCodeEnvironment(): boolean {
  try {
    // Placeholder: check for OpenCode-specific environment markers
    // To be filled in by Phase 2 vendor research (#205)
    return false; // Conservative default until detection documented
  } catch {
    return false;
  }
}
