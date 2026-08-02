# Related Agents & Skills

- **jl-planner** — Top-level planning agent; uses this reference for
  subagent spawning decisions
- **jl-feature-planner** — Subagent spawned by planner; uses this
  reference for Phase 2 harness detection
- **jl-adversarial-review** — Skill called by both planning agents;
  works across all harnesses (model-invoked)
- **jl-feature-reviewer** — Fallback agent (maintained for harness
  incompatibility). If this skill is unavailable, agents can invoke this agent
  as a workaround.
- **jl-planning-workflow** — Skill that orchestrates all planning
  BLOCKERs; references this skill for subagent spawning guidance when
  implementing Phase 2
