/**
 * Copilot CLI-focused prototype for a unified DelegateToSubagent API.
 *
 * Scope:
 * - Implements #195 acceptance criteria in one harness (copilot-cli).
 * - Uses the documented fallback chain: fleet -> sequential -> inline.
 * - Resolves models through the six-level hierarchy.
 * - Emits structured decision logs for every resolution step.
 */

export const DelegationType = {
  RESEARCH: 'research',
  IMPLEMENTATION: 'implementation',
  TEST_GENERATION: 'test_generation',
  DOCUMENTATION: 'documentation',
  PROTOTYPE: 'prototype',
  REVIEW: 'review'
} as const;

export type DelegationType = typeof DelegationType[keyof typeof DelegationType];

export const SpawningMode = {
  FLEET: 'fleet',
  SEQUENTIAL: 'sequential',
  INLINE: 'inline'
} as const;

export type SpawningMode = typeof SpawningMode[keyof typeof SpawningMode];

export const Harness = {
  COPILOT_CLI: 'copilot-cli',
  BROWSER: 'browser',
  AZURE_DEVOPS_GITHUB: 'azure-devops-github',
  AZURE_DEVOPS_AZURE_REPOS: 'azure-devops-azure-repos',
  KIRO: 'kiro',
  OPENCODE: 'opencode',
  PI: 'pi',
  UNKNOWN: 'unknown'
} as const;

export type Harness = typeof Harness[keyof typeof Harness];

export type ModelResolutionSource =
  | 'explicit'
  | 'task-override'
  | 'per-type'
  | 'per-agent'
  | 'global'
  | 'fallback';

export interface DelegationRequest {
  targetAgent: string;
  delegationType: string;
  prompt: string;
  description?: string;
  taskKey?: string;
  model?: string;
  requestedMode?: SpawningMode;
  contextArtifacts?: string[];
}

export interface DelegationModelConfig {
  defaultModel: string;
  hardFallbackModel: string;
  perType?: Partial<Record<DelegationType, string>>;
  perAgent?: Record<string, string>;
  overrides?: Record<string, string>;
  validModels?: readonly string[];
  availableModelsByHarness?: Partial<Record<Harness, readonly string[]>>;
}

export interface DelegationCapabilities {
  fleetModeAvailable: boolean;
  sequentialSpawningAvailable: boolean;
}

export interface DelegationRuntimeContext {
  harness: Harness;
  capabilities: DelegationCapabilities;
  delegatingAgent: string;
  modelConfig: DelegationModelConfig;
  now?: () => string;
}

export interface TaskDispatchPayload {
  agent_type: string;
  name: string;
  description: string;
  prompt: string;
  mode: 'background' | 'sync';
  model?: string;
}

export interface TaskDispatchResult {
  summary: string;
  artifacts?: string[];
}

export type TaskDispatcher = (payload: TaskDispatchPayload) => Promise<TaskDispatchResult>;

export interface DelegationDecisionLogEntry {
  timestamp: string;
  event:
    | 'harness_observed'
    | 'mode_selected'
    | 'mode_fallback'
    | 'model_candidate_rejected'
    | 'model_selected'
    | 'dispatch_started'
    | 'dispatch_completed'
    | 'inline_fallback';
  detail: string;
}

export interface DelegationResult {
  targetAgent: string;
  delegationType: string;
  modelRequested?: string;
  modelResolved: string;
  modelResolutionSource: ModelResolutionSource;
  harness: Harness;
  selectedMode: SpawningMode;
  warnings: string[];
  artifacts: string[];
  summary: string;
  decisionLog: DelegationDecisionLogEntry[];
}

const FALLBACK_CHAIN_BY_MODE: Record<SpawningMode, SpawningMode[]> = {
  [SpawningMode.FLEET]: [SpawningMode.FLEET, SpawningMode.SEQUENTIAL, SpawningMode.INLINE],
  [SpawningMode.SEQUENTIAL]: [SpawningMode.SEQUENTIAL, SpawningMode.INLINE],
  [SpawningMode.INLINE]: [SpawningMode.INLINE]
};

