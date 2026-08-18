# Result Aggregation for Chained Delegations

This reference documents the output shapes produced by delegated tickets, how
a parent agent combines multiple results when more than one delegation
completes in a single session, how partial failures are reported, and how
token/timing/model usage is rolled up across a chain.

This contract is Phase 1 documentation only. No callable aggregation function
exists yet. The shapes below are reference specifications in the same spirit
as `DelegationRequest` and `DelegationResult` in `SKILL.md` — they describe
what agents should produce and consume, not a runtime library.

## Per-Ticket-Type Output Shapes

Each resolved ticket produces output in one of four shapes depending on its
fixed ticket type (see `jl-recon/SKILL.md` → Ticket Types). The type is fixed
at ticket creation and never changes. These shapes are expressed as prose
conventions carried inside `DelegationResult`'s existing `summary` and
`artifacts` fields — no new fields are added to `DelegationResult` for this.

### Research

- `summary` — a narrative describing the findings.
- `artifacts` — any supporting sources, API references, or file paths cited
  by the findings.

The human reviews and accepts Research findings before the ticket closes.
Research is the only ticket type that may run AFK, and only with the human's
explicit per-ticket sign-off.

### Prototype

- `summary` — the branch name or diff-patch path produced by `jl-prototype`,
  together with its final recommendation: **keep**, **discard**, or **merge**
  selected child outputs (see `jl-prototype/SKILL.md` for this vocabulary).
- `artifacts` — the prototype branch or artifact location.

`jl-prototype` performs its own quiz, branch, and self-check. The
recommendation reflects that self-check result, not a parent agent's
judgment. The human reviews the artifact and recommendation; the parent
records the human's decision to the map.

### Quiz

- `summary` — the resolved decision, in the same terms as the ticket's
  question (for example, "Use ratatui for the TUI framework").

A Quiz ticket resolves exactly one decision. The `summary` string is what
gets appended to the map's Decisions-so-far list: one line, one place. No
supporting structure is needed beyond the decision text itself.

### Task

- `summary` — completion status (done, partial, or skipped) and a record of
  any side effects: access provisioned, data moved, service signups, or
  source-change descriptions for tasks that touched code.

## Aggregated Delegation Result

A parent session that runs more than one delegation — the typical case is an
approved AFK Research ticket running in parallel with a live Quiz, as
described in the ping-pong game example from issue #77 — collects individual
`DelegationResult` items into an `AggregatedDelegationResult`.

This structure is a flat, ordered list — not a merged or nested object.
Ordering is by completion time (first-completed first), which is the natural
order in which the parent can report results to the human without waiting
for all delegations to finish. Note that today's Mode 2 rule ("never resolve
more than one ticket in a single pass, except an approved AFK Research
ticket") makes true multi-result aggregation an edge case, not the common
path — most passes still produce exactly one `DelegationResult`.

### `AggregatedDelegationResult`

```text
AggregatedDelegationResult {
  results: DelegationResult[]     -- ordered by completion time
  aggregationStatus: "success" | "partial" | "failure"
  warnings: string[]              -- union of all DelegationResult.warnings[]
  totalUsage?: AggregatedUsage    -- present only when at least one result
                                  --   carries a usage record; see below
}
```

#### Fields

- `results` — the ordered list of individual `DelegationResult` items, each
  carrying its per-ticket-type output in `summary` and `artifacts` as
  described above.
- `aggregationStatus` — reflects the worst outcome in the list. A single
  failure among otherwise successful delegations yields `"partial"`, not
  `"success"`.
- `warnings` — the union of every `DelegationResult.warnings[]` across all
  results: model-substitution warnings, harness-fallback warnings, and
  partial-failure descriptions. Surface these to the human before recording
  any resolution to the map.
- `totalUsage` — optional; present only when at least one `DelegationResult`
  carries a `usage` record. See Token and Timing Rollup below.

## Partial Failure Handling

When one delegation in a chain fails and another succeeds, the parent agent:

1. Emits the succeeded result(s) to the human immediately — do not hold them
   back waiting for the failed delegation.
2. Records the failure in the failed `DelegationResult.warnings` in plain
   language: what failed, and whether it was a timeout, an error, or a
   cancellation.
3. Sets `aggregationStatus` to `"partial"` in the
   `AggregatedDelegationResult`.
4. If the failed delegation had an active worktree and its preservation step
   also failed, the Worktree Lifecycle rollback rule applies (see
   `SKILL.md` → Worktree Lifecycle → Rollback on preservation failure):
   abort cleanup, leave the worktree in place, and record its path in
   `warnings`. Do not force-remove a worktree whose preservation step
   failed.

## Subagent Failure Recovery Policy

