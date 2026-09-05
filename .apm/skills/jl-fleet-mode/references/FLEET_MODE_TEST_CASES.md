# Fleet Mode Test Specification & Validation Matrix

This document specifies the validation suite for **Fleet Mode Utilization and Harness Detection** (`jl-fleet-mode`).
It covers test suites for runtime harness detection, automatic spawning mode activation, graceful fallback chains,
and end-to-end multi-task execution lifecycle across all six target harnesses.

## Test Suite Architecture

The test suite is structured into three layers executed with Node.js native test runner (`node --test`):

```text
.apm/skills/jl-fleet-mode/
├── lib/
│   ├── harness-detection/
│   │   ├── index.ts                 # Runtime harness detection logic
│   │   └── index.test.ts            # Unit tests for harness detection
│   ├── fleet-mode-activation/
│   │   ├── index.ts                 # Activation and fallback state machine
│   │   └── index.test.ts            # Unit tests for activation strategy
│   └── fleet-mode-integration.test.ts # End-to-end integration lifecycle tests
```

## Harness Validation Matrix

| Harness | Detection Trigger | Target Mode | Spawning Support | Test Coverage |
| :--- | :--- | :--- | :--- | :--- |
| **Copilot CLI** | `COPILOT_CLI_MODE` env var | `fleet` | Full parallel subagents | Unit + E2E Lifecycle |
| **Browser** | `window.document` global | `inline` | No spawning (runs in session) | Unit + Fallback E2E |
| **Azure DevOps (GitHub)** | `VSS`/`TFS` + GitHub link | `fleet` | Parallel via GitHub API | Unit + E2E Simulation |
| **Azure DevOps (Repos)** | `VSS`/`TFS` + Azure Repos | `sequential` | Sequential dispatch | Unit + Fallback E2E |
| **Kiro** | Phase 2 detection hook | `fleet` | Parallel subagents | Capability Unit + E2E |
| **Pi** | Phase 2 detection hook | `sequential` | Conservative sequential fallback | Capability Unit + E2E |
| **OpenCode** | Phase 2 detection hook | `sequential` | Conservative sequential fallback | Capability Unit + E2E |
| **Unknown** | No triggers matched | `sequential` | Conservative sequential | Unit + Fallback E2E |

## Test Scenarios & Cases

### 1. Harness Detection Suite (`lib/harness-detection/index.test.ts`)

- **CLI Detection**:
  - `COPILOT_CLI_MODE` environment variable flags `copilot-cli` harness with fleet and sequential support.
  - Missing environment variable does not flag CLI.
- **Browser Detection**:
  - `window` and `window.document` presence flags `browser` harness with inline execution only.
  - `window` without `document` safely rejects browser detection.
- **Azure DevOps Detection**:
  - `VSS`/`TFS` globals and Azure env vars detect Azure DevOps context.
  - Secondary detection resolves GitHub-linked repositories vs Azure Repos.
- **Specificity & Precedence**:
  - Detection order: CLI > Browser > Azure DevOps > Phase 2 > Unknown fallback.
  - CLI env var overrides ambient browser objects.
- **Robustness & Error Handling**:
  - Function never throws on unexpected globals or missing properties.
  - Every resolution produces a structured `detectionReason` string.

### 2. Activation Strategy Suite (`lib/fleet-mode-activation/index.test.ts`)

- **Mode Selection**:
  - Automatically selects `fleet` when `fleetModeAvailable: true`.
  - Automatically selects `sequential` when fleet is unavailable but sequential is available.
  - Automatically selects `inline` when no spawning capabilities exist.
- **Session State & Logging**:
  - `initializeFleetModeSession` records initial `mode_selected` event with timestamp.
  - Every resolution appends an entry to `session.activationLog`.
  - `getActivationLog` formats a human-readable diagnostic trace.
- **Silent Fallback Guarantee**:
  - Unmet spawning mode requests transition gracefully down the chain without throwing or prompting.
  - Fallback events are logged as `fallback_attempted` with the detailed fallback reason.

### 3. End-to-End Integration Suite (`lib/fleet-mode-integration.test.ts`)

- **Full Lifecycle Runs**:
  - **Copilot CLI**: Detects CLI -> initializes fleet session -> dispatches fleet subtasks -> audits log.
  - **Browser**: Detects browser -> initializes inline session -> handles advisory fleet request with silent fallback to inline -> audits log.
  - **Azure DevOps**: Distinguishes GitHub-linked fleet from Azure Repos sequential fallback.
  - **Phase 2 Harnesses**: Validates capability resolution for Kiro, Pi, and OpenCode.
  - **Unknown Fallback**: Validates conservative sequential default for unknown runtime environments.
- **Multi-Task Execution Workflows**:
  - Simulates 5-task sequence in CLI maintaining fleet mode throughout.
  - Simulates multi-task sequence in Browser maintaining inline fallback throughout.
- **Dispatch Semantics Validation**:
  - Verifies fleet mode dispatch executes tasks in parallel (`maxConcurrent > 1`).
  - Verifies sequential and inline modes execute one task at a time (`maxConcurrent = 1`).

## Running Tests

To run the complete test suite across all modules:

```powershell
node --test .apm\skills\jl-fleet-mode\lib\harness-detection\index.test.ts .apm\skills\jl-fleet-mode\lib\fleet-mode-activation\index.test.ts .apm\skills\jl-fleet-mode\lib\fleet-mode-integration.test.ts
```
