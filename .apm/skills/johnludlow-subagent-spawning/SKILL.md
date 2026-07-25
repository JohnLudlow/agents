# johnludlow-subagent-spawning

Reference guide for spawning subagents and coordinating planning work across
different Copilot harnesses (CLI, browser, Azure DevOps). Explains fleet mode
limitations and provides concrete workarounds.

## When This Skill Applies

This reference is relevant when:

- Your agent or the user needs to spawn a subagent (e.g., johnludlow-feature-planner)
- You're planning work in a harness other than Copilot CLI
- You need to coordinate multiple agents (original question: fleet mode support)
- You encounter errors like "embedded skills not supported" or "leading command
  does not produce an agent message"
- You're implementing Phase 2 (harness detection) or Phase 3 (user documentation)

## The Core Problem

Fleet mode (`/fleet /agent1 /agent2 ...`) cannot coordinate embedded skills —
only agents. When you try `/fleet /johnludlow-quiz ...`, it fails because quiz
is a skill invoked by agents, not an independent agent entry point.

**Root cause:** Fleet mode is designed to coordinate _agents only_. Skills are
invoked _inside_ an agent's context; they have no entry point in the agent
system, so fleet mode cannot dispatch to them.

## Design Intent

This separation is intentional:

- **Agents** are autonomous entry points users launch directly (`/agent-name`)
  or coordinate via fleet (`/fleet /agent-name`)
- **Skills** are domain expertise called _by_ agents conditionally
- A skill has no independent entry point; it exists only within agent context

## Workarounds by Harness

### Harness 1: Copilot CLI ✅

**Status:** Fully supported. Subagent spawning works best here.

**Recommended Flow:**

1. User: `/johnludlow-planner` (top-level agent)
2. Agent launches `johnludlow-feature-planner` as background subagent (via
   `task` tool)
3. Subagent completes planning artifact
4. Agent invokes `johnludlow-adversarial-review` skill (no fleet needed)
5. Returns to user with artifact + review verdict

**Key:** The `task` tool (`task: { agent_type: "johnludlow-feature-planner" }`)
spawns true subagents. Skills are then invoked directly within that context.
Fleet mode not needed.

**For Your Workflows:**

- Use Copilot CLI with the task tool for subagent spawning (primary supported flow)
- Skills invocation is automatic within agent context
- No fleet mode required

---

### Harness 2: Browser / OpenCode ⚠️

**Status:** Partial support. Skills work; fleet mode coordination is limited.

**Recommended Flow:**

1. User: `/johnludlow-planner`
2. Agent cannot spawn subagents (no task tool equivalent in browser)
3. Agent proceeds inline with skill invocations
4. Agent calls `johnludlow-adversarial-review` skill for reviews
5. Returns to user with results

**If Subagent Spawning Is Critical:**

1. User: `/johnludlow-planner`
2. Agent detects browser harness (Phase 2 work)
3. Agent offers: "Subagent spawning unavailable in browser. Review by
   johnludlow-feature-reviewer agent?" (user choice)
4. User confirms
5. Agent invokes `johnludlow-feature-reviewer` agent as fallback
   (agent-to-agent, no fleet needed)
6. Continues with review

**For Your Workflows:**

- Skills work perfectly in browser (no fleet needed)
- If subagent spawning is critical, keep `johnludlow-feature-reviewer` agent
  as fallback
- Detect harness at startup and offer graceful degradation (Phase 2)

---

### Harness 3: Azure DevOps / Copilot Extensions ❓

**Status:** Unknown. Requires testing in actual Azure DevOps environment.

**Expected Behavior:**

1. User: [Copilot in PR/issue]
2. Agent behavior depends on whether task tool is exposed
3. If task tool available: subagent spawning works (like CLI)
4. If task tool unavailable: use skill invocations or agent fallback (like
   browser)

**For Phase 2 Testing:**

- Does the task tool work? (check `list_agents` availability)
- Does skill invocation work? (check `disable-model-invocation: false` on
  johnludlow-adversarial-review)
- If neither: use johnludlow-feature-reviewer agent as fallback

---

## Why Not Use Fleet Mode Directly?

Fleet mode has a design constraint: only agents can be fleet members; skills
cannot be fleet members.

**Consequence:** `/fleet /johnludlow-quiz ...` fails because quiz is a skill,
not an agent.

**Could skills become fleet-capable?**

- Theoretically: Yes, if skills had entry points in the agent system
- Practically: This would blur the agent/skill boundary and add complexity
- Current design: Intentional separation; skills called by agents, not
  independently orchestrated

**Workaround:** If you absolutely need fleet coordination of multiple agents
(e.g., "run quiz in parallel with template validation"), see
**[DESIGN-RATIONALE.md](DESIGN-RATIONALE.md)** for pattern recommendations.

## Decision Table: Which Approach?

| Need | Harness | Recommended | Fallback |
|------|---------|-------------|----------|
| Spawn planning subagent | CLI | task tool (native) | skill inline |
| Spawn planning subagent | Browser | skill inline | feature-reviewer agent |
| Spawn planning subagent | Azure DevOps | task tool (if available) | skill or agent |
| Invoke adversarial review | Any | adversarial-review skill | feature-reviewer agent |
| Coordinate multiple agents | CLI | task tool | manual sequencing |
| Coordinate multiple agents | Browser | not supported | manual sequencing |

## Implementation Status & Roadmap

**Phase 1 (Complete):** Convert reviewer agent → skill, document cross-harness
behavior.

**Phase 2 (Future):** Implement harness detection in planner agents. See
**[ROADMAP.md](ROADMAP.md)** for detailed implementation plan and open questions.

**Phase 3 (Future):** Create user-facing documentation. See
**[ROADMAP.md](ROADMAP.md)**.

## Related Skills & Agents

See **[DEPENDENCIES.md](DEPENDENCIES.md)** for relationships to johnludlow-planner,
johnludlow-feature-planner, johnludlow-adversarial-review, johnludlow-feature-reviewer,
and johnludlow-planning-workflow.
