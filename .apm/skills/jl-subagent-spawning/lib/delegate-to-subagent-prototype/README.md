# DelegateToSubagent Prototype (Copilot CLI)

This folder contains the #195 Phase 4 prototype for a unified
`DelegateToSubagent` API in one harness.

## Scope

- Implemented harness: **Copilot CLI**
- Fallback chain: `fleet -> sequential -> inline`
- Model resolution: `explicit -> task-override -> per-type -> per-agent -> global -> fallback`
- Decision logging: structured timestamped events at each major decision point

## Files

- `index.ts` — prototype API contract and implementation
- `index.test.ts` — unit tests for mode selection, model fallback, and logging

## Notes

This is intentionally a prototype, not a cross-harness production abstraction.
For non-CLI harnesses, this implementation records a warning and returns inline
fallback behavior.