Resolves the "Subagent failure recovery" fog item from #110
([#128](https://github.com/JohnLudlow/agents/issues/128)).

Delegated subagents in this repo typically make real, non-idempotent
changes — commits, file edits, generated tests. A blind retry risks
duplicate work or double-committed changes, so this policy is deliberately
conservative:

### No automatic retry

A failed delegation is never retried automatically, regardless of
delegation type or failure reason. Every failure surfaces to the human
before any retry is attempted — see "Graceful degradation" below. This
applies uniformly; there is no side-effect-free exception for Research or
Quiz delegations.

### No framework-defined timeout

This framework does not define its own timeout duration or enforce one on
top of a harness's own limits. **Timeout** is one of the four existing
Worktree Lifecycle cleanup triggers (Success, Timeout, Error, User
cancellation) — a harness may report a timeout however it detects one; this
policy governs what happens *after* that report arrives, not how or when it
fires.

### Graceful degradation

Once a failure (of any kind — timeout, error, cancellation) has been
recorded and surfaced to the human, ask explicitly rather than choosing on
their behalf:

> Delegation to `{targetAgent}` failed: {reason}. Retry manually, fall back
> to inline execution, or abandon this task?

- **Retry manually** — the human re-issues the delegation; this is not an
  automatic retry, since a human decision gates it each time.
- **Fall back to inline** — the parent agent completes the bounded task
  itself instead of delegating it.
- **Abandon** — the task is dropped; record the gap plainly rather than
  silently continuing as if nothing happened.

Do not pick one of these paths automatically on the human's behalf, even
when a previous session made the same choice for a similar failure.

## Token and Timing Rollup

### `UsageRecord` (per delegation)

Each `DelegationResult` may carry an optional `usage` field. All subfields
except `modelResolved` and `modelResolutionSource` are optional, because
Phase 1 harnesses (CLI task tool, browser inline skills, Azure DevOps
provider-native) expose token counts inconsistently or not at all.

```text
UsageRecord {
  tokensInput?: number            -- prompt/context tokens consumed
  tokensOutput?: number           -- completion tokens produced
  durationMs?: number             -- wall-clock milliseconds for this
                                  --   delegation
  modelResolved: string            -- mirrors DelegationResult.modelResolved
  modelResolutionSource: string    -- mirrors
                                  --   DelegationResult.modelResolutionSource
}
```

### `AggregatedUsage` (session-level rollup)

```text
AggregatedUsage {
  totalTokensInput?: number       -- sum of usage.tokensInput across all
                                  --   results where present
  totalTokensOutput?: number      -- sum of usage.tokensOutput where present
  totalDurationMs?: number        -- sum of usage.durationMs where present
  modelsUsed: string[]             -- deduplicated list of modelResolved
                                  --   values, in first-appearance order
}
```

#### Rollup rules

- Sum `tokensInput`, `tokensOutput`, and `durationMs` across all results
  where the field is present. Silently omit results that do not carry a
  `usage` record — missing data is not an error.
- `totalDurationMs` is the sum of each delegation's individual duration, even
  for parallel delegations. It is not wall-clock elapsed session time. This
  keeps the rollup a single, simple field rather than tracking elapsed time
  separately.
- If no result carries any usage data, omit `totalUsage` entirely from the
  `AggregatedDelegationResult` rather than emitting an object of all-absent
  fields.

### Where usage would eventually be measured

Each harness-specific dispatch path is responsible for populating `usage` on
the `DelegationResult` it returns:

- **Copilot CLI** (`task` tool) — parse token counts and timing from the
  task tool's response envelope, if available.
- **Browser / inline skills** — token counts are typically unavailable; omit
  `usage.tokensInput` and `usage.tokensOutput`; populate `durationMs` from
  the elapsed time of the skill call if measurable.
- **Azure DevOps / provider-native** — treat as runtime data; populate only
  what the host exposes.

The aggregation math belongs in the parent session, not the child. Child
delegations report their own `UsageRecord`; the parent sums them into
`AggregatedUsage`.

## Presentation to the Human

When reporting aggregated results back:

1. Present each result in completion order, not ticket-creation order.
2. For each result, use the completion notification format from
   `jl-recon/SKILL.md` → Mode 2 → Delegation Handoff Messaging.
3. Surface all `warnings` to the human before recording any resolution to
   the map.
4. If `totalUsage` is present, include a brief usage summary after the last
   result, but only if the human has not indicated disinterest in token
   accounting.

## Related

- `SKILL.md` → `DelegationResult` — the individual result type this
  reference extends.
- `SKILL.md` → Worktree Lifecycle — the rollback-on-preservation-failure
  rule referenced in Partial Failure Handling above.
- `jl-recon/SKILL.md` → Mode 2 → Delegation Handoff Messaging — the
  presentation format used when reporting results back to the human.
- `DELEGATION_HEURISTICS.md` — anti-patterns that should keep the parent
  from delegating in the first place, reducing the set of cases where
  aggregation is needed.
