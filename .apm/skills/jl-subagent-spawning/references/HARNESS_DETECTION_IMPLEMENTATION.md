# Harness Detection Implementation Specification (AC5.1, #190)

Reference for the runtime harness detection module — the foundation for fleet mode activation.

**Status:** Phase 1 implemented ✅ (Copilot CLI, Browser, Azure DevOps). Phase 2 awaiting vendor research follow-ups (Kiro, OpenCode, Pi).

**Implementation:** `.apm/skills/jl-fleet-mode/lib/harness-detection/index.ts` (595 lines, all tests passing).

## Goals

- Reliably identify which harness an agent is running in at session start
- Store the result in session state for downstream fleet mode activation
- Gracefully fall back to "unknown" harness when detection fails
- Log detection results and fallback decisions for debugging

## Detection Sequence

Detect harnesses in this order. **First match wins** — stop after finding a harness.

1. **Copilot CLI** (verified ✅)
   - Check: `process.env.COPILOT_CLI_MODE` exists
   - If true: `return "copilot-cli"`
   - Fleet support: ✅ Full (use task tool with mode="background")

2. **Browser / Copilot Chat** (verified ✅)
   - Check: `typeof window !== 'undefined'`
   - If true: `return "browser"`
   - Fleet support: ❌ No (inline skills only)

3. **Azure DevOps** (partially verified ⚠️)
   - Check: Detect Azure DevOps context (see candidates below)
   - If found: Distinguish linked repo type (GitHub vs Azure Repos)
     - GitHub-linked: `return "azure-devops-github"` (fleet support ✅)
     - Azure Repos: `return "azure-devops-azure-repos"` (fleet support ❌)
   - Fleet support: Conditional (GitHub only)

4. **Kiro** (unresolved ❓)
   - Check: Candidates from #194 vendor research
   - If found and `subagent` in tools: `return "kiro"`
   - Fleet support: ⚠️ Limited (requires `subagent` tool)

5. **OpenCode** (unresolved ❓)
   - Check: Candidates from #194 vendor research
   - If found: `return "opencode"`
   - Fleet support: ❓ Unknown