export async function delegateToSubagentPrototype(
  request: DelegationRequest,
  context: DelegationRuntimeContext,
  dispatchTask: TaskDispatcher
): Promise<DelegationResult> {
  validateDelegationRequest(request);

  const decisionLog: DelegationDecisionLogEntry[] = [];
  const warnings: string[] = [];

  appendLog(
    decisionLog,
    context,
    'harness_observed',
    `Harness=${context.harness}; fleet=${context.capabilities.fleetModeAvailable}; sequential=${context.capabilities.sequentialSpawningAvailable}`
  );

  const selectedMode = selectSpawningMode(
    context.capabilities,
    request.requestedMode,
    (event, detail) => appendLog(decisionLog, context, event, detail)
  );

  const modelResolution = resolveDelegationModel(request, context, (event, detail) =>
    appendLog(decisionLog, context, event, detail)
  );

  warnings.push(...modelResolution.warnings);

  if (context.harness !== Harness.COPILOT_CLI) {
    const warning = `Prototype dispatch is implemented only for copilot-cli. Harness '${context.harness}' will run inline for now.`;
    warnings.push(warning);
    appendLog(decisionLog, context, 'inline_fallback', warning);

    return {
      targetAgent: request.targetAgent,
      delegationType: request.delegationType,
      modelRequested: request.model,
      modelResolved: modelResolution.modelResolved,
      modelResolutionSource: modelResolution.modelResolutionSource,
      harness: context.harness,
      selectedMode: SpawningMode.INLINE,
      warnings,
      artifacts: request.contextArtifacts ?? [],
      summary: warning,
      decisionLog
    };
  }

  if (selectedMode === SpawningMode.INLINE) {
    const summary =
      'Spawning is unavailable in this runtime context, so work remains inline in the parent session.';
    appendLog(decisionLog, context, 'inline_fallback', summary);

    return {
      targetAgent: request.targetAgent,
      delegationType: request.delegationType,
      modelRequested: request.model,
      modelResolved: modelResolution.modelResolved,
      modelResolutionSource: modelResolution.modelResolutionSource,
      harness: context.harness,
      selectedMode,
      warnings,
      artifacts: request.contextArtifacts ?? [],
      summary,
      decisionLog
    };
  }

  const dispatchPayload: TaskDispatchPayload = {
    agent_type: request.targetAgent,
    name: request.targetAgent,
    description: request.description ?? `Delegated ${request.delegationType} task`,
    prompt: request.prompt,
    mode: selectedMode === SpawningMode.FLEET ? 'background' : 'sync',
    model: modelResolution.modelResolved
  };

  appendLog(
    decisionLog,
    context,
    'dispatch_started',
    `Dispatching ${request.targetAgent} using ${dispatchPayload.mode} mode and model '${modelResolution.modelResolved}'.`
  );

  const dispatchResult = await dispatchTask(dispatchPayload);

  appendLog(
    decisionLog,
    context,
    'dispatch_completed',
    `Dispatch completed for ${request.targetAgent}.`
  );

  return {
    targetAgent: request.targetAgent,
    delegationType: request.delegationType,
    modelRequested: request.model,
    modelResolved: modelResolution.modelResolved,
    modelResolutionSource: modelResolution.modelResolutionSource,
    harness: context.harness,
    selectedMode,
    warnings,
    artifacts: dispatchResult.artifacts ?? [],
    summary: dispatchResult.summary,
    decisionLog
  };
}

export function formatDecisionLog(result: DelegationResult): string {
  return result.decisionLog
    .map((entry) => `[${entry.timestamp}] ${entry.event}: ${entry.detail}`)
    .join('\n');
}

function validateDelegationRequest(request: DelegationRequest): void {
  if (typeof request.targetAgent !== 'string' || !request.targetAgent.trim()) {
    throw new Error('DelegationRequest.targetAgent is required.');
  }

  if (typeof request.delegationType !== 'string' || !request.delegationType.trim()) {
    throw new Error('DelegationRequest.delegationType is required.');
  }

  if (typeof request.prompt !== 'string' || !request.prompt.trim()) {
    throw new Error('DelegationRequest.prompt is required.');
  }
}

function selectSpawningMode(
  capabilities: DelegationCapabilities,
  requestedMode: SpawningMode | undefined,
  append: (event: 'mode_selected' | 'mode_fallback', detail: string) => void
): SpawningMode {
  const preferredMode = requestedMode ?? SpawningMode.FLEET;
  const chain = FALLBACK_CHAIN_BY_MODE[preferredMode];

  for (const mode of chain) {
    if (isModeAvailable(capabilities, mode)) {
      if (mode === preferredMode) {
        append('mode_selected', `Selected requested/default mode '${mode}'.`);
      } else {
        append(
          'mode_fallback',
          `Mode '${preferredMode}' unavailable; falling back to '${mode}'.`
        );
      }
      return mode;
    }
  }

  append('mode_fallback', `No spawning mode available from '${preferredMode}'; using inline.`);
  return SpawningMode.INLINE;
}

