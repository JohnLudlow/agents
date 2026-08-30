# Validation Test Guide

This document provides comprehensive test coverage for template validators across all ticket types.
It documents test fixtures (valid and invalid examples), test scenarios, and cross-skill validation
consistency checks. Use this guide when implementing validators or verifying validation behavior.

## Test Framework Overview

### Test Structure

Each ticket type has:
- **Valid fixture** — a complete, correct ticket that passes validation
- **Invalid fixtures** — one per error type, testing each validation rule
- **Error message tests** — verify error messages are clear and actionable
- **Override tests** — verify user override flow works correctly
- **Cross-skill tests** — verify same rules enforced across jl-quiz, jl-recon, jl-issue-management

### Test Execution

For each validator type:
1. Load the validator (e.g., `validateQuizTicket()`)
2. Run test fixtures through the validator
3. Check result: valid fixtures return `{ valid: true }`; invalid fixtures return specific error
4. Verify error message structure: title, issue, location, guidance, example
5. Verify override path: user approval recorded in ticket comment

## Quiz Ticket Validation Tests

### Valid Quiz Fixture

```yaml
---
title: "Should we use JWT or session-based authentication?"
description: "Decision on auth strategy for customer-facing API"
type: "quiz"
status: "Ready"
author: "alice@example.com"
date: "2026-08-30"
related_links: "https://github.com/org/repo/issues/42"
parent: ""
---

## Decision Statement

Should we use JWT tokens or session-based authentication for the customer-facing REST API?

## Options

1. **JWT (JSON Web Tokens)** — Stateless, scalable, works well with microservices
   - Pros: No server state, easy to scale horizontally, standard approach for APIs
   - Cons: Cannot revoke immediately, token size adds per-request overhead, needs HTTPS

2. **Session-based (server session storage)** — Traditional, well-understood, immediate revocation
   - Pros: Immediate revocation, smaller per-request payload, backward compatible
   - Cons: Requires server state, harder to scale horizontally, more complex deployment

## Reasoning

JWT is the right choice for this API because:
- We need to scale horizontally across multiple servers without session replication
- Our API clients (mobile, web, third-party) expect token-based auth
- Revocation delay is acceptable; we can implement token refresh rotation

Session-based would add complexity for this use case.

## Acceptance Criteria

1. **Decision recorded** — Decision statement and chosen option captured in ticket
2. **Trade-offs documented** — Both pros and cons listed for each option
3. **Reasoning provided** — Why the chosen option was selected
```

**Test expectation**: `{ valid: true, errors: [] }`

### Invalid Quiz Fixtures

| Test Case | Fixture Change | Expected Error | Guidance |
|-----------|---|---|---|
| Missing Decision Statement | Remove "## Decision Statement" section | Error_MissingSection | Add section describing the decision choice |
| No Options | "## Options" section empty | Error_TooFewOptions | Add at least 2 distinct options |
| Missing Reasoning | Remove "## Reasoning" section | Error_MissingSection | Explain why chosen option was selected |
| Missing Acceptance Criteria | Remove "## Acceptance Criteria" | Error_MissingAcceptanceCriteria | Add 3+ specific checkable criteria |
| Non-SMC criteria | "1. Decision made" (vague) | Error_NotSMC | Rewrite as specific/measurable/checkable |
| Bad frontmatter type | `type: "research"` | Error_InvalidType | Change type field to "quiz" |
| Missing frontmatter field | Remove `author` field | Error_MissingFrontmatter | Add all required frontmatter fields |

### Quiz Error Message Tests

For each error, verify the message includes:

```
Title: [Error name]
Issue: [What's wrong]
Location: [File + line or section name]
Guidance: [How to fix it]
Example: [Correct format]
```

Example:

```
Title: Missing Reasoning section
Issue: Quiz ticket missing "## Reasoning" explaining why chosen option was selected
Location: quiz-ticket-template.md (after "## Options" section)
Guidance: Add a "## Reasoning" section that explains the rationale for choosing this option
  over alternatives. Reference specific trade-offs from the options.
Example:
  ## Reasoning
  JWT is the right choice because [explain reasoning].
```