6. **Pi** (unresolved ❓)
   - Check: Candidates from #194 vendor research
   - If found: `return "pi"`
   - Fleet support: ❓ Unknown
   - Note: Integrate with existing Herdr support (#147)

7. **Fallback: Unknown**
   - If no harness matched: `return "unknown"`
   - Fleet support: ❌ No (sequential dispatch only)

## Phase 1 Implementation (✅ Complete)

**Status:** All 3 detection patterns implemented and tested.

**Implemented harnesses:**
- ✅ **Copilot CLI** — Detects `COPILOT_CLI_MODE` env var
- ✅ **Browser** — Detects JavaScript `window` object
- ✅ **Azure DevOps** — Detects VSS/TFS globals or Azure env vars; secondary detection for GitHub vs Azure Repos

**Delivered:**
- Detection module (`.apm/skills/jl-fleet-mode/lib/harness-detection/index.ts`, 595 lines)
- Session state initialization with structured logging
- Capability flag derivation (3 flags × 5 harnesses in Phase 1)
- Comprehensive test suite (unit + integration, all passing)
- Documentation (README.md with usage, capability matrix, error handling)

**AC Items Completed (6/9):**
- ✅ AC5.1.1 Copilot CLI detection works
- ✅ AC5.1.2 Browser detection works
- ✅ AC5.1.3 Azure DevOps detection works; distinguishes GitHub-linked vs Azure Repos
- ✅ AC5.1.4 Harness detection happens once at session start, stored in session state
- ✅ AC5.1.5 Unknown harness gracefully defaults to sequential dispatch with logging
- ✅ AC5.1.6 All detection patterns follow SKILL.md § Fleet Mode Utilization pseudocode

**How to Use (Phase 1 Consumers):**
```typescript
import { detectHarness, initializeHarnessSessionState } from '@copilot/harness-detection';

const detection = detectHarness();
const sessionState = initializeHarnessSessionState();

if (detection.capabilities.fleetModeAvailable) {
  // Use fleet mode (parallel subagent spawning)
} else if (detection.capabilities.sequentialSpawningFallback) {
  // Fall back to sequential dispatch
}
```

## Phase 2 Implementation (⏸️ Blocked on Vendor Research Follow-ups)

**Status:** Awaiting #194 vendor research follow-up tickets for detection API confirmation.

**Target harnesses:**
- ❓ **Kiro** — Detection API unknown; blocked on #194 follow-up
- ❓ **OpenCode** — Detection API unknown; blocked on #194 follow-up
- ❓ **Pi** — Detection mechanism unknown; blocked on #194 follow-up; Herdr integration (#147)

**Why Phase 2 is blocked:**
Kiro, OpenCode, and Pi have no documented detection mechanisms. Phase 1 (AC5.1.7–9) cannot complete until vendor research (#194) produces follow-up tickets with confirmed APIs.

**For Phase 2 implementers:**
After vendor research follow-ups confirm detection mechanisms:
1. Add new detection pattern to `.apm/skills/jl-fleet-mode/lib/harness-detection/index.ts`
2. Insert new pattern in detection sequence (between Azure DevOps and Unknown)
3. Add tests in `index.test.ts`
4. Update capability flags table
5. Mark AC5.1.7, AC5.1.8, AC5.1.9 complete when all 3 are implemented

**Reference:** See #194 `VENDOR_RESEARCH_HARNESS_DETECTION.md` § "Recommendations for Phase 2" for candidate detection methods.

## Implementation Reference

**Phase 1 is implemented in:** `.apm/skills/jl-fleet-mode/lib/harness-detection/index.ts`

**Exports:**
- `detectHarness()` — Run once per session, cached
- `initializeHarnessSessionState(logger?)` — Initialize at startup with structured logging
- `getHarnessSessionState()` — Retrieve cached state

**Implementation notes:**
- Detection sequence (CLI → Browser → Azure DevOps → Unknown) implemented with first-match-wins logic
- Session caching ensures `detectHarness()` runs once per process lifetime
- Structured logging on initialization (`"Harness detected"` + `"Harness capabilities initialized"`)
- All detection functions wrapped in try-catch (graceful fallback to unknown on errors)
- Azure DevOps secondary detection distinguishes GitHub-linked repos from Azure Repos
- Capability flags derived from harness type (see table below)

**For detailed code reference, see the implementation file directly.** This specification is no longer the source of truth for HOW to detect — that's now in the code. This specification remains authoritative for WHAT the detection sequence is and when to add Phase 2 harnesses.
  // Store detection result
  sessionState.harness = harness;
  
  // Derive capability flags
  sessionState.fleetModeAvailable = hasFleetModeSupport(harness);
  sessionState.subagentSpawningAvailable = hasSubagentSupport(harness);
  
  // Log detection for debugging
  logDetectionResult(harness);
}
```

## Capability Flags Reference

These 3 boolean flags are derived from the detected harness and stored in session state:

| Harness | Fleet Mode | Subagent Spawning | Sequential Fallback |
|---------|:----------:|:-----------------:|:-------------------:|
| **Copilot CLI** | ✅ | ✅ | ✅ |
| **Browser** | ❌ | ❌ | ❌ |
| **Azure DevOps + GitHub** | ✅ | ✅ | ✅ |
| **Azure DevOps + Azure Repos** | ❌ | ❌ | ✅ |
| Kiro (Phase 2) | ⚠️ Limited | ⚠️ Limited | ✅ |
| OpenCode (Phase 2) | ❓ | ❓ | ✅ |
| Pi (Phase 2) | ❓ | ❓ | ✅ |
| Unknown | ❌ | ❌ | ✅ |

**See the implementation** (`.apm/skills/jl-fleet-mode/lib/harness-detection/index.ts`) for the `deriveCapabilities()` function that computes these flags from detected harness.

**Downstream consumers should:**
1. Call `initializeHarnessSessionState()` at agent startup
2. Check `sessionState.capabilities.fleetModeAvailable` to decide on fleet mode
3. Check `sessionState.capabilities.sequentialSpawningFallback` for fallback spawning
4. Default to inline execution if both are false (Browser harness)

## Azure DevOps Detection (✅ Implemented Phase 1)

The implementation in `.apm/skills/jl-fleet-mode/lib/harness-detection/index.ts` detects Azure DevOps using:

**Primary detection** (Azure DevOps context):
- Environment variables: `SYSTEM_TEAMFOUNDATIONCOLLECTIONURI`, `BUILD_REPOSITORY_URI`, `SYSTEM_TEAMPROJECT`, etc.
- Globals: `VSS` or `TFS` objects in `globalThis`

**Secondary detection** (repo type):
- Provider metadata: `BUILD_REPOSITORY_PROVIDER` env var or VSS context
- Repository URL: Pattern match against `github.com` vs `dev.azure.com` / `visualstudio.com`

**Result:**
- GitHub-linked Azure DevOps → `azure-devops-github` (fleet mode available)
- Azure Repos-hosted → `azure-devops-azure-repos` (sequential fallback only)

See implementation for exact heuristics and fallback patterns.

## Kiro Detection (❓ Phase 2 Blocked)

**Status:** Not yet implemented. Detection API unknown; blocked on #194 vendor research follow-ups.

**Expected implementation** (Phase 2, after vendor research):
- Check environment variables or globals from #194 candidates
- Verify `subagent` tool available if Kiro indicated
- Default to sequential dispatch if detection uncertain

**For Phase 2 implementers:** Add detection pattern between Azure DevOps and Unknown fallback in `.apm/skills/jl-fleet-mode/lib/harness-detection/index.ts`.

## OpenCode Detection (❓ Phase 2 Blocked)

**Status:** Not yet implemented. Detection API unknown; blocked on #194 vendor research follow-ups.

**Expected implementation** (Phase 2, after vendor research):
- Check environment variables or globals from #194 candidates
- Verify tool availability if OpenCode indicated
- Default to sequential dispatch if detection uncertain

**For Phase 2 implementers:** Add detection pattern between Azure DevOps and Unknown fallback in `.apm/skills/jl-fleet-mode/lib/harness-detection/index.ts`.

## Pi Detection (❓ Phase 2 Blocked)

**Status:** Not yet implemented. Detection API unknown; blocked on #194 vendor research follow-ups.

**Expected implementation** (Phase 2, after vendor research):
- Check environment variables or globals from #194 candidates
- Integrate with existing Herdr support (#147)
- Verify capabilities if Pi indicated
- Default to sequential dispatch if detection uncertain

**For Phase 2 implementers:** Add detection pattern between Azure DevOps and Unknown fallback in `.apm/skills/jl-fleet-mode/lib/harness-detection/index.ts`.

## Logging (✅ Implemented Phase 1)

Session initialization calls structured logging via `initializeHarnessSessionState(logger)`:

```javascript
logger.info('Harness detected', {
  harness: 'copilot-cli',  // or other harness
  azureRepoType: undefined, // populated only for Azure DevOps
  detectionReason: '...',  // why detection fired
  timestamp: '2026-09-04T18:47:41.777Z'
});

logger.info('Harness capabilities initialized', {
  harness: 'copilot-cli',
  fleetModeAvailable: true,
  subagentSpawningAvailable: true,
  sequentialSpawningFallback: true,
  timestamp: '2026-09-04T18:47:41.777Z'
});
```

Default logger writes to `console.info()` in JSON format for structured log parsing.

## Testing (✅ Implemented Phase 1)

**Test file:** `.apm/skills/jl-fleet-mode/lib/harness-detection/index.test.ts`

**Phase 1 test coverage:**
- ✅ Copilot CLI detection (env var check)
- ✅ Browser detection (window object)
- ✅ Azure DevOps detection (env vars + globals)
- ✅ GitHub-linked repo detection
- ✅ Azure Repos detection
- ✅ First-match-wins behavior (CLI prefers over Browser)
- ✅ Detection caching (same result on subsequent calls)
- ✅ Session state initialization and logging
- ✅ Error handling (graceful fallback to unknown)

**Phase 2 test requirements** (for Kiro, OpenCode, Pi):
- Mock detection APIs from #194 vendor research findings
- Test each harness in isolation
- Test fallback behavior when detection APIs unavailable
- Test integration with existing code (session state, logging)
- Mock runtime objects (window, global Kiro/OpenCode/Pi)
- Verify each detection pattern works in isolation

**Integration tests (full sequence):**
- Verify detection sequence stops at first match
- Verify fallback to "unknown" works
- Verify session state initialized correctly
- Verify logging captures all decisions

**Harness-specific tests:**
- Copilot CLI: Mock `COPILOT_CLI_MODE` env var
- Browser: Mock `window` object
- Azure DevOps: Mock Azure DevOps APIs + repo type distinction
- Kiro/OpenCode/Pi: Mock detection candidates + tools array

## Completion Criteria (AC5.1 #190)

### Phase 1 (✅ Complete — 6/9 items)

✅ **AC5.1.1** Copilot CLI detection works (check `COPILOT_CLI_MODE` env var)
✅ **AC5.1.2** Browser detection works (check `window` object)
✅ **AC5.1.3** Azure DevOps detection works; distinguishes GitHub-linked vs Azure Repos
✅ **AC5.1.4** Harness detection happens once per session; cached in session state
✅ **AC5.1.5** Unknown harness gracefully defaults to sequential dispatch with logging
✅ **AC5.1.6** All detection patterns follow SKILL.md § Fleet Mode Utilization pseudocode

### Phase 2 (⏸️ Blocked — 3/9 items)

⏸️ **AC5.1.7** Kiro detection attempted (blocked on #194 vendor research follow-up)
⏸️ **AC5.1.8** OpenCode detection attempted (blocked on #194 vendor research follow-up)
⏸️ **AC5.1.9** Pi detection attempted; integrate with Herdr #147 (blocked on #194 vendor research follow-up)

**Unblocking Phase 2:**
After #194 completes vendor follow-ups, Phase 2 implementers should:
1. Read #194 vendor research findings for Kiro, OpenCode, Pi
2. Implement detection patterns (see Phase 2 Implementation section above)
3. Run tests and mark AC5.1.7–9 complete

## References

- **Implementation:** `.apm/skills/jl-fleet-mode/lib/harness-detection/index.ts` (595 lines, all Phase 1 tests passing)
- **Tests:** `.apm/skills/jl-fleet-mode/lib/harness-detection/index.test.ts`
- **Documentation:** `.apm/skills/jl-fleet-mode/lib/harness-detection/README.md`
- **Vendor research:** VENDOR_RESEARCH_HARNESS_DETECTION.md (provides Phase 2 candidates)
- **Design:** SKILL.md § Fleet Mode Utilization and Harness Detection (AC5.1)
- **Roadmap:** ROADMAP.md (phase timeline and blockers)
- **Downstream:** #191 (Fleet Mode Activation Strategy consumes this module)
