# Map Ticket Validation Guide

This document defines the validation contract for map tickets and guides integration
into jl-recon. Use this when implementing the map validator or reviewing validation
behavior in consuming skills.

## Validation Contract

A map ticket is **valid** when:

| Criterion | Rule |
|-----------|------|
| **Frontmatter** | All required fields present: title, type, status, author, date |
| **Type check** | `type: "map"` must be set |
| **Destination** | Clear, one-sentence description of map's target outcome |
| **Acceptance Criteria** | At least 5 specific items covering decisions, fog, scope, frontier, and acceptance |
| **Decisions section** | Explicitly lists resolved decisions with ticket links (or explicitly empty with note) |
| **Fog of War section** | Lists known unknowns with kind tag (what / how) or explicitly notes "None at chart time" |
| **Frontier table** | Shows open, unblocked tickets with clear status (Draft / Ready / In Progress) |

### Destination Clarity

The Destination section must describe a specific, achievable outcome that the map
aims to reach — not a vague goal. Use this test:

- ✓ "Shipped customer-profile service with documented API and deployment runbook"
- ✗ "Improve the system"

### Frontier and Blocking Clarity

- All open tickets in the Frontier table must have a clear Status
- All blocked tickets must have a corresponding entry in Blocked Tickets table
- Each blocked ticket must name the blocker and reason (not blank)

## Error Messages

Report one error at a time. Each error includes: title, issue, location, guidance,
and correct example.

### Error 1: Destination missing or vague

**Title:** Destination unclear

**Issue:** Map has no Destination section, or destination is vague (no specific outcome)

**Location:** "Destination" section (after frontmatter)

**Guidance:** Add a clear, one-sentence outcome that the map is designed to reach.
Answer: what does success look like? Use specific deliverables or shipped features,
not abstract goals.

**Example of vague destination (invalid):**
> "Improve the system"

**Example of clear destination (valid):**
> "Shipped customer-profile service with documented API contract, passing integration
> tests, and deployment runbook in /docs/runbooks"

### Error 2: Insufficient acceptance criteria

**Title:** Map acceptance criteria incomplete

**Issue:** Fewer than 5 criteria, or criteria section missing entirely

**Location:** "Acceptance Criteria" section

**Guidance:** Map acceptance criteria should cover: (1) All Decisions Resolved,
(2) Blocking Edges Clear, (3) Frontier Identified, (4) Fog Minimized, (5) Destination
Met. Add one criterion for each, making them specific and checkable.

**Example of sufficient criteria:**

```markdown
1. All Decisions Resolved — Every known decision has a ticket and recorded outcome
2. Blocking Edges Clear — All dependencies shown in Blocked Tickets table
3. Frontier Identified — Open Tickets table shows unblocked work
4. Fog Minimized — Fog of War lists 3 or fewer items, each tagged with kind
5. Destination Met — API documented, tests passing, runbook written
```

### Error 3: Decisions section empty without note

**Title:** Decisions unclear

