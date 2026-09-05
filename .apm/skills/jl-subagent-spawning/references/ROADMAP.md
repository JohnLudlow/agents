# Implementation Roadmap

This roadmap tracks AC5.1 delivery status for fleet-mode utilization and harness detection.

## Phase 1: Foundations (Complete)

- ✅ Convert reviewer-agent pattern to reusable skill guidance.
- ✅ Document cross-harness delegation behavior.
- ✅ Define fleet-mode activation strategy and fallback policy.

## Phase 2: Runtime Implementation (Complete)

Implemented and validated in:

- #190 — Harness detection module
- #191 — Fleet-mode activation strategy
- #192 — End-to-end validation across harnesses

Delivered runtime behavior:

1. Detect harness once at session start.
2. Derive capability flags from harness identity.
3. Select mode automatically: `fleet -> sequential -> inline`.
4. Log fallback decisions for debugging and auditability.

## Phase 2.5: Vendor Research Baseline (Complete via #194)

Research outcomes are documented in `VENDOR_RESEARCH_HARNESS_DETECTION.md`.

### Detection status

- ✅ Copilot CLI: verified (`COPILOT_CLI_MODE`)
- ✅ Browser: verified (`window` object)
- ✅ Azure DevOps: implemented context + repository-host split
- ✅ Kiro: marker-based detection implemented (`KIRO_CLI_MODE` / `KIRO_IDE_SESSION`)
- ✅ OpenCode: marker-based detection implemented (`OPENCODE_MODE`)
- ✅ Pi: marker-based detection implemented (`PI_MODE`)

### Capability status

- Fleet enabled: Copilot CLI, Azure DevOps + GitHub
- Sequential fallback: Azure DevOps + Azure Repos, Kiro, OpenCode, Pi, Unknown
- Inline only: Browser (no spawning path)

### Guardrail

For Kiro/OpenCode/Pi, marker detection is implemented but fleet capability remains conservative until vendor confirmation arrives for this integration path.

## Phase 3: User Documentation (Complete)

- ✅ #193 — User-facing fleet-mode documentation published and aligned with runtime fallback behavior.

## Phase 4: Unified Delegation API

- ✅ #195 prototype completed for Copilot CLI:
  - unified `delegateToSubagentPrototype(...)` call shape
  - deterministic mode fallback (`fleet -> sequential -> inline`)
  - model-resolution hierarchy and structured decision logging
- ⏳ Cross-harness production abstraction remains open (future architecture work).

## Remaining Open Questions

1. **Vendor confirmation hardening**
   - Confirm Kiro/OpenCode/Pi marker names and runtime stability.
   - Confirm whether any of these harnesses should be upgraded from sequential to fleet in AC5.1 policy.
2. **Result coordination depth**
   - Decide whether fleet result aggregation requires additional contract structure for large DAG-style fan-out.
3. **Sequential fallback refinement**
   - Confirm when manual cross-harness tools (for example Herdr) should be suggested vs. staying in-harness.
