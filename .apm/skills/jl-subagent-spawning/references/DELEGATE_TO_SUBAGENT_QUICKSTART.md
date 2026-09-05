# DelegateToSubagent Quickstart (#195 Prototype)

Use this quickstart when an agent needs the Copilot CLI prototype delegation
flow with model resolution and deterministic mode fallback.

## 1. Build runtime context once

```ts
import {
  Harness,
  delegateToSubagentPrototype
} from '../lib/delegate-to-subagent-prototype/index.ts';

const runtimeContext = {
  harness: Harness.COPILOT_CLI,
  capabilities: {
    fleetModeAvailable: true,
    sequentialSpawningAvailable: true
  },
  delegatingAgent: 'jl-planner',
  modelConfig: {
    defaultModel: 'gpt-5-mini',
    hardFallbackModel: 'claude-haiku-4.5',
    perType: {
      research: 'claude-sonnet-5'
    }
  }
};
```

## 2. Prepare a bounded delegation request

```ts
const request = {
  targetAgent: 'project-planning:planner',
  delegationType: 'research',
  taskKey: 'spike-api-shape',
  prompt: 'Compare API options and return one recommended design.',
  requestedMode: 'fleet'
};
```

## 3. Dispatch through the prototype

```ts
const result = await delegateToSubagentPrototype(
  request,
  runtimeContext,
  async (payload) => task(payload)
);
```

## 4. Use the result contract

`result` contains:

- resolved model + resolution source
- selected mode (`fleet`, `sequential`, or `inline`)
- warnings from model/harness fallback
- structured `decisionLog`
- delegated summary/artifacts when dispatch ran

## Current limitations

- Dispatch execution is implemented for `copilot-cli` only in this prototype.
- Non-CLI harnesses return inline fallback with a warning by design.
- This guide validates API shape and policy behavior; it is not a product
  commitment for a universal runtime API.