**Issue:** Decisions section is empty with no note explaining why (e.g., "No decisions
yet; still in early chart phase")

**Location:** "Decisions So Far" section

**Guidance:** Either list resolved decisions with links, or add a brief note explaining
why the section is empty (e.g., "Not yet charted" or "All decisions delegated to
child maps"). Avoid silent emptiness.

**Example with explanation:**

```markdown
## Decisions So Far

No decisions yet — currently in research and exploration phase.
See [Research Queue](../../plans/research-queue) for open research tickets.
```

### Error 4: Fog of War items not tagged with kind

**Title:** Fog items incomplete

**Issue:** Fog of War items present but not tagged with kind (what / how)

**Location:** "Not Yet Specified" section, fog item [number]

**Guidance:** Tag each fog item with **what** (goal fuzzy, means clear) or **how**
(goal fixed, means fuzzy). This helps prioritize work: "what" fog needs clarification
before tickets are cut; "how" fog is ready to explore.

**Example of incomplete fog item:**
> - User authentication strategy

**Example with kind tag:**
> - User authentication strategy — **what** (clear we need auth, unclear which approach)

### Error 5: Frontier or Blocked table malformed

**Title:** Frontier or blocking structure unclear

**Issue:** Open Tickets or Blocked Tickets table is missing, empty without note, or
has rows with missing Status, Reason, or Blocker columns

**Location:** "Open Tickets (Frontier)" or "Blocked Tickets" section

**Guidance:** Open Tickets table must list unblocked, ready-to-claim work with Status.
Blocked Tickets table must list work waiting on something else, with Reason. If either
is empty, note why (e.g., "All tickets resolved" or "No currently blocked work").

**Example of correct structure:**

```markdown
## Open Tickets (Frontier)

| Ticket | Type | Assignee | Status |
|--------|------|----------|--------|
| Database schema design | Research | @alice | Ready |

## Blocked Tickets

| Ticket | Type | Blocked by | Reason |
|--------|------|-----------|--------|
| Performance testing | Task | API contract | BLOCKED: cannot benchmark until API signature is stable |
```

### Error 6: Status value invalid

**Title:** Invalid status value

**Issue:** `status` field in frontmatter is not one of: Charting, Walked, Completed, Stale

**Location:** Frontmatter, `status` field

**Guidance:** Use one of the standard map status values:

- **Charting** — map is being built, decisions not yet made
- **Walked** — map has been walked; most decisions resolved but work ongoing
- **Completed** — map destination reached; work finished
- **Stale** — map is no longer the active plan (superseded or abandoned)

**Example of correct frontmatter:**

```yaml
status: "Walked"
```

## User Override Workflow

If validation fails but the user wants to create the map anyway:

1. **Report error** — show the error message with location and guidance
2. **Offer override** — ask "Override validation and proceed? [Yes] [No]"
3. **Record override** — if user approves:
   - Create the map ticket as-is
   - Add a comment: "⚠️ Validation override by [user]: [error title]. Reason: [user input]"
   - Log override in session for audit trail

This ensures deliberate overrides are visible and traceable.

## Integration Points in jl-recon

### Pseudocode: Map Validation Flow

```text
function createMapTicket(ticketContent, userOptions) {
  // Parse frontmatter and body sections
  parsed = parseMapTicket(ticketContent)

  // Validate against contract
  validationResult = validateMapTicket(parsed)

  if validationResult.valid {
    // Proceed to ticket creation
    return createGitHubIssue(parsed)
  } else {
    // Report error
    reportError(validationResult.errors[0])

    // Offer override
    if userApproveOverride() {
      // Record override
      ticketContent = addOverrideComment(ticketContent, userOptions)
      return createGitHubIssue(ticketContent)
    } else {
      // User declined; return without creating
      return null
    }
  }
}

function validateMapTicket(parsed) {
  errors = []

  // Check frontmatter
  if !hasRequiredFields(parsed.frontmatter, ["title", "type", "status", "author", "date"]) {
    errors.push(Error_MissingFrontmatter)
  }

  if parsed.frontmatter.type != "map" {
    errors.push(Error_InvalidType)
  }

  if !isValidMapStatus(parsed.frontmatter.status) {
    // Valid status: Charting, Walked, Completed, Stale
    errors.push(Error_InvalidStatus)
  }

  // Check Destination section
  destination = extractSection(parsed.body, "Destination")
  if !destination || !isSpecific(destination) {
    errors.push(Error_DestinationUnclear)
  }

  // Check Acceptance Criteria section
  criteria = extractSection(parsed.body, "Acceptance Criteria")
  if !criteria || criteria.itemCount < 5 {
    errors.push(Error_InsufficientCriteria)
  }

  // Check Decisions section (can be empty with explanation)
  decisions = extractSection(parsed.body, "Decisions So Far")
  if decisions.isEmpty && !decisions.hasNote {
    errors.push(Error_EmptyDecisionsNoNote)
  }

  // Check Fog of War section (all items must be tagged)
  fog = extractSection(parsed.body, "Not Yet Specified")
  for each item in fog.items {
    if !isTagged(item, ["what", "how"]) {
      errors.push(Error_FogItemNotTagged(item))
    }
  }

  // Check Frontier and Blocked tables
  frontier = extractTable(parsed.body, "Open Tickets")
  if !frontier || !hasColumn(frontier, "Status") {
    errors.push(Error_FrontierMalformed)
  }

  blocked = extractTable(parsed.body, "Blocked Tickets")
  if !blocked || !hasColumns(blocked, ["Blocked by", "Reason"]) {
    errors.push(Error_BlockedTableMalformed)
  }

  return { valid: errors.length == 0, errors: errors }
}
```

### Integration: Where to Call validateMapTicket

In `jl-recon/SKILL.md`, add a "Map Ticket Validation" section (or expand existing
validation section to cover map tickets) that describes:

1. When jl-recon creates a new map ticket, call the map validator
2. Report validation errors with remediation guidance
3. If user approves override, record it in a ticket comment
4. Create ticket only after validation passes or override is approved

Reference this guide for the contract and error messages.

## Testing the Validator

Use these test cases to verify the map validator:

| Test Case | Input | Expected Output | Notes |
|-----------|-------|-----------------|-------|
| Valid map | Complete frontmatter + destination + 5 criteria + frontier table | `{ valid: true, errors: [] }` | Happy path |
| Missing destination | No Destination section | Error_DestinationUnclear | Required section |
| Vague destination | "Improve system" | Error_DestinationUnclear | Must be specific outcome |
| Too few criteria | 3 acceptance criteria | Error_InsufficientCriteria | Minimum 5 required |
| Empty decisions, no note | Empty "Decisions So Far" section | Error_EmptyDecisionsNoNote | Silence requires explanation |
| Fog item untagged | "Database schema — ?" | Error_FogItemNotTagged | Every item needs what/how |
| Frontier table missing | No "Open Tickets" section | Error_FrontierMalformed | Required section |
| Blocked table missing Status column | Blocked Tickets with missing Status | Error_BlockedTableMalformed | Required columns |
| Invalid status | `status: "InProgress"` | Error_InvalidStatus | Must be map status, not task status |
| Override accepted | User says "Yes" | `{ valid: true, override: true, comment: "..." }` | Record reason |
| Override declined | User says "No" | `{ valid: false, errors: [...], created: false }` | Do not create |
