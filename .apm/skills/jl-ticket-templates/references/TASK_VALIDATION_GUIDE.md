# Task Ticket Validation Guide

This document defines the validation contract for task tickets and guides integration
into jl-recon. Use this when implementing the task validator or reviewing validation
behavior in consuming skills.

## Validation Contract

A task ticket is **valid** when:

| Criterion | Rule |
|-----------|------|
| **Frontmatter** | All required fields present: title, type, status, author, date |
| **Type check** | `type: "task"` must be set |
| **Work Scope** | Both "What will be done" and "What will NOT be done" sections present and non-empty |
| **Acceptance Criteria** | At least 3 criteria, each specific/measurable/checkable (SMC pattern) |
| **Acceptance Criteria Checkability** | Each criterion includes verifiable outcome or test command |

### Specific/Measurable/Checkable (SMC) Criteria

Every acceptance criterion must pass all three tests:

1. **Specific** — uses concrete nouns and verbs, not vague language
   - ✓ "Method compiles without warnings"
   - ✗ "Code looks good"
2. **Measurable** — includes a concrete target or threshold
   - ✓ "All 15 unit tests pass"
   - ✗ "Tests pass"
3. **Checkable** — includes or implies a way to verify (run test, build, review, measure)
   - ✓ "Unit tests pass: `dotnet test TaskTests.cs`"
   - ✗ "Tests should work"

## Error Messages

Report one error at a time. Each error includes: title, issue, location (file + line
or section), guidance, and correct example.

### Error 1: Missing Work Scope sections

**Title:** Work Scope incomplete

**Issue:** Task missing "What will be done" or "What will NOT be done" section(s)

**Location:** Body sections, after frontmatter

**Guidance:** Both sections are required. Use "What will be done" to describe concrete
deliverables and constraints. Use "What will NOT be done" to explicitly exclude work
that might seem in scope but is not.

**Example of correct format:**

```markdown
## Work Scope

**What will be done:** Implement UserRepository.GetByIdAsync() method.
Accept userId string and CancellationToken. Query PostgreSQL. Return User or null.

**What will NOT be done:**

- Caching is not included
- Legacy data migration is out of scope
```

### Error 2: Acceptance criteria not SMC

**Title:** Acceptance criterion fails SMC test

**Issue:** Acceptance criterion is vague, not measurable, or not checkable

**Location:** Acceptance Criteria section, criterion [number]

**Guidance:** Rewrite using specific language, a concrete target, and a verification method.
Test: does it name a specific outcome (Specific)? Does it include a threshold or target
(Measurable)? Can you verify it by running a command or inspecting a result (Checkable)?

**Example of vague criterion (fails Specific):**
> "Code should be of high quality"

**Example of correct criterion (passes SMC):**
> "Code compiles without warnings: `dotnet build`"

### Error 3: Too few acceptance criteria

**Title:** Insufficient acceptance criteria

**Issue:** Fewer than 3 acceptance criteria present

**Location:** Acceptance Criteria section

**Guidance:** Add criteria until you have at least 3. If you have fewer than 3 measurable
outcomes for the work, the work scope may be too small or too vague to ticket.

**Example of sufficient criteria:**

```markdown
1. Method signature matches: accepts userId (string), CancellationToken; returns Task<User?>
2. Unit tests pass: `dotnet test UserRepositoryTests.cs` (at least 90% branch coverage)
3. Integration test passes: connects to live PostgreSQL and retrieves known test record
```

### Error 4: Acceptance criterion includes no verification method

**Title:** Acceptance criterion not checkable

**Issue:** Criterion describes outcome but gives no way to verify it

**Location:** Acceptance Criteria section, criterion [number]

**Guidance:** Add a verification method — a build command, test runner, code review step,
or measurement. If you cannot describe how to check it, it is not ready.

**Example of missing verification:**
> "All edge cases handled"