### Quiz Override Tests

1. **User approves invalid quiz** — Missing Reasoning section
   - Validator reports error
   - User selects "Override and publish"
   - Ticket created with override comment: "⚠️ Validation override by alice: Missing Reasoning section"
   - Outcome logged for audit

2. **User rejects override** — Missing options
   - Validator reports error
   - User selects "Don't publish"
   - Ticket not created
   - Outcome logged

## Research Ticket Validation Tests

### Valid Research Fixture

```yaml
---
title: "Research: Authentication patterns for microservices"
description: "Investigate authentication approaches used in similar projects"
type: "research"
status: "Ready"
author: "bob@example.com"
date: "2026-08-30"
related_links: "https://github.com/org/repo/issues/42"
parent: ""
---

## Investigation Goal

What are the proven authentication patterns used in production microservices?
What trade-offs exist between each approach?

## Research Scope

**In Scope:**
- JWT-based approaches (including refresh tokens, key rotation)
- OAuth 2.0 / OpenID Connect patterns
- Session-based with distributed stores (Redis, etc.)
- mTLS for service-to-service
- Real-world case studies from similar projects

**Out of Scope:**
- Legacy LDAP/Active Directory patterns
- Single-sign-on enterprise solutions
- GraphQL-specific auth patterns (separate research)

## Findings

**JWT patterns:**
- Used by Okta, Auth0, Google; de facto standard for REST APIs
- Refresh token rotation mitigates revocation delay issue
- Token size 500-2000 bytes; adds overhead but acceptable for most workloads

**OAuth 2.0 / OpenID Connect:**
- Built on JWT foundation; adds user identity layer
- Industry-standard for delegated auth
- Widely supported by third-party identity providers

**Session-based with Redis:**
- Used by traditional monoliths; requires session replication
- Faster revocation than JWT; higher server-side complexity
- Not recommended for horizontally-scaled services

**mTLS:**
- Service-to-service only; not suitable for client-to-service
- Requires certificate distribution; high operational overhead

## Recommendation

Use **JWT with refresh token rotation** for the customer API and **OAuth 2.0** for
user-facing third-party integrations. Reason: JWT is proven in production, widely adopted,
and provides good UX without sacrificing security through refresh rotation.

Reference [Okta's JWT guide](https://okta.com) and [Auth0's microservices patterns](https://auth0.com/docs)
for implementation details.

## Acceptance Criteria

1. **Investigation goal is neutral** — Question is exploratory, not leading to a predetermined answer
2. **Scope boundaries explicit** — In-scope and out-of-scope sections clearly separate what was studied
3. **Findings cite evidence** — Each finding references specific case studies, documentation, or experiments
4. **Recommendation based on findings** — Why the recommendation makes sense given the findings
```

**Test expectation**: `{ valid: true, errors: [] }`

### Invalid Research Fixtures

| Test Case | Fixture Change | Expected Error | Guidance |
|-----------|---|---|---|
| Investigation Goal too broad | "What auth strategies exist?" | Error_GoalTooBroad | Narrow to specific scope; cite limits |
| Leading question | "Why is JWT obviously best?" | Error_BiasedQuestion | Rewrite as neutral exploration |
| Missing Research Scope | Remove scope section | Error_MissingScope | Add in/out scope boundaries |
| Vague findings | "Some approaches are better" | Error_VagueFindings | Include specific evidence, case studies |
| No recommendation | Remove "## Recommendation" | Error_MissingRecommendation | Add recommendation citing findings |
| Recommendation unsupported | Recommend X but findings say Y | Error_UnsupportedRecommendation | Cite specific findings that support choice |
| Missing Acceptance Criteria | Remove section | Error_MissingAcceptanceCriteria | Add 3+ checkable criteria |

### Research Error Message Tests

Verify error messages follow the same structure as quiz (Title, Issue, Location, Guidance, Example).

Example:

