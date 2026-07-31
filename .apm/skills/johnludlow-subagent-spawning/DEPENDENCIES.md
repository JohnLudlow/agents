# Related Agents & Skills

- **johnludlow-planner** — Top-level planning agent; uses this reference for
  subagent spawning decisions
- **johnludlow-feature-planner** — Subagent spawned by planner; uses this
  reference for Phase 2 harness detection
- **johnludlow-adversarial-review** — Skill called by both planning agents;
  works across all harnesses (model-invoked)
- **johnludlow-feature-reviewer** — Fallback agent (maintained for harness
  incompatibility). If this skill is unavailable, agents can invoke this agent
  as a workaround.
- **johnludlow-planning-workflow** — Skill that orchestrates all planning
  BLOCKERs; references this skill for subagent spawning guidance when
  implementing Phase 2
