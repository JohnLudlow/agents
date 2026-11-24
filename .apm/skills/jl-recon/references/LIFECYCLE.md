## Modes

Four entry points. Pick the one that matches what the human asked for; each
ends on its own completion criterion.

### 1. Chart the map

Starting a map from a loose idea.

1. Name the destination — run `jl-quiz`, using the resolved `quiz_mode`
   from configuration (in-chat interview or questionnaire document). User
   preference always overrides config — if the user requests a different mode
   during this step, switch immediately.
   If resolved `decision_gates.destination_confirmation` is `true`, confirm the
   destination explicitly before creating the map artifact.
2. Map the frontier — run `jl-quiz` again, breadth-first, to surface
   the decisions currently blocking the destination and the fog around them.
   Record each fog item the moment the quiz surfaces it, before moving on.
   If nothing surfaces as fog, the way is already clear — say so and ask the
   human how they want to proceed instead of forcing a map into existence.
3. Ask whether an inciting issue exists — the issue, work item, or thread
   that prompted charting this map. If one does, and
   resolved `decision_gates.inciting_issue_confirmation` is `true`, confirm
   it with
   the human before creating anything. If the gate is optional, still confirm
   when the source issue is uncertain or the link target is ambiguous.
4. Create the map artifact (see [PROVIDERS.md](references/PROVIDERS.md) for
   the mechanics of each provider) with Destination and Notes filled in, the
   Decisions-so-far list empty, and the surfaced fog under the resolved
   `uncertainty_tracking.pattern` heading.
5. If an inciting issue was confirmed, link the map to it immediately, using
   the provider's native mechanism — see
   [PROVIDERS.md](references/PROVIDERS.md). Do this before creating any
   tickets; an unlinked map is the bug this step exists to prevent.
6. Create tickets for every decision sharp enough to specify now, as
   children of the map. On GitHub or Azure DevOps, copy the map's labels or
   tags onto each new ticket before adding its `recon:<type>`
   classification — see [PROVIDERS.md](references/PROVIDERS.md). Wire
   blocking relationships in a second pass — see
   [PROVIDERS.md](references/PROVIDERS.md) for the mechanics per provider.
7. For any Research ticket, ask the human whether it may run AFK before
   touching it further. If resolved `decision_gates.research_afk` is `true`,
   this is a mandatory gate even when the human has previously been
   comfortable with AFK research in similar sessions.

**Completion criterion:** the map artifact exists with every section
populated (even if Decisions-so-far is still empty), it is linked to its
inciting issue if one exists, and every ticket specifiable today has been
created.

#### Handoff to Implementation

When a map reaches a state where all urgent decisions are resolved and
remaining fog is clearly understood, the map transitions from active planning
to reference mode. At this point, guide the user to create implementation
tickets that will be siblings of the map under the inciting issue.

**Signals that a map is ready for implementation:**

- Destination is clear and confirmed
- Major decisions are recorded in Decisions-so-far
- Remaining fog (if any) is explicitly listed and scoped
- All out-of-scope decisions are recorded

**What to communicate to the user:**

- "The map is ready for implementation. The next step is to create
  implementation tickets as siblings of this map under the inciting issue
  [issue name]."
- Point to [PROVIDERS.md](references/PROVIDERS.md) → "Ticket Hierarchy and
  Structure" for the structural details
- Clarify: implementation tickets are **not** children of the map; they are
  separate work items at the same level as the map, both under the inciting
  issue
- If using GitHub: implementation tickets use a label like `implementation:`
  or `area:<name>` to distinguish them from recon planning work
- Do not create implementation tickets as part of this skill; they are out of
  scope for recon. Only map the work that needs to be done, not the doing of
  it.

### 2. Work through the map

Resolving one ticket on an existing map.

1. Load the map. Read it at the level the map itself offers — Destination,
   Notes, the Decisions-so-far list, fog, out-of-scope — not every child
   ticket's full body.
2. Pick the ticket: the human names one, or you propose the first
   unblocked, unclaimed frontier ticket and let them confirm or redirect.