```
Title: Investigation goal too broad
Issue: Research question is too wide in scope to investigate thoroughly
Location: research-ticket-template.md (Investigation Goal section)
Guidance: Narrow the research question to a specific comparison (e.g., "JWT vs session-based
  for REST APIs" instead of "What auth patterns exist?").
Example:
  ## Investigation Goal
  What authentication pattern is best for horizontally-scaled microservices?
  Compare JWT, OAuth 2.0, and session-based approaches for this specific use case.
```

### Research Override Tests

1. **User approves invalid research** — Vague findings
   - Validator reports error
   - User selects "Override and publish"
   - Ticket created with override comment
   - Outcome logged

2. **User rejects override** — Recommendation unsupported
   - Validator reports error
   - User selects "Don't publish"
   - Ticket not created

## Prototype Ticket Validation Tests

### Valid Prototype Fixture

```yaml
---
title: "Prototype: JWT with refresh token rotation"
description: "Build and test JWT auth with automatic refresh token rotation"
type: "prototype"
status: "Ready"
author: "charlie@example.com"
date: "2026-08-30"
related_links: "https://github.com/org/repo/issues/42"
parent: ""
---

## Research Question

Does JWT with refresh token rotation provide acceptable user experience
and security without adding unacceptable server-side complexity?

## Implementation Approach

**Will be built:**
- Express.js middleware for JWT parsing and validation
- Refresh token endpoint that returns new JWT
- Client-side code to detect token expiration and refresh
- Basic unit tests for middleware

**Will NOT be built:**
- Integration with third-party identity provider (use in-memory test keys)
- Token revocation list (handled by short expiration)
- Web UI (test with curl and Postman)
- Production deployment

## Verification

1. **Token validation works** — Run `npm test`; all middleware tests pass
2. **Refresh flow succeeds** — Use Postman to call refresh endpoint; new JWT issued with updated expiration
3. **Client detects expiration** — Client code catches 401, calls refresh, retries original request
4. **No security regressions** — Run security audit on token payload (no sensitive data leaked)

## Throwaway Plan

**Code will be discarded:**
- In-memory token storage (production will use database)
- Hardcoded test keys (production will use Key Vault)
- Basic middleware (production will add rate limiting, audit logging)

**Findings carry forward:**
- JWT structure and refresh flow that works
- Client-side token handling patterns
- Identification of server complexity (minimal, approved for production use)

## Findings

**What works:**
- JWT parsing and validation is straightforward; middleware is <50 lines
- Refresh token rotation prevents account compromise from leaked tokens
- Client-side handling is simpler than expected; only 3 try-catch points

**What surprised us:**
- Postman's JWT decode is unreliable; curl + jq is more reliable for testing
- Token size (400+ bytes) will add noticeable overhead on mobile; acceptable per findings

**What's still unclear:**
- Impact of refresh token storage on mobile app size (need mobile prototype)
- Whether 5-minute token expiration is too short for user experience

## Acceptance Criteria

1. **Refresh flow verified** — Postman test demonstrates token refresh and retry
2. **Middleware passes tests** — Unit test coverage ≥80%; all tests pass
3. **No regressions** — Security audit shows no sensitive data in token payload
4. **Findings documented** — What works, what surprised us, what's unclear captured
```

**Test expectation**: `{ valid: true, errors: [] }`

### Invalid Prototype Fixtures

| Test Case | Fixture Change | Expected Error | Guidance |
|-----------|---|---|---|
| Research question too broad | "Should we try new things?" | Error_QuestionTooBroad | Narrow to specific exploration |
| Missing Implementation Approach | Remove section | Error_MissingApproach | Describe what will and will not be built |
| Will/Will NOT sections empty | Both lists empty | Error_EmptyScopeList | List specific code and features |
| No Verification criteria | Remove section | Error_MissingVerification | Add 3+ specific, measurable success criteria |
| Verification criteria not measurable | "Should work well" | Error_VerificationNotMeasurable | Add test command or measurement method |
| Missing Throwaway Plan | Remove section | Error_MissingThrowawayPlan | Specify what code discards vs. what carries forward |
| No Findings | Remove section | Error_MissingFindings | Document what you learned |
| Missing Acceptance Criteria | Remove section | Error_MissingAcceptanceCriteria | Add 3+ checkable criteria |

