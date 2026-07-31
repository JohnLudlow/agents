# Integration Patterns

## Model-Invocation

This skill is **model-invoked** (`disable-model-invocation: false`). Agents can
autonomously invoke it when:

- A subagent has completed a subtask and needs quality check before returning
  to parent
- A planning agent has completed artifact generation and needs gate before
  surfacing to user
- Any agent producing a deliverable wants cold, adversarial feedback

Example agent integration:

```text
If the implementation looks complete:
  Invoke johnludlow-adversarial-review skill for code review
  If verdict is FAIL: iterate and re-review
  If verdict is PASS or PASS with NITS: proceed to next step
```

## Cross-Harness Availability

This skill is designed to work across all harnesses:

- **Copilot CLI** — agents invoke skill directly via skill system
- **Browser / OpenCode** — agents invoke skill via model-invocation
- **Azure DevOps / Copilot Extensions** — depends on harness agent execution
  support

## Fleet Mode & Subagent Spawning

If you need one agent to spawn a reviewer _subagent_ via fleet mode, use the
**johnludlow-feature-reviewer agent** instead (maintained as fallback). Fleet
mode coordinates agents only, not skills. Skills must be invoked directly
within an agent's context. For harnesses that don't support skill invocation,
the separate agent provides fallback coverage.

For details on cross-harness subagent spawning, see the
**johnludlow-subagent-spawning** skill.

## Model Configuration

Set model temperature to **0.2** (cold, critical thinking). Adversarial review
requires skepticism, not enthusiasm.
