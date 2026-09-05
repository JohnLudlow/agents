# Harness Detection Implementation Specification (AC5.1 / #190 / #194)

Reference for runtime harness detection used by fleet-mode activation.

## Status

- ✅ Implemented in `.apm/skills/jl-fleet-mode/lib/harness-detection/index.ts`
- ✅ Validated by #192 integration coverage
- ✅ Marker research baseline completed in #194

## Runtime Contract

At session start:

1. Detect harness identity in fixed order (first match wins).
2. Derive capability flags from detected harness.
3. Cache result in session state.
4. Emit structured logs for detection and fallback decisions.

## Detection Order

1. **Copilot CLI**
   - Signal: `COPILOT_CLI_MODE`
   - Harness: `copilot-cli`
2. **Browser**
   - Signal: `window` object exists
   - Harness: `browser`
3. **Azure DevOps**
   - Signals: Azure DevOps env/globals
   - Secondary split:
     - GitHub host -> `azure-devops-github`
     - Azure Repos host -> `azure-devops-azure-repos`
4. **Kiro**
   - Signals: `KIRO_CLI_MODE` or `KIRO_IDE_SESSION`
   - Harness: `kiro`
5. **OpenCode**
   - Signal: `OPENCODE_MODE`
   - Harness: `opencode`
6. **Pi**
   - Signal: `PI_MODE`
   - Harness: `pi`
7. **Fallback**
   - Harness: `unknown`

## Capability Policy

| Harness | fleetModeAvailable | sequentialSpawningAvailable | Notes |
|---|:---:|:---:|---|
| `copilot-cli` | ✅ | ✅ | Native fleet support |
| `azure-devops-github` | ✅ | ✅ | Fleet allowed for GitHub-linked repos |
| `azure-devops-azure-repos` | ❌ | ✅ | Fleet disabled; sequential fallback |
| `browser` | ❌ | ❌ | Inline-only path |
| `kiro` | ❌ | ✅ | Conservative until vendor confirmation |
| `opencode` | ❌ | ✅ | Conservative until vendor confirmation |
| `pi` | ❌ | ✅ | Conservative until vendor confirmation |
| `unknown` | ❌ | ✅ | Safe fallback |

## Error Handling

- Detection never throws.
- Unknown or malformed runtime context falls back to `unknown`.
- Fallback path remains executable through sequential dispatch.

## Logging Contract

Initialization emits:

1. `Harness detected`
2. `Harness capabilities initialized`
3. `Harness detection falling back to unknown` (only when applicable)

## Test Expectations

The implementation must continue to satisfy:

- harness detection across all configured markers,
- Azure DevOps host split accuracy,
- session-state caching behavior,
- fallback behavior consistency.

See:

- `.apm/skills/jl-fleet-mode/lib/harness-detection/index.test.ts`
- `.apm/skills/jl-fleet-mode/lib/fleet-mode-integration.test.ts`

## Relationship to #194

#194 provides the marker research baseline and policy guardrails:

- marker-based detection for Kiro/OpenCode/Pi is implemented,
- fleet capability remains conservative pending stronger vendor confirmation for this integration path.

If vendor confirmation changes capability confidence, update:

1. `deriveCapabilities()` in harness detection implementation,
2. fleet activation tests,
3. user-facing and skill-facing capability matrices.
