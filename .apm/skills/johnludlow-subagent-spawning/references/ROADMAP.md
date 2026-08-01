# Implementation Roadmap

## Phase 1 (Complete)

- ✅ Convert johnludlow-feature-reviewer agent → johnludlow-adversarial-review
  skill
- ✅ Document cross-harness behavior (this reference)

## Phase 2 (Future)

Implement harness detection in both planner agents.

Both planner agents should detect their harness at startup:

```text
AT SESSION START:
  harness = detect_harness()
    - If env var COPILOT_CLI_MODE exists: return "cli"
    - Else if window object exists (JavaScript): return "browser"
    - Else if Azure DevOps APIs available: return "azure-devops"
    - Else: return "unknown"

  Store harness in session_state for reference

WHEN SPAWNING SUBAGENT:
  If harness == "cli":
    Use task tool (native subagent spawning)
  Else if harness == "browser":
    Use skill invocation inline (no spawning)
    Optionally: offer johnludlow-feature-reviewer agent as fallback
  Else if harness == "azure-devops":
    Check for task tool availability
    Fall back to skills or agent fallback if unavailable

ALWAYS (before completion):
  Invoke johnludlow-adversarial-review skill (works in all harnesses)
  If skill unavailable: offer johnludlow-feature-reviewer agent as fallback
```

**Implementation effort:** ~3–4 hours (harness detection, graceful degradation,
testing)

## Phase 3 (Future)

Create user documentation:

- Add "Subagent Spawning" section to docs/README.md
- Link to troubleshooting guide
- Document how to detect your harness (Copilot CLI vs. browser vs. Azure DevOps)

**Implementation effort:** ~1 hour

## Open Questions

- [ ] Does Azure DevOps expose the task tool? (Critical for Phase 2)
- [ ] Does fleet mode ever support skills in future Copilot releases? (Design
      question)
- [ ] Should johnludlow-feature-reviewer agent be deprecated after Phase 2, or
      kept indefinitely as fallback?