3. Note who's working it — an assignee, or a short marker in the ticket body
   — so another human glancing at the map can tell. No formal claim step;
   this is informational, not a lock.
4. If the ticket will be delegated to a subagent (via `jl-subagent-spawning`'s
   `DelegateToSubagent` action, where the harness supports it and the
   required approval is present), emit a clear handoff message before
   spawning — see "Delegation Handoff Messaging" below. If the ticket is
   resolved inline instead, skip this step.
5. Resolve it through the mechanism its type maps to (see Ticket Types
   above). A quiz may surface inside any ticket regardless of type. Record
   any new question or uncertainty the work surfaces — from a quiz detour,
   prototype feedback, or research findings — to the map using the resolved
   `uncertainty_tracking.pattern` immediately, in-session, before the pass
   continues.
6. If the ticket was delegated, emit a clear completion notification when
   the delegated work returns — see "Delegation Handoff Messaging" below —
   before recording the resolution.
7. If resolved `checks.on_ticket_resolution_enabled` is true, run quality checks
   on the resolved ticket before recording the resolution. See "Quality Checks
   in Mode 2" below for the full workflow: invoke jl-adversarial-reviewer,
   display findings, collect user review/override. If checks are unavailable
   or disabled, skip this step and proceed directly to step 8.
8. Review acceptance criteria before closure using
   `jl-ticket-templates`' shared review contract. Show one unchecked
   criterion at a time with its evidence and linked owner, and invite the
   user to identify missing requirements and record each identified
   requirement with its routing target (`new_ac`, `new_ticket`, or `owner`).
   Only after explicit user confirmation, record the decision and source in a
   separate issue comment, then check that criterion. A follow-up ticket alone is not evidence that
   its criterion is met. If any criterion is unmet, keep the ticket open
   unless the user approves and records a re-scope. Use
   `getNextAcceptanceCriterion` and `validateClosureReadiness` to enforce the
   sequence and closure evidence. When the ticket moves to resolution, record
   the reviewed criteria in the resolution record's `criteria` field so
   `validateTicket` runs the gate on them.
