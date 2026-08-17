# Agent Schema

Canonical schema and conventions for agent definitions.

## Canonical Authoring Location

Author new and updated agent definitions in:

- `.apm/agents/jl-[name].agent.md` — canonical APM agent primitive with YAML frontmatter and agent body

Legacy `agents/jl-[name].md` plus `agents/jl-[name].json` sidecars are back-compat reference material only. Do not treat
`agents/` as the primary authoring location for new repository work.

## Markdown Required Sections

Agent definition markdown must include:

- Description: Brief overview of the agent
- Purpose: What the agent does
- Inputs: What the agent accepts
- Outputs: What the agent produces
- Requirements: MUST, SHOULD, MUST NOT clauses
- Capabilities: What the agent can do
- Restrictions: What the agent cannot do
- Integration: How it works with other agents

> **Note:** Do not add a `## Temperature` section to the markdown. For canonical `.apm/` primitives, temperature belongs
> in YAML frontmatter. If you are maintaining a legacy back-compat reference in `agents/`, temperature belongs in the
> JSON sidecar instead.

## Legacy JSON Sidecar Schema

Back-compat reference only:

```json
{
  "description": "One-line description shown in agent pickers",
  "mode": "primary",
  "temperature": 0.2,
  "permission": {
    "read": { "*": "allow" },
    "edit": { "*": "deny" },
    "bash": { "*": "deny", "git log*": "allow" },
    "grep": { "*": "allow" },
    "webfetch": "ask",
    "task": { "*": "deny" }
  }
}
```

- Use this only when maintaining a legacy back-compat reference under `agents/`
- `mode`: `"primary"` for user-facing agents, `"subagent"` for delegated agents
- `temperature`: `0.0`-`1.0`. Lower = more deterministic.
- `permission`: OpenCode permission map. Copilot uses description + temperature only.

## Naming Convention

- All agent names start with `jl-`
- Use hyphen-separated names (for example, `jl-feature-planner`)
- Canonical APM primitive files use the `.agent.md` suffix
- Legacy `agents/*.md` plus `agents/*.json` sidecars remain back-compat references only

## Documentation

- Use clear, plain English
- Define any technical jargon
- Include examples where helpful
- Link to related agents and skills
