# When NOT to Delegate: Anti-Patterns and Overhead Threshold

Delegation is not always the right choice. This reference documents the
anti-patterns that should keep a parent agent executing inline instead of
spawning a subagent, and the overhead threshold behind them.

## Overhead Threshold

**Don't delegate tasks under ~5 minutes** of execution time on a simple path.
Delegation overhead includes:

- Subagent spawning
- Context transfer
- Result merging
- Session teardown

For tasks under this threshold, inline execution is typically faster than the
combined cost of spawning, transferring context, and merging results back.

## Anti-Patterns

### 1. Task is too small to benefit from parallelism

- Task will take under 5 minutes on a simple path
- Overhead of spawning, context transfer, and merging exceeds the time savings
- Inline execution is faster and simpler

**Example:** Don't delegate a single missing import or one-line lint fix. **Do
it inline.**

### 2. No exploration or decision-making needed

- Task outcome is deterministic and fully specified
- Parent agent has all context and can execute safely without research
- No benefit from separation of concerns or specialist expertise

**Example:** Don't delegate "run linter and report results if any errors";
you already know the command. **Do it inline.** *Do* delegate "analyze these
200 linting errors and propose a fix strategy" if the analysis is complex.

### 3. Synchronous result needed immediately

- Parent workflow cannot proceed without the child result in hand
- Subagent spawning latency becomes a bottleneck
- Inline execution unblocks the parent faster

**Example:** Don't delegate a model inference call needed 10ms later. **Do it
inline.** *Do* delegate "research and summarize 20 papers on this topic" if
the parent can collect other work while research runs in parallel.

### 4. No human input or clarification possible

- Task requires mid-stream questions for the human
- Spawned child cannot reach back to the parent session for guidance
- Inline execution preserves the conversation loop

**Example:** Don't delegate discovery work whose next steps depend on user
feedback. **Do it inline.** *Do* delegate bounded, pre-approved research.

### 5. Unbounded depth or nesting

- Risk of delegation chains spiraling into recursion
- Child agents spawning grandchildren, great-grandchildren, etc.
- Debugging and failure recovery become exponentially harder

**Example:** Don't let a feature-implementer delegate to a feature-planner
that delegates to another planner. **Limit depth** to 1–2 levels max — see
`SKILL.md` → Circular Delegation Prevention for the enforced
`maxNestingDepth` mechanism.

## Related

- `SKILL.md` — inline summary and the `DelegateToSubagent` contract these
  heuristics apply to.
- `SKILL.md` → Circular Delegation Prevention — the nesting-depth safeguard
  referenced in anti-pattern 5.
