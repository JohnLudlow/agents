# Subagent Spawning and Fleet Mode

Fleet mode coordinates multiple independent agents in parallel, each with its
own isolated session context. Use this guide to understand when fleet mode
helps, which harnesses support it, and what happens when it's unavailable.

## When to Use Fleet Mode

Fleet mode shines when your work has **multiple independent tasks** — for example, "Plan this feature AND review the design in parallel."

**Fleet mode is worth using when:**

- You have 2 or more independent subtasks (planning + review, implementation + testing, etc.)
- Each subtask needs focused context to do its best work (~5 minutes or more)
- Results can be assembled after both finish

**Fleet mode is NOT worth using for:**

- Sequential work (step 1 feeds into step 2)
- Single decision trees ("discover what to do, then do it")
- Quick tasks under ~5 minutes (overhead costs more than parallelism saves)
- Immediate synchronous results ("I need the answer right now")

## How to Activate Fleet Mode

Users can manually request fleet mode using the `/fleet` command in Copilot CLI. Agents may also recommend it when they detect parallelizable work.

### Manual Activation: `/fleet`

Run multiple agents in parallel:

```bash
/fleet /agent1 /agent2 /agent3
```

Each agent runs in its own clean session, then their results are collected and reassembled.

**Example:**

```bash
/fleet /planner /reviewer
```

This runs the planner and reviewer agents in parallel, both focused on their own task.

### Automatic Activation

Agents detect your harness at session start and automatically choose the best spawning mode:

1. **Fleet mode** (if your harness supports it) — parallel agents, each with fresh context
2. **Sequential mode** (fallback) — agents run one at a time, still isolated
3. **Inline mode** (last resort) — agents run within the parent session's context

This happens silently; you don't need to configure anything. The agent picks the most powerful mode available.

## Harness Support Matrix

Different platforms have different capabilities. This matrix shows what your harness supports:

| Platform | Fleet Mode | Sequential | Inline | Notes |
|----------|:----------:|:----------:|:------:|-------|
| **Copilot CLI** | ✅ Yes | ✅ Yes | ✅ Yes | Full support; fleet mode is native and recommended |
| **Copilot in Browser** | ❌ No | ❌ No | ✅ Yes | Browser sessions run agents inline only |
| **Azure DevOps + GitHub repos** | ✅ Yes | ✅ Yes | ✅ Yes | Fleet mode available for GitHub-linked repos only |
| **Azure DevOps + Azure Repos** | ❌ No | ✅ Yes | ✅ Yes | Azure Repos don't support fleet; falls back to sequential |
| **Kiro IDE/CLI** | ⚠️ Pending | ✅ Yes | ✅ Yes | Detected at runtime; fleet capability is treated conservatively pending vendor confirmation |
| **OpenCode** | ⚠️ Pending | ✅ Yes | ✅ Yes | Detected at runtime; defaults to sequential fallback |
| **Pi** | ⚠️ Pending | ✅ Yes | ✅ Yes | Detected at runtime; defaults to sequential fallback |
| **Unknown harness** | ❌ No | ✅ Yes | ✅ Yes | Conservative fallback when detection cannot classify the harness |

**Legend:**

- ✅ **Yes** — fully supported
- ⚠️ **Conditional/Pending** — supported conditionally or awaiting vendor confirmation
- ❌ **No** — not available

## Automatic Fallback: What Happens When Fleet Mode Is Unavailable

When your harness doesn't support fleet mode, agents gracefully step down:

### The Fallback Chain

```text
Fleet Mode (parallel, isolated context)
    ↓ [unavailable, fall back to]
Sequential Mode (one agent at a time, isolated context)
    ↓ [unavailable, fall back to]
Inline Mode (within parent session context)
```

**At each step:**

1. **Fleet mode**: Agents run in parallel; each has pristine context
2. **Sequential mode**: Agents run one after another; each still gets isolated context before their turn
3. **Inline mode**: Agents run inside the parent's existing session, sharing context (smaller focus, lower latency)

If inline mode is active and you need parallelism anyway, you can manually route work to another harness with tools like Herdr.

Agents log which mode they're using so you know what's happening. You'll see messages like:
> "Fleet mode unavailable in this harness. Falling back to sequential dispatch."

## How Agents Activate Their Mode

Agents follow this sequence at session start:

