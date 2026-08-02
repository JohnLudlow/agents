# Token Cost Model

Reference for diagnosing where tokens are **spent**. Three axes, each with
different compounding behaviour.

## Per-turn spend (context load)

Paid every turn, compounding across the session. The highest-leverage
reduction target.

- **Skill descriptions**: every model-invoked skill's description is
  injected into context on every turn. A 200-token description across a
  50-turn session spends 10,000 tokens. User-invoked skills pay zero.
- **AGENTS.md**: loaded every turn. Its size is direct context load.
- **MCP server instructions**: `<mcp_instructions>` blocks loaded per
  connected server, every turn.
- **Available skills list**: the enumeration of all skills (name +
  description) sits in context every turn, on top of the description
  itself.

**Diagnosis**: count model-invoked skills x average description size x
estimated session turns. If this exceeds ~20% of per-turn token budget,
descriptions are bloated or too many skills are model-invoked.

## Per-invocation spend (delegation)

Paid each time an agent is spawned. Does not compound but can spike.

| Agent type | Typical spend | Notes |
|---|---|---|
| Oracle | **High** | Expensive model, long analysis. Justified for hard architecture or debugging after failed attempts. |
| Task (any category) | **Medium-High** | Full subagent session with its own context window. May load skills and delegate further. |
| Explore | **Low** | Contextual grep. Cheap individually, often fired 3-5 in parallel. |
| Librarian | **Low** | External reference lookup. Same parallel pattern as explore. |

**Spend patterns to flag**:

- Oracle consulted for questions answerable from code already read
  (overspend)
- Explore/librarian fired for information already in context (wasted spend)
- Task spawned without `session_id` when a prior session covers the same
  work (re-spend on setup)
- Background agents fired but never collected (full cost, zero value)
- Agents repeating the same search across multiple invocations (spin)

## Per-message spend (prompt density)

Paid once per message. Low individual cost, high aggregate in verbose
sessions.

- **Large file reads**: entire files read when a line range or grep suffices
- **Verbose tool output**: commands producing thousands of lines untargeted
- **Redundant context**: restating information the agent already holds
- **Inlined reference**: skill reference that could be disclosed behind a
  context pointer, loaded only when needed

## Compound effects

- **Session length** multiplies per-turn spend. A 100-turn session with
  5 model-invoked skills pays ~100x their combined description size.
- **Late compaction**: carrying full context longer than needed before
  compacting.
- **Past the smart zone**: continuing in a degraded session past ~120k
  tokens instead of handing off to fresh context.
- **Skill sprawl**: many model-invoked skills installed "just in case" —
  each pays context load every turn whether invoked or not.