function isModeAvailable(capabilities: DelegationCapabilities, mode: SpawningMode): boolean {
  switch (mode) {
    case SpawningMode.FLEET:
      return capabilities.fleetModeAvailable;
    case SpawningMode.SEQUENTIAL:
      return capabilities.sequentialSpawningAvailable;
    case SpawningMode.INLINE:
      return true;
  }
}

function resolveDelegationModel(
  request: DelegationRequest,
  context: DelegationRuntimeContext,
  append: (
    event: 'model_selected' | 'model_candidate_rejected',
    detail: string
  ) => void
): {
  modelResolved: string;
  modelResolutionSource: ModelResolutionSource;
  warnings: string[];
} {
  const warnings: string[] = [];
  const candidates: Array<{ source: ModelResolutionSource; model: string }> = [];

  if (request.model) {
    candidates.push({ source: 'explicit', model: request.model });
  }

  if (request.taskKey && context.modelConfig.overrides?.[request.taskKey]) {
    candidates.push({
      source: 'task-override',
      model: context.modelConfig.overrides[request.taskKey]
    });
  }

  if (
    isCanonicalDelegationType(request.delegationType) &&
    context.modelConfig.perType?.[request.delegationType]
  ) {
    candidates.push({
      source: 'per-type',
      model: context.modelConfig.perType[request.delegationType]!
    });
  }

  if (context.modelConfig.perAgent?.[context.delegatingAgent]) {
    candidates.push({
      source: 'per-agent',
      model: context.modelConfig.perAgent[context.delegatingAgent]
    });
  }

  candidates.push({ source: 'global', model: context.modelConfig.defaultModel });
  candidates.push({ source: 'fallback', model: context.modelConfig.hardFallbackModel });

  const deduped = removeDuplicateCandidates(candidates);

  for (const candidate of deduped) {
    if (!isModelValid(candidate.model, context.modelConfig.validModels)) {
      const warning = `Model candidate '${candidate.model}' from ${candidate.source} is not in validModels and was skipped.`;
      warnings.push(warning);
      append('model_candidate_rejected', warning);
      continue;
    }

    if (!isModelAvailableInHarness(context.harness, candidate.model, context.modelConfig)) {
      const warning = `Model '${candidate.model}' from ${candidate.source} is unavailable in harness '${context.harness}'.`;
      warnings.push(warning);
      append('model_candidate_rejected', warning);
      continue;
    }

    append('model_selected', `Selected model '${candidate.model}' from ${candidate.source}.`);
    return {
      modelResolved: candidate.model,
      modelResolutionSource: candidate.source,
      warnings
    };
  }

  const emergencyWarning =
    "No valid/available model candidates remained; forcing hard fallback model without harness guarantee.";
  warnings.push(emergencyWarning);
  append('model_candidate_rejected', emergencyWarning);

  return {
    modelResolved: context.modelConfig.hardFallbackModel,
    modelResolutionSource: 'fallback',
    warnings
  };
}

function isCanonicalDelegationType(delegationType: string): delegationType is DelegationType {
  return Object.values(DelegationType).includes(delegationType as DelegationType);
}

function isModelValid(model: string, validModels?: readonly string[]): boolean {
  if (!validModels || validModels.length === 0) {
    return true;
  }

  return validModels.includes(model);
}

function isModelAvailableInHarness(
  harness: Harness,
  model: string,
  config: DelegationModelConfig
): boolean {
  const supportedModels = config.availableModelsByHarness?.[harness];
  if (!supportedModels || supportedModels.length === 0) {
    return true;
  }

  return supportedModels.includes(model);
}

function removeDuplicateCandidates(
  candidates: Array<{ source: ModelResolutionSource; model: string }>
): Array<{ source: ModelResolutionSource; model: string }> {
  const seen = new Set<string>();
  const deduped: Array<{ source: ModelResolutionSource; model: string }> = [];

  for (const candidate of candidates) {
    if (seen.has(candidate.model)) {
      continue;
    }

    seen.add(candidate.model);
    deduped.push(candidate);
  }

  return deduped;
}

function appendLog(
  decisionLog: DelegationDecisionLogEntry[],
  context: DelegationRuntimeContext,
  event: DelegationDecisionLogEntry['event'],
  detail: string
): void {
  decisionLog.push({
    timestamp: (context.now ?? defaultNow)(),
    event,
    detail
  });
}

function defaultNow(): string {
  return new Date().toISOString();
}
