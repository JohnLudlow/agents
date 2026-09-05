# Vendor Research: Harness Detection APIs (AC5.1 / #194)

This reference captures the detection signals and capability policy used for AC5.1 harness selection.

The goal of #194 was to remove "unknown detection" blockers for Kiro, OpenCode, and Pi without over-claiming runtime capabilities that are not vendor-confirmed.

## Outcome Summary

| Harness | Detection signals | Fleet/subagent confidence | Research status | Runtime policy |
|---|---|---|---|---|
| Copilot CLI | `COPILOT_CLI_MODE` | High | Verified | Fleet enabled |
| Browser / Chat | `window` object | High (no spawning) | Verified | Inline only |
| Azure DevOps + GitHub | Azure DevOps context + GitHub host | Medium-high | Implemented with host heuristics | Fleet enabled |
| Azure DevOps + Azure Repos | Azure DevOps context + Azure Repos host | High (no fleet) | Implemented with host heuristics | Sequential fallback |
| Kiro | `KIRO_CLI_MODE` or `KIRO_IDE_SESSION` | Medium | Candidate markers researched and implemented | Sequential fallback |
| OpenCode | `OPENCODE_MODE` | Low-medium | Candidate marker researched and implemented | Sequential fallback |
| Pi | `PI_MODE` | Low-medium | Candidate marker researched and implemented | Sequential fallback |
| Unknown | No marker matched | N/A | Fallback | Sequential fallback |

## What #194 Changed

1. Resolved candidate detection markers for Kiro, OpenCode, and Pi.
2. Documented a conservative capability policy while vendor confirmation is pending.
3. Aligned runtime behavior with fallback safety: `fleet -> sequential -> inline`.
4. Removed "blocked on unknown detection API" as the default execution state.

## Detection Signals by Harness

### 1. Copilot CLI (verified)

- Detect via `COPILOT_CLI_MODE`.
- Fleet and sequential spawning are available.

### 2. Browser / Copilot Chat (verified)

- Detect via `typeof window !== 'undefined'`.
- No subagent spawning path in this harness; run inline.

### 3. Azure DevOps (implemented with host split)

Detect Azure DevOps context from runtime signals (environment variables and/or globals), then classify repository host:

- GitHub-hosted repository -> `azure-devops-github` (fleet available)
- Azure Repos-hosted repository -> `azure-devops-azure-repos` (fleet unavailable, sequential available)

### 4. Kiro (candidate markers implemented)

- Detect via `KIRO_CLI_MODE` or `KIRO_IDE_SESSION`.
- Marker pattern is implemented.
- Kiro documentation indicates subagent support in IDE/CLI contexts, but this repository's AC5.1 policy keeps fleet disabled until this specific runtime path is confirmed end to end.
- Capability policy is conservative in AC5.1 runtime selection: sequential fallback unless explicitly confirmed for this integration path.

### 5. OpenCode (candidate marker implemented)

- Detect via `OPENCODE_MODE`.
- Marker pattern is implemented.
- Capability policy is conservative: sequential fallback.

### 6. Pi (candidate marker implemented)

- Detect via `PI_MODE`.
- Marker pattern is implemented.
- Capability policy is conservative: sequential fallback.

## Detection Algorithm (Current)

```text
AT SESSION START:
  if COPILOT_CLI_MODE exists:
    harness = copilot-cli
  else if window object exists:
    harness = browser
  else if Azure DevOps context exists:
    if linked repository host is GitHub:
      harness = azure-devops-github
    else if linked repository host is Azure Repos:
      harness = azure-devops-azure-repos
  else if KIRO_CLI_MODE or KIRO_IDE_SESSION exists:
    harness = kiro
  else if OPENCODE_MODE exists:
    harness = opencode
  else if PI_MODE exists:
    harness = pi
  else:
    harness = unknown

  derive capability flags from harness
  cache in session state
```

## Capability Policy While Confirmation Is Pending

For Kiro/OpenCode/Pi, detection markers are implemented, but fleet-mode enablement remains conservative by design:

- `fleetModeAvailable = false`
- `sequentialSpawningAvailable = true`

This avoids false-positive fleet activation while still preserving isolated-context execution through sequential fallback.

## Follow-up Policy

No additional code-pattern tickets were required to complete #194 because researched detection markers were already implemented in the AC5.1 runtime modules.

If vendor documentation later confirms stronger capabilities, open targeted upgrade tickets to:

1. update capability flags in the harness detection module,
2. expand per-harness activation tests,
3. update user-facing matrix documentation.

## References

- `references/ROADMAP.md` (Phase 2.5 vendor research status)
- `SKILL.md` -> Fleet Mode Utilization and Harness Detection (AC5.1)
- `.apm/skills/jl-fleet-mode/lib/harness-detection/index.ts` (runtime implementation)
- `.apm/skills/jl-fleet-mode/lib/harness-detection/README.md` (integration reference)