### Prototype Error Message Tests

Verify error messages include Title, Issue, Location, Guidance, Example.

Example:

```
Title: Research question too broad
Issue: Research question is not specific enough to explore in a time-boxed prototype
Location: prototype-ticket-template.md (Research Question section)
Guidance: Narrow the question to a specific technique or trade-off you can verify in a few days.
  Name the constraint: which component are you testing? How much time do you have?
Example:
  ## Research Question
  Does JWT with refresh token rotation provide acceptable user experience
  without unacceptable server-side complexity? (Testing only REST API, not mobile app)
```

### Prototype Override Tests

1. **User approves invalid prototype** — Missing Throwaway Plan
   - Validator reports error
   - User selects "Override and publish"
   - Ticket created with override comment
   - Outcome logged

2. **User rejects override** — Verification not measurable
   - Validator reports error
   - User selects "Don't publish"
   - Ticket not created

## Task Ticket Validation Tests

### Valid Task Fixture

```yaml
---
title: "Implement UserRepository.GetByIdAsync()"
description: "Add async data-access method for fetching user by ID"
type: "task"
status: "Ready"
author: "diana@example.com"
date: "2026-08-30"
related_links: "https://github.com/org/repo/issues/42"
parent: "https://github.com/org/repo/issues/40"
---

## Work Scope

**What will be done:**
Implement `UserRepository.GetByIdAsync(string userId, CancellationToken ct)` in
`src/Data/UserRepository.cs`. Accept a `userId` string and `CancellationToken`.
Return `Task<User?>` (null if not found). Query against live PostgreSQL connection.

**What will NOT be done:**
- Caching is not included; this is a baseline implementation
- Migration of legacy data is out of scope
- Performance optimization beyond current requirements
- Bulk operations (GetByIds) are out of scope

## Acceptance Criteria

1. **Signature correct** — Method is async, returns `Task<User?>`, accepts `userId` and `CancellationToken`
   - Verify: Read src/Data/UserRepository.cs and confirm signature matches
2. **Tests pass** — Unit tests and integration tests pass
   - Verify: `dotnet test UserRepositoryTests.cs` returns exit code 0
3. **SQL query correct** — Query against User table in PostgreSQL; null if not found
   - Verify: Run integration test against test database; verify null result for missing ID
```

**Test expectation**: `{ valid: true, errors: [] }`

### Invalid Task Fixtures

| Test Case | Fixture Change | Expected Error | Guidance |
|-----------|---|---|---|
| Missing Work Scope | Remove section | Error_MissingWorkScope | Add "What will be done" and "What will NOT be done" |
| Only "will do", no "will NOT" | Remove "will NOT" section | Error_IncompleteScope | Add explicit "What will NOT be done" section |
| Too few criteria | 2 acceptance criteria | Error_TooFewCriteria | Add at least 3 specific, measurable, checkable criteria |
| Criteria not SMC | "Code should work" | Error_NotSMC | Rewrite as specific/measurable with verification method |
| No verification method | "Tests pass" (no test command) | Error_NoVerificationMethod | Include command or method to verify (e.g., `dotnet test`) |
| Missing frontmatter | No `author` field | Error_MissingFrontmatter | Add all required frontmatter fields |

### Task Error Message Tests

Verify error messages follow structure: Title, Issue, Location, Guidance, Example.

Example:

```
Title: Insufficient acceptance criteria
Issue: Fewer than 3 acceptance criteria present
Location: task-ticket-template.md (Acceptance Criteria section)
Guidance: Add criteria until you have at least 3 measurable outcomes for the work.
  If you have fewer than 3, the work scope may be too small or too vague to ticket.
Example:
  1. Signature correct — Method is async, returns Task<User?>, accepts userId and CancellationToken
  2. Tests pass — Unit tests and integration tests pass
  3. SQL query correct — Query against User table; null if not found
```