9. After closure readiness passes, call `validateStatusTransition` with the
   reviewed criteria and per-criterion re-scopes. Set the status to `Done`
   only if the transition passes, then close the provider issue if applicable.
   Append exactly one line to the map's
   Decisions-so-far list. One line, one place — if the map already shows this
   natively (GitHub's own sub-issue list), the manual line still goes in
   because some decisions resolve with no child ticket at all; it never gets
   restated a second time as a summary or a status table.
10. Create any newly-surfaced tickets and graduate any fog the resolution
   burned off. Log any newly-surfaced uncertainty to the map's fog in the
   same pass, before the pass ends. If the resolution reveals scope the
   destination doesn't cover, close it into Out-of-scope instead of
   recording it as a decision.

**Completion criterion:** the ticket is closed, the Decisions-so-far list
carries its one new line, every new uncertainty the pass surfaced is
recorded as fog on the map, in-session, before the pass ends, and any quality
checks (if enabled) were presented for user review before the resolution was
recorded. Every acceptance criterion was reviewed individually, confirmed by
the user, source-commented before being checked, or explicitly re-scoped by
the user before closure.

#### Quality Checks in Mode 2

When a ticket is resolved and `checks.on_ticket_resolution_enabled` is true,
run quality checks using jl-adversarial-reviewer before recording the
resolution. This workflow is always human-in-the-loop: the user reviews
findings and explicitly confirms the resolution.

**Workflow:**

1. **Invoke checks** — Call jl-adversarial-reviewer using `jl-subagent-spawning`'s
   fallback hierarchy: try subagent → try Herdr → read into session. Pass the
   resolved ticket's content (resolution text, findings, context from the map).
   Resolve the requested model using `model_selection.ticket_resolution_checks` (or
   `model_selection.default`) before invoking fallback; if either is `inherit`
   or invalid, continue into the `jl_subagent_models` hierarchy.
   Apply a per-check timeout of `checks.timeout_seconds` (default: `30`). On
   harness unavailability, timeout, network error, or malformed findings, do
   not block Mode 2: warn the user, keep any successful findings, and continue
   to an explicit user decision.

2. **Collect findings** — jl-adversarial-reviewer returns a structured report with
   findings (each with severity: critical/major/minor/nit, description, and
   recommendation). If some checks succeed and others fail, keep only the
   successful findings table and warn about the failed checks. If a check
   returns malformed findings, treat that check as failed and degrade
   gracefully. If no findings are returned (all-pass or no report), inform the
   user and proceed to confirmation.

3. **Display findings** — Format findings as a markdown table:

   ```markdown
   | Severity | Check | Finding | Recommendation |
   | --- | --- | --- | --- |
   | critical | ... | ... | ... |
   | major | ... | ... | ... |
   ```

   Sort by severity, highest first (critical → major → minor → nit).
   Include file/location context in the Finding column if available.

4. **User review and decision** — Present the findings table to the user and ask
   one of these prompts, depending on check availability:

   When checks are unavailable or all fail:

   ```text
   ⚠️ Quality checks unavailable: [reason]

   Would you like to:
   1. Proceed without checks and record the resolution
   2. Cancel and revise the ticket
   3. Override and record anyway

   (User can always override and proceed)
   ```

   When some checks succeed and some fail:

   ```text
   ⚠️ Some quality checks failed: [failed-checks]

   Available findings:
   [findings table - only successful checks]

   Would you like to:
   1. Approve and record resolution
   2. Override and record anyway
   3. Cancel and revise

   (Proceed with available findings)
   ```

   When checks complete normally:
   - "Approve and record resolution" (findings acknowledged, ready to record)
   - "Override and record anyway" (user disagrees with findings, force record)
   - "Cancel resolution" (pause and revise the ticket before recording)

5. **Graceful degradation** — If any checks fail (harness unavailable, network
   error, timeout, malformed findings):
   - Skip unavailable checks and keep running the remaining checks
   - If some checks succeed: show the successful findings and warn about failed checks
   - If all checks fail: warn the user and allow either "Proceed without checks"
     or "Override and record anyway"
   - Record the degraded check outcome and the user's decision in the audit trail
   - Never block Mode 2 workflow — user can always override and record

**Post-decision:**

- If user approves or overrides, proceed to step 8 (Record the resolution)
- If user cancels, return to step 5 (resolve ticket) without recording
- Log the user's decision (approve/override) alongside the resolution for audit trail

#### Delegation Handoff Messaging

When a ticket is delegated to a subagent, emit a handoff message before
spawning that includes:

- the ticket's linked name (never a bare id);
- its fixed ticket type (Research, Prototype, Quiz, or Task);
- the reason delegation was chosen for this ticket;
- an estimated time or scope, if known; and
- whether it will run AFK (Research only, and only with prior sign-off — see
  Ticket Types above) or requires human review before it can close.

Recommended wording:

> Delegating **{ticket name}** ({ticket type}) to a subagent — {reason}.
> {AFK: "This will run unattended; findings will be presented for your review
> before the ticket closes." | "This requires your input during the
> delegated task."}

When the delegated work returns, emit a clear completion notification before
recording the resolution:

> **{ticket name}** delegation complete. {one-line summary of what came
> back}. {If Research: "Please review the findings before I close this
> ticket."}

See `jl-subagent-spawning/SKILL.md` for the underlying `DelegateToSubagent`
approval, capability, and fallback mechanics this messaging sits on top of.

### 3. Report on implementation status

Surfacing where a map currently stands, without changing anything.

Present one list: every ticket's status (resolved, open, or blocked — with
the blocked ones showing their block reason) alongside the remaining fog.
This mode never resolves a ticket or edits the map; it only reads and
presents.

**Completion criterion:** the human has the full status list and nothing on
the map has been altered.

#### Quality Checks in Mode 3

When a status report is generated and `checks.on_status_report_enabled` is true,
run quality checks using doublecheck before presenting the report to the user.
This workflow is always human-in-the-loop: the user reviews findings and
explicitly confirms publication.

**Workflow:**

1. **Invoke checks** — Call doublecheck using jl-subagent-spawning's fallback
   hierarchy (attempt subagent → fallback to Herdr when subagent unavailable
   → read into session when multi-harness is unavailable). Pass the generated
   status report text. Doublecheck will analyze each claim in the report and
   return per-claim verification results (VERIFIED/PLAUSIBLE/UNVERIFIED/
   DISPUTED/FABRICATION_RISK with confidence levels and source links). Resolve
   the requested model using `model_selection.status_report_checks` (or
   `model_selection.default`) before invoking fallback; if either is `inherit`
   or invalid, continue into the `jl_subagent_models` hierarchy. Apply a
   per-check timeout of `checks.timeout_seconds` (default: `30`). On harness
   unavailability, timeout, network error, or malformed findings, do not block
   Mode 3: warn the user, keep any successful findings, and continue to an
   explicit user decision.

2. **Collect findings** — Doublecheck returns a structured report with per-claim
   verification results (each with status: VERIFIED/PLAUSIBLE/UNVERIFIED/
   DISPUTED/FABRICATION_RISK, confidence level 0-100, description, source links,
   and recommendation). Display all claims in the findings table with their
   per-claim verification status. If some claims are verified and others disputed,
   show all claims in the table and warn the user about any disputed or failed
   claims. If doublecheck returns malformed findings, treat that check as failed and
   degrade gracefully. If all claims verify or no findings are needed, inform
   the user and proceed to confirmation.

3. **Display findings** — Format findings as a markdown table:

   ```markdown
   | Claim | Status | Confidence | Sources |
   | --- | --- | --- | --- |
   | "Status report text..." | VERIFIED | 95% | link1, link2 |
   | "Another claim..." | DISPUTED | 40% | link |
   ```

   Sort by status, highest risk first (FABRICATION_RISK → DISPUTED →
   UNVERIFIED → PLAUSIBLE → VERIFIED). Include source links and confidence
   percentages in the Sources column.

4. **User review and decision** — Present findings to the user and collect
   explicit decision (approve/override/cancel). The prompt depends on check availability:

   **Decision tree:** If doublecheck is unavailable or all checks fail (timeout,
   network error, malformed findings), show the unavailable prompt. If doublecheck
   succeeds (fully or partially), always show the findings table and ask for user
   decision. User can always choose "override and publish anyway" — checks never
   block Mode 3 publication.

   **When checks are unavailable or all checks fail:**

   ```text
   ⚠️ Quality checks unavailable: [reason]

   Would you like to:
   1. Publish the report without verification
   2. Cancel and revise the status report
   3. Override and publish anyway

   (You can always publish)
   ```

   **When checks succeed (fully or partially) and findings are available:**

   ```text
   ✓ Verification complete

   [Findings table with all claims and per-claim status]

   Would you like to:
   1. Approve and publish report
   2. Override and publish anyway
   3. Cancel and revise
   ```

5. **Graceful degradation** — If any checks fail (harness unavailable, network
   error, timeout, malformed findings):
   - Skip unavailable checks and keep running the remaining checks
   - If some claims verify: show the verification results and warn about failed checks
   - If all checks fail: warn the user and allow either "Publish without checks"
     or "Override and publish anyway"
   - Record the degraded check outcome and the user's decision in an audit log
   - Never block Mode 3 workflow — user can always override and publish

**Post-decision:**

- If user approves or overrides, proceed to publish the status report
- If user cancels, return to report generation for revision
- Log the user's decision (approve/override) alongside the report publication for audit trail

When a status report is generated and `checks.on_status_report_enabled` is true,
run quality checks using doublecheck before presenting the report to the user.
This workflow is always human-in-the-loop: the user reviews findings and
explicitly confirms publication.

**Workflow:**

1. **Invoke checks** — Call doublecheck using `jl-subagent-spawning`'s fallback
   hierarchy: try subagent → try Herdr → read into session. Pass the generated
   status report text. Doublecheck will analyze each claim in the report and
   return per-claim verification results (VERIFIED/PLAUSIBLE/UNVERIFIED/
   DISPUTED/FABRICATION_RISK with confidence levels and source links). Resolve
   the requested model using `model_selection.status_report_checks` (or
   `model_selection.default`) before invoking fallback; if either is `inherit`
   or invalid, continue into the `jl_subagent_models` hierarchy. Apply a
   per-check timeout of `checks.timeout_seconds` (default: `30`). On harness
   unavailability, timeout, network error, or malformed findings, do not block
   Mode 3: warn the user, keep any successful findings, and continue to an
   explicit user decision.

2. **Collect findings** — Doublecheck returns a structured report with per-claim
   verification results (each with status: VERIFIED/PLAUSIBLE/UNVERIFIED/
   DISPUTED/FABRICATION_RISK, confidence level 0-100, description, source links,
   and recommendation). Display all claims in the findings table with their
   per-claim verification status. If some claims are verified and others disputed,
   show all claims in the table and warn the user about any disputed or failed
   claims. If doublecheck returns malformed findings, treat that check as failed and
   degrade gracefully. If all claims verify or no findings are needed, inform
   the user and proceed to confirmation.

3. **Display findings** — Format findings as a markdown table:

   ```markdown
   | Claim | Status | Confidence | Sources |
   | --- | --- | --- | --- |
   | "Status report text..." | VERIFIED | 95% | link1, link2 |
   | "Another claim..." | DISPUTED | 40% | link |
   ```

   Sort by status, highest risk first (FABRICATION_RISK → DISPUTED →
   UNVERIFIED → PLAUSIBLE → VERIFIED). Include source links and confidence
   percentages in the Sources column.

4. **User review and decision** — Present findings to the user and collect
   explicit decision (approve/override/cancel). The prompt depends on check availability:

   **Decision tree:** If doublecheck is unavailable or all checks fail (timeout,
   network error, malformed findings), show the unavailable prompt. If doublecheck
   succeeds (fully or partially), always show the findings table and ask for user
   decision. User can always choose "override and publish anyway" — checks never
   block Mode 3 publication.

   **When checks are unavailable or all checks fail:**

   ```text
   ⚠️ Quality checks unavailable: [reason]

   Would you like to:
   1. Publish the report without verification
   2. Cancel and revise the status report
   3. Override and publish anyway

   (You can always publish)
   ```

   **When checks succeed (fully or partially) and findings are available:**

   ```text
   ✓ Verification complete

   [Findings table with all claims and per-claim status]

   Would you like to:
   1. Approve and publish report
   2. Override and publish anyway
   3. Cancel and revise
   ```

5. **Graceful degradation** — If any checks fail (harness unavailable, network
   error, timeout, malformed findings):
   - Skip unavailable checks and keep running the remaining checks
   - If some claims verify: show the verification results and warn about failed checks
   - If all checks fail: warn the user and allow either "Publish without checks"
     or "Override and publish anyway"
   - Record the degraded check outcome and the user's decision in an audit log
   - Never block Mode 3 workflow — user can always override and publish

**Post-decision:**

- If user approves or overrides, proceed to publish the status report
- If user cancels, return to report generation for revision
- Log the user's decision (approve/override) alongside the report publication for audit trail

### 4. Resolve or archive stale items

Clearing out tickets or fog that have stopped being useful.

Surface a list of candidates — long-blocked tickets, decisions superseded by
a later resolution, fog that no longer bears on the destination. For each
candidate, ask the human what to do: resolve it now, archive it to
Out-of-scope, leave it open, or redraw the destination. Never archive more
than one candidate on a single, unconfirmed sweep — each needs its own
answer.

**Completion criterion:** every surfaced candidate has an explicit human
answer recorded against it (resolved, archived, kept open, or the
destination itself was redrawn).