**Example with verification added:**
> "All edge cases handled: 100% branch coverage in UserRepositoryTests.cs (verify with `dotnet test --collect:XPlat Code Coverage`)"

### Error 5: Status value invalid

**Title:** Invalid status value

**Issue:** `status` field is not one of: Draft, Ready, In Progress, Done, Blocked

**Location:** Frontmatter, `status` field

**Guidance:** Use one of the standard status values. Draft = not yet ready to start;
Ready = ready to assign; In Progress = work underway; Done = complete and verified;
Blocked = blocked by another task.

**Example of correct frontmatter:**

```yaml
status: "Ready"
```

## User Override Workflow

If validation fails but the user wants to create the ticket anyway:

1. **Report error** — show the error message with location and guidance
2. **Offer override** — ask "Override validation and proceed? [Yes] [No]"
3. **Record override** — if user approves:
   - Create the ticket as-is
   - Add a comment: "⚠️ Validation override by [user]: [error title]. Reason: [user input]"
   - Log override in session for audit trail

This ensures that deliberate overrides are visible and traceable, not silent failures.

## Integration Points in jl-recon

### Pseudocode: Task Validation Flow

```text
function createTaskTicket(ticketContent, userOptions) {
  // Parse frontmatter and body sections
  parsed = parseTaskTicket(ticketContent)

  // Validate against contract
  validationResult = validateTaskTicket(parsed)

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

function validateTaskTicket(parsed) {
  errors = []

  // Check frontmatter
  if !hasRequiredFields(parsed.frontmatter, ["title", "type", "status", "author", "date"]) {
    errors.push(Error_MissingFrontmatter)
  }

  if parsed.frontmatter.type != "task" {
    errors.push(Error_InvalidType)
  }

  // Check Work Scope sections
  if !hasSections(parsed.body, ["What will be done", "What will NOT be done"]) {
    errors.push(Error_MissingWorkScope)
  }

  // Check acceptance criteria
  criteria = extractAcceptanceCriteria(parsed.body)
  if criteria.length < 3 {
    errors.push(Error_TooFewCriteria)
  }

  for each criterion in criteria {
    if !passesSMCTest(criterion) {
      errors.push(Error_NotSMC(criterion))
    }
    if !hasVerificationMethod(criterion) {
      errors.push(Error_NoVerificationMethod(criterion))
    }
  }

  return { valid: errors.length == 0, errors: errors }
}
```

### Integration: Where to Call validateTaskTicket

In `jl-recon/SKILL.md`, add a "Ticket Template Validation" section (or expand existing
one to cover task tickets) that describes:

1. When jl-recon creates a new task ticket, call the task validator
2. Report validation errors with remediation guidance
3. If user approves override, record it in a ticket comment
4. Create ticket only after validation passes or override is approved

Reference this guide for the contract and error messages.

## Testing the Validator

Use these test cases to verify the task validator:

| Test Case | Input | Expected Output | Notes |
|-----------|-------|-----------------|-------|
| Valid task | Frontmatter + Work Scope + 3 SMC criteria | `{ valid: true, errors: [] }` | Happy path |
| Missing Work Scope | No "What will NOT be done" section | Error_MissingWorkScope | Partial scope is invalid |
| Too few criteria | 2 acceptance criteria | Error_TooFewCriteria | Minimum 3 required |
| Vague criterion | "Code looks good" | Error_NotSMC | Fails Specific test |
| No verification | "All tests pass" (no test command) | Error_NoVerificationMethod | Must include how to check |
| Invalid status | `status: "InProgress"` | Error_InvalidStatus | Must be one of 5 standard values |
| Wrong type | `type: "research"` | Error_InvalidType | type must be "task" |
| Missing frontmatter | No author field | Error_MissingFrontmatter | Required fields check |
| Override accepted | User says "Yes" to override | `{ valid: true, override: true, comment: "..." }` | Record reason in comment |
| Override declined | User says "No" to override | `{ valid: false, errors: [...], created: false }` | Do not create ticket |
