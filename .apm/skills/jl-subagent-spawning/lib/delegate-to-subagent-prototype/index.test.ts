import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DelegationType,
  Harness,
  SpawningMode,
  delegateToSubagentPrototype,
  formatDecisionLog,
  type DelegationModelConfig,
  type DelegationRuntimeContext,
  type TaskDispatchPayload
} from './index.ts';

const baseModelConfig: DelegationModelConfig = {
  defaultModel: 'gpt-5-mini',
  hardFallbackModel: 'claude-haiku-4.5',
  perType: {
    [DelegationType.RESEARCH]: 'claude-sonnet-5'
  },
  perAgent: {
    'jl-planner': 'gpt-5.6-luna'
  },
  validModels: ['gpt-5-mini', 'claude-haiku-4.5', 'claude-sonnet-5', 'gpt-5.6-luna'],
  availableModelsByHarness: {
    [Harness.COPILOT_CLI]: ['gpt-5-mini', 'claude-haiku-4.5', 'claude-sonnet-5', 'gpt-5.6-luna'],
    [Harness.BROWSER]: ['claude-haiku-4.5']
  }
};

function buildContext(
  overrides: Partial<DelegationRuntimeContext> = {}
): DelegationRuntimeContext {
  return {
    harness: Harness.COPILOT_CLI,
    capabilities: {
      fleetModeAvailable: true,
      sequentialSpawningAvailable: true
    },
    delegatingAgent: 'jl-planner',
    modelConfig: baseModelConfig,
    now: () => '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

describe('delegateToSubagentPrototype', () => {
  it('uses explicit model and fleet dispatch when available', async () => {
    let dispatchedPayload: TaskDispatchPayload | undefined;

    const result = await delegateToSubagentPrototype(
      {
        targetAgent: 'project-planning:planner',
        delegationType: DelegationType.RESEARCH,
        prompt: 'Evaluate tradeoffs.',
        description: 'Research',
        model: 'gpt-5-mini'
      },
      buildContext(),
      async (payload) => {
        dispatchedPayload = payload;
        return {
          summary: 'Research complete.',
          artifacts: ['docs/findings.md']
        };
      }
    );

    assert.equal(result.modelResolved, 'gpt-5-mini');
    assert.equal(result.modelResolutionSource, 'explicit');
    assert.equal(result.selectedMode, SpawningMode.FLEET);
    assert.equal(dispatchedPayload?.mode, 'background');
    assert.equal(dispatchedPayload?.model, 'gpt-5-mini');
    assert.deepEqual(result.artifacts, ['docs/findings.md']);
  });

  it('falls back from invalid explicit model to per-type model', async () => {
    const result = await delegateToSubagentPrototype(
      {
        targetAgent: 'project-planning:planner',
        delegationType: DelegationType.RESEARCH,
        prompt: 'Evaluate tradeoffs.',
        model: 'not-a-real-model'
      },
      buildContext(),
      async () => ({
        summary: 'Research complete.'
      })
    );

    assert.equal(result.modelResolved, 'claude-sonnet-5');
    assert.equal(result.modelResolutionSource, 'per-type');
    assert.ok(
      result.warnings.some((warning) =>
        warning.includes("Model candidate 'not-a-real-model' from explicit is not in validModels")
      )
    );
  });

  it('uses sequential dispatch when fleet is unavailable', async () => {
    let dispatchedPayload: TaskDispatchPayload | undefined;

    const result = await delegateToSubagentPrototype(
      {
        targetAgent: 'jl-feature-reviewer',
        delegationType: DelegationType.REVIEW,
        prompt: 'Review this change set.',
        requestedMode: SpawningMode.FLEET
      },
      buildContext({
        capabilities: {
          fleetModeAvailable: false,
          sequentialSpawningAvailable: true
        }
      }),
      async (payload) => {
        dispatchedPayload = payload;
        return { summary: 'Review complete.' };
      }
    );

    assert.equal(result.selectedMode, SpawningMode.SEQUENTIAL);
    assert.equal(dispatchedPayload?.mode, 'sync');
  });

  it('falls back to inline when spawning is unavailable', async () => {
    let dispatched = false;

    const result = await delegateToSubagentPrototype(
      {
        targetAgent: 'jl-feature-reviewer',
        delegationType: DelegationType.REVIEW,
        prompt: 'Review this change set.'
      },
      buildContext({
        capabilities: {
          fleetModeAvailable: false,
          sequentialSpawningAvailable: false
        }
      }),
      async () => {
        dispatched = true;
        return { summary: 'Should not execute.' };
      }
    );

    assert.equal(result.selectedMode, SpawningMode.INLINE);
    assert.equal(dispatched, false);
    assert.match(result.summary, /inline/i);
  });

  it('keeps non-CLI harnesses inline in this prototype stage', async () => {
    let dispatched = false;

    const result = await delegateToSubagentPrototype(
      {
        targetAgent: 'project-planning:planner',
        delegationType: DelegationType.RESEARCH,
        prompt: 'Collect references.'
      },
      buildContext({
        harness: Harness.BROWSER
      }),
      async () => {
        dispatched = true;
        return { summary: 'Should not execute.' };
      }
    );

    assert.equal(result.harness, Harness.BROWSER);
    assert.equal(result.selectedMode, SpawningMode.INLINE);
    assert.equal(dispatched, false);
    assert.ok(
      result.warnings.some((warning) => warning.includes('implemented only for copilot-cli'))
    );
  });

  it('rejects missing required fields', async () => {
    await assert.rejects(
      delegateToSubagentPrototype(
        {
          targetAgent: '',
          delegationType: DelegationType.RESEARCH,
          prompt: 'Prompt'
        },
        buildContext(),
        async () => ({ summary: 'N/A' })
      ),
      /targetAgent/
    );
  });

  it('emits a decision log that can be rendered as text', async () => {
    const result = await delegateToSubagentPrototype(
      {
        targetAgent: 'project-planning:planner',
        delegationType: DelegationType.RESEARCH,
        prompt: 'Collect references.'
      },
      buildContext(),
      async () => ({ summary: 'Done.' })
    );

    const text = formatDecisionLog(result);
    assert.match(text, /harness_observed/);
    assert.match(text, /model_selected/);
    assert.match(text, /dispatch_completed/);
  });
});