### Task Override Tests

1. **User approves invalid task** — Too few criteria
   - Validator reports error
   - User selects "Override and publish"
   - Ticket created with override comment
   - Outcome logged

2. **User rejects override** — Scope incomplete
   - Validator reports error
   - User selects "Don't publish"
   - Ticket not created

## Map Ticket Validation Tests

### Valid Map Fixture

```yaml
---
title: "Customer Profile Feature Map"
description: "Plan for shipping customer-profile service with API, tests, and runbook"
type: "map"
status: "Walked"
author: "eve@example.com"
date: "2026-08-30"
related_links: "https://github.com/org/repo/issues/40"
parent: ""
---

# Customer Profile Feature Map

## Destination

Shipped customer-profile service with documented API contract, passing integration tests,
and deployment runbook in /docs/runbooks. API is production-ready and monitored.

## Decisions So Far

- Authentication strategy — resolved via [Quiz: JWT vs session auth](../plans/auth-quiz) — JWT with refresh tokens
- Data storage — resolved via [Research: Database patterns](../plans/db-research) — PostgreSQL with Liquibase migrations
- API framework — resolved via [Task: Evaluate Express vs Fastify](../plans/api-framework) — Express.js

## Not Yet Specified (Fog of War)

- User profile schema shape — **what** (we know fields like name/email, unclear about nested objects, internationalization)
- Caching strategy — **how** (API contract is fixed, but we're exploring Redis vs in-memory)
- Monitoring metrics — **how** (know we need uptime/latency, unclear which SLA targets)

## Out of Scope

- Mobile app integration (separate feature map)
- Third-party identity provider sync (phase 2)
- Historical profile audit trail (future enhancement)

## Acceptance Criteria

1. **All Decisions Resolved** — Every known decision has a ticket with recorded outcome
2. **Blocking Edges Clear** — All dependencies shown in Blocked Tickets table
3. **Frontier Identified** — Open Tickets table shows unblocked, ready-to-start work
4. **Fog Minimized** — Fog of War lists 3 or fewer items, each tagged what/how
5. **Destination Met** — API documented, tests passing, runbook written

## Open Tickets (Frontier)

| Ticket | Type | Assignee | Status |
|--------|------|----------|--------|
| [Implement GetUserProfileAsync](../tasks/profile-get) | Task | @diana | Ready |
| [Performance test with 10k profiles](../tasks/perf-test) | Task | @frank | Ready |
| [Write deployment runbook](../tasks/runbook) | Task | @eve | Draft |

## Blocked Tickets

| Ticket | Type | Blocked by | Reason |
|--------|------|-----------|--------|
| [Implement cache invalidation](../tasks/cache) | Task | [Caching strategy](../plans/cache-research) | BLOCKED: cannot implement cache without knowing cache layer choice |

## Revision History

| Date       | Author | Changes       |
|:-----------|:-------|:--------------|
| 2026-08-30 | eve    | Initial chart; 3 decisions, 3 fog items, 4 open tickets |
```

**Test expectation**: `{ valid: true, errors: [] }`

### Invalid Map Fixtures

| Test Case | Fixture Change | Expected Error | Guidance |
|-----------|---|---|---|
| Missing Destination | Remove section | Error_DestinationMissing | Add clear, specific outcome the map aims to reach |
| Vague Destination | "Make it better" | Error_DestinationVague | Describe specific deliverable (shipped feature, runbook, spec) |
| Too few criteria | 3 acceptance criteria | Error_InsufficientCriteria | Add at least 5 covering decisions, fog, scope, frontier, destination |
| Empty Decisions, no note | Decisions section empty | Error_EmptyDecisionsNoNote | List decisions or add note explaining why (e.g., "No decisions yet") |
| Fog items not tagged | "Database choice" (no what/how tag) | Error_FogItemNotTagged | Tag each item with **what** or **how** |
| Frontier table missing Status | No Status column | Error_FrontierMalformed | Add Status column to Open Tickets table |
| Blocked table missing Reason | Blocked tickets without Reason | Error_BlockedTableMalformed | Add Reason column explaining why each is blocked |
| Invalid status | `status: "InProgress"` | Error_InvalidStatus | Use one of: Charting, Walked, Completed, Stale |