1. **Detect your harness** — check environment variables and runtime features (e.g., `COPILOT_CLI_MODE` env var for CLI detection)
2. **Look up the capability** — consult the harness support matrix
3. **Try the highest-power mode available** — fleet first, then sequential, then inline
4. **Log the choice** — record which mode is active (visible in debugging if needed)

If harness detection can't determine your platform, agents conservatively default to **sequential mode** to ensure they keep working with isolated per-task context.

## Examples

### Example 1: Parallel Planning and Review (CLI — Fleet Mode)

You're on Copilot CLI and want to plan a feature AND review the design at the same time.

```bash
/fleet /planner /reviewer
```

**What happens:**

1. Copilot CLI detects fleet mode support (`COPILOT_CLI_MODE` env var present)
2. `/planner` runs in session A with clean context
3. `/reviewer` runs in session B with clean context (in parallel)
4. Both finish and results are collected

**Why this is faster:** Planner and reviewer don't interfere with each other's context.

### Example 2: Sequential Implementation + Testing (Azure DevOps + Azure Repos)

You're in Azure DevOps backed by Azure Repos and delegating implementation + testing.

```text
[You invoke implementation agent]
Agent detects: Azure DevOps + Azure Repos → fleet mode unavailable → fallback to sequential
  → Spawn implementer (finishes)
  → Spawn tester (runs with isolated context)
  → Collect results

Message to you:
"Fleet mode unavailable in this harness. Falling back to sequential dispatch."
```

**What's different:** Sequential mode is slower than fleet (one after another), but each agent still gets focused context.

### Example 3: Inline Work (Browser with No Spawning Support)

Some browser sessions don't support spawning at all. The agent continues inline:

```text
[You invoke implementation agent]
Agent detects: Browser harness → no spawning available → use inline skills
  → Call implementation skills directly
  → All work happens in this session

Message to you:
"This session doesn't support subagent spawning; running inline."
```

**Trade-off:** Inline is simplest but shares context, so each step competes for attention.

## When Agents Recommend `/fleet` to Users

Agents proactively suggest fleet mode when they detect suitable work:

> "Multiple independent subtasks detected. Try running `/fleet /agent1
> /agent2` to parallelize this work across isolated sessions."

**Agents recommend fleet only for:**

- 2+ independent subtasks (not sequential chains)
- Subtasks benefiting from focused context (> ~5 minutes of work each)
- Results that can be reassembled after both complete

Agents do NOT recommend fleet for quick, sequential, or tightly-coupled work.

## Technical Details and Implementation

For implementation-level details about fleet mode, model selection, harness
detection, and subagent coordination, see
`.apm/skills/jl-subagent-spawning/SKILL.md` → **Fleet Mode Utilization and
Harness Detection (AC5.1)**.

That reference covers:

- Harness detection pseudocode
- Model resolution hierarchy
- Approval gates and delegation permissions
- Circular delegation prevention
- Known fog items and pending Phase 2 work

## Troubleshooting

**Q: I ran `/fleet` but only one agent ran. What happened?**

A: Your harness may not support true parallel fleet mode. The agent fell back
to sequential mode. You'll see a message noting which fallback was used. Check
the harness support matrix above — if your platform doesn't have ✅ for Fleet
Mode, sequential is expected behavior.

**Q: Can I force fleet mode on my platform?**

A: No. Fleet mode is only available on platforms that support it natively. If
your harness doesn't support it, agents automatically fall back to sequential
or inline. You can use Herdr to multiplex to a different harness if you have
multiple sessions available (advanced use case).

**Q: Why does sequential mode take longer than I expect?**

A: Each subagent gets a fresh isolated context, which is powerful for focus but
costs some setup time. If your subtasks are very quick (< ~5 minutes total),
sequential overhead may outweigh the benefit — in that case, inline mode is
faster. Agents consider this when recommending fleet.

**Q: What if my harness is unknown or detection fails?**

A: Agents conservatively default to sequential mode to keep working. If
sequential spawning is unavailable, they fall back to inline mode. If you know
your harness supports fleet mode, you can file an issue to improve detection
for your platform.

## See Also

- **Installation & Setup**: See `docs/INSTALLATION.md` for how to install these agents
- **Agent Reference**: See the root `README.md` for an overview of available agents
- **For Developers**: If you're building agents, see `.apm/skills/jl-subagent-spawning/SKILL.md` for delegation APIs and configuration
