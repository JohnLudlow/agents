# Why Not Use Fleet Mode Directly?

**Status: superseded for the recommend-to-user pattern.** See
`SKILL.md` → "Fleet Mode Utilization (AC1.5)" and "Why Fleet Mode Isn't
Always an Option" for the current guidance: a delegating skill recommends
`/fleet` to the user when genuinely parallelizable work exists; it never
tries to join a fleet itself. The constraint below only matters for the
different case this document was originally written for — directly
coordinating skills *as* fleet members, which this delegation contract
does not attempt.

Fleet mode would be ideal for coordinating multiple agents, but it has a design
constraint: only agents can be fleet members; skills cannot be fleet members.

## The Constraint

- **Fleet mode:** `user → /fleet /agent1 /agent2 → model coordinates agents`
- **Constraint:** Only agents can be fleet members; skills cannot be fleet
  members
- **Consequence:** `/fleet /jl-quiz ...` fails because quiz is a skill,
  not an agent

## Could Skills Become Fleet-Capable?

- **Theoretically:** Yes, if skills had entry points in the agent system
- **Practically:** This would blur the agent/skill boundary and add complexity
- **Current design:** Intentional separation; skills called by agents, not
  independently orchestrated

## Workaround for Multi-Agent Coordination

If you absolutely need fleet coordination of multiple agents (e.g., "run quiz
in parallel with template validation"), create wrapper agents that invoke those
skills. This adds an agent layer but keeps skills focused.

Example:

```text
Wrapper: quiz-runner agent
  ├─ invokes jl-quiz skill (Mode A)
  └─ waits for completion

Wrapper: template-validator agent
  ├─ invokes jl-plan-template skill
  └─ waits for completion

Fleet: /fleet /quiz-runner /template-validator
  ├─ coordinates the two agents in parallel
  └─ collects results
```

This pattern preserves the agent/skill boundary while enabling fleet
coordination.