### Map Error Message Tests

Verify error messages: Title, Issue, Location, Guidance, Example.

Example:

```
Title: Fog items incomplete
Issue: Fog of War items present but not tagged with kind (what / how)
Location: map-ticket-template.md (Not Yet Specified section, item #2)
Guidance: Tag each fog item with **what** (goal fuzzy, means clear) or **how**
  (goal fixed, means fuzzy). This helps prioritize: "what" fog needs clarification
  before tickets; "how" fog is ready to explore.
Example:
  - User profile schema shape — **what** (fields like name/email are clear, but unclear about nesting and internationalization)
```

### Map Override Tests

1. **User approves invalid map** — Fog items not tagged
   - Validator reports error
   - User selects "Override and publish"
   - Ticket created with override comment
   - Outcome logged

2. **User rejects override** — Destination vague
   - Validator reports error
   - User selects "Don't publish"
   - Ticket not created

## Cross-Skill Validation Consistency Tests

Verify that validation rules are enforced consistently across all consuming skills:
- jl-quiz validates quiz tickets before creation
- jl-recon validates research, prototype, task, map tickets before creation
- jl-issue-management validates all types before publishing to GitHub/Azure DevOps/Linear

### Test 1: Same Error, Same Message

Validate the same quiz ticket through:
1. jl-quiz's validator
2. jl-issue-management's validator

Both should report the same error (same title, same location, same guidance).

### Test 2: Same Override Approval, Same Result

Create an invalid research ticket in jl-recon with user override approved.
Create an identical invalid research ticket through jl-issue-management with user override approved.

Both should:
1. Report the same error
2. Record the override in a ticket comment (format may vary by provider, but content must match)
3. Log the override outcome

### Test 3: Error Precedence Consistent

If a ticket has multiple errors, verify all validators report them in the same order:
1. Frontmatter errors first
2. Section/structure errors second
3. Content quality errors last

## Test Execution Checklist

- [ ] Quiz: Valid fixture passes; all invalid fixtures report expected errors
- [ ] Quiz: Error messages are clear, actionable, include examples
- [ ] Quiz: Override workflow creates ticket with override comment and logs outcome
- [ ] Research: Valid fixture passes; all invalid fixtures report expected errors
- [ ] Research: Error messages clear; override workflow works
- [ ] Prototype: Valid fixture passes; all invalid fixtures report expected errors
- [ ] Prototype: Error messages clear; override workflow works
- [ ] Task: Valid fixture passes; all invalid fixtures report expected errors
- [ ] Task: Error messages clear; override workflow works
- [ ] Map: Valid fixture passes; all invalid fixtures report expected errors
- [ ] Map: Error messages clear; override workflow works
- [ ] Cross-skill: Same ticket validated identically across jl-quiz, jl-recon, jl-issue-management
- [ ] Cross-skill: Override approvals recorded consistently across skills
- [ ] Cross-skill: Error precedence is consistent across validators

## Test Data Repository

Store reusable test fixtures in:
- `references/test-fixtures/quiz-valid.md`
- `references/test-fixtures/quiz-invalid-*.md`
- `references/test-fixtures/research-valid.md`
- `references/test-fixtures/research-invalid-*.md`
- (and so on for prototype, task, map)

Consuming skills can load these fixtures for their own test suites.

## Notes for Implementer

1. **Error message clarity is non-negotiable** — Every error must include what's wrong, where it is, why it matters, and an example of correct format.
2. **Override trail is critical** — Every override must be logged with user approval, timestamp, and reason for audit.
3. **Consistency across skills is essential** — A ticket that passes in jl-recon must pass in jl-issue-management; failures must be identical.
4. **Test early, test often** — Validators catch mistakes before they reach external trackers; comprehensive tests catch validator bugs.
