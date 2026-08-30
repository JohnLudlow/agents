# Prototype Ticket Validation Guide

## Overview

When `jl-recon` creates a new prototype ticket, it should validate the ticket
structure against the prototype template schema before committing the ticket to
the target provider (GitHub, Azure DevOps, etc.).

This guide documents:

- **validation contract** — what a valid prototype ticket contains
- **error messages** — how to report validation failures with remediation
- **user overrides** — how to let users approve tickets that fail validation
- **integration points** — where in the jl-recon workflow validation runs

## Validation Contract

A prototype ticket is **valid** when it contains:

### Required frontmatter fields (from SHARED_BASE_SCHEMA)

```yaml
---
title: "Prototype: [Exploration topic]"
description: "[One-line summary]"
type: "prototype"
status: "Draft" | "Ready" | "In Progress" | "Done" | "Blocked"
author: "[jl-recon or agent name]"
date: "[YYYY-MM-DD in ISO format]"
related_links: "[URLs or empty string]"
parent: "[URL or empty string]"
---
```

- `type` MUST be `"prototype"` (not `quiz`, `research`, etc.)
- `date` MUST be ISO 8601 format (YYYY-MM-DD)
- `status` MUST be one of the enum values
- All fields except `related_links` and `parent` MUST be present and non-empty

### Required sections (prototype-specific)

The ticket body MUST contain these markdown sections in order:

1. **Research Question** — phrased as a single, clear exploration question
   - MUST NOT be blank
   - MUST be a question (ends with `?`), not a statement
   - MUST NOT be broader than can be explored in one time-boxed session

2. **Implementation Approach** — explicit in/out scope of what the prototype builds
   - MUST have heading `## Implementation Approach` or similar
   - MUST have "Will build" and "Will not build" subsections or bullet lists
   - Both sections MUST be non-empty and specific
   - Items MUST be concrete (not vague like "basic UI" without detail)

3. **Verification** — specific success criteria the prototype will test
   - MUST NOT be blank
   - MUST contain at least 3 measurable criteria
   - Criteria MUST be specific and observable (not subjective like "performs well")

4. **Throwaway Plan** — explicit statement of what will be discarded
   - MUST NOT be blank
   - MUST explicitly state what code/work will be discarded
   - MUST state what findings carry forward
   - MUST be clear that the prototype is not production code

5. **Findings** — what the prototype revealed
   - MUST NOT be blank
   - MUST contain specific observations or data (not generalizations)
   - SHOULD reference verification criteria and whether they were met
   - MUST connect findings to the original research question

6. **Acceptance Criteria** — checklist of done conditions
   - MUST be a checklist (using `- [ ]` or `- [x]`)
   - MUST have at least 3 criteria
   - Criteria MUST be specific and checkable (see SHARED_BASE_SCHEMA for examples)

## Validation Workflow

When `jl-recon` is about to create a prototype ticket:

1. **Load the prototype content** from the user's filled template or created content
2. **Parse the frontmatter** and extract required fields
3. **Validate frontmatter contract** (see Required frontmatter fields above)
4. **Parse the body** and extract sections
5. **Validate body contract** (see Required sections above)
6. **Report validation result**:
   - If valid: proceed to ticket creation
   - If invalid: report errors with remediation and offer override option

## Error Messages

When validation fails, report **one error per issue**, not all at once.
Use this format:

```markdown
Validation Error: [Error title]

Issue: [What is wrong]
Location: [Frontmatter / Research Question / Implementation Approach / Verification / Throwaway Plan / Findings / Acceptance Criteria]
Guidance: [Specific remediation steps]

Example of correct format:
[Show a minimal fixed version]
```

### Example error: Missing research question

```markdown
Validation Error: Missing or blank 'Research Question' section

Issue: The 'Research Question' section is blank or missing
Location: Research Question
Guidance: Add or update the 'Research Question' section with a single, clear
question that the prototype will answer. The question should be answerable
through time-boxed exploration, not a multi-session investigation.

Example of correct format:

## Research Question

Can websockets reliably sync collaborative state updates with acceptable
latency and connection stability at our target scale?
```

### Example error: Research question is too broad

```markdown
Validation Error: Research question is too broad for time-boxed exploration

Issue: The 'Research Question' is phrased as a multi-session investigation,
not a time-boxed prototype question
Location: Research Question
Guidance: Rewrite the question to be answerable in one session with a
throwaway implementation. Instead of "How should we design real-time
collaboration?", ask "Can websockets handle our state sync use case?"

Example of correct format:

## Research Question

Can websockets reliably sync collaborative state updates with acceptable
latency and connection stability at our target scale?
```

### Example error: Implementation approach missing scope boundaries

```markdown
Validation Error: Implementation approach missing scope boundaries

Issue: The 'Implementation Approach' section does not clearly distinguish
between what the prototype will and will not build
Location: Implementation Approach
Guidance: Add explicit 'Will build' and 'Will not build' subsections.
This helps readers understand the scope and what is deliberately excluded.

Example of correct format:

## Implementation Approach

**Will build:**
- Simple 2-user collaboration UI with shared text editing
- WebSocket server using ws library
- State sync on every keystroke

**Will not build:**
- Persistence layer or database (in-memory state only)
- Conflict resolution (last-write-wins only)
- Production-grade error handling
```

### Example error: Verification criteria are subjective

```markdown
Validation Error: Verification criteria are not specific or measurable

Issue: The 'Verification' section contains subjective success criteria that
cannot be observed or measured (e.g., "performs well", "feels fast")
Location: Verification
Guidance: Rewrite each criterion using specific, measurable conditions.
Include numbers where appropriate (latency, scale, count, time limits).

Bad:
- [ ] Websockets perform well ❌

Good:
- [ ] Edits appear in <100ms latency on a local connection
- [ ] Connection loss recovers automatically within 2 seconds
- [ ] Handles 10+ concurrent users without visible lag
```

### Example error: Throwaway plan missing

```markdown
Validation Error: Missing or vague 'Throwaway Plan' section

Issue: The 'Throwaway Plan' section is blank or does not clearly state
what will be discarded and what findings carry forward
Location: Throwaway Plan
Guidance: Add or update the 'Throwaway Plan' section with explicit statements:
- What code/work will be discarded
- What findings from the prototype will inform the next decision
- Clear assertion that this is not production code

Example of correct format:

## Throwaway Plan

The prototype code will not be merged. We will discard the websocket
implementation and state sync logic. We will keep the findings about
latency, connection stability, and payload size to inform the production
architecture.
```

### Example error: Findings lack specific data

```markdown
Validation Error: Findings lack concrete data or observations

Issue: The 'Findings' section contains generalizations without specific
data points or references to verification criteria
Location: Findings
Guidance: Replace vague statements with specific findings. Include data
points, measurements, observations, or references to verification criteria
that were or were not met.

Bad:
Websockets seem to work fine. ❌

Good:
Websockets handle our workload comfortably. Latency on local connection:
5-15ms (well below 100ms target). Connection recovery works; reconnect
happens within 200ms of network restoration. All verification criteria met.
```

### Example error: Insufficient acceptance criteria

```markdown
Validation Error: Acceptance criteria do not meet minimum requirements

Issue: The 'Acceptance Criteria' section has fewer than 3 criteria
Location: Acceptance Criteria
Guidance: Add at least 3 acceptance criteria. Each should be specific, measurable,
and checkable. See SHARED_BASE_SCHEMA.md for examples of good criteria.

Example of correct format:

## Acceptance Criteria

- [ ] Research question clearly stated
- [ ] Implementation approach documents what will and will not be built
- [ ] Verification criteria are specific and measurable
- [ ] Throwaway plan explicitly states what will be discarded
- [ ] Findings documented with specific observations or data
```

### Example error: Non-checkable acceptance criteria

```markdown
Validation Error: Acceptance criteria are not measurable or checkable

Issue: Criteria use vague language ("good", "understand", "explore")
Location: Acceptance Criteria
Guidance: Rewrite each criterion using specific, actionable verbs.
Examples of checkable verbs: document, verify, test, validate, record, measure.
Avoid vague verbs: understand, explore, improve, consider, assess.

Bad:
- [ ] Understand websocket performance ❌

Good:
- [ ] Record websocket latency measurements and connection recovery time
- [ ] Document all verification criteria results (passed/failed)
- [ ] Verify throwaway code will not be merged
```

## User Override

When validation fails, offer the user this workflow:

1. **Report the validation error** with remediation guidance (see Error Messages above)
2. **Prompt**: "Fix the issue and resubmit, or approve ticket as-is? [Fix / Override]"
3. **If Fix**: Return to step 1 (user updates and revalidates)
4. **If Override**: Record the user's approval decision
   - Add a comment to the ticket: "Validation override approved by [user] on [date]: [reason if provided]"
   - This creates an audit trail for future reviewers

Example override workflow:

```
Validation Error: Verification criteria are not specific or measurable
(See error message above for remediation)

Validate again, or override and create ticket as-is?
[Fix]   [Override]

User selects [Override]
↓
Validation override recorded in ticket comment:
"Validation override approved by jane on 2026-08-30. Reason: Quick
exploration; will refine success criteria during prototyping."
↓
Ticket created with override note visible to reviewers
```

## Integration Points in jl-recon

Prototype validation integrates into jl-recon at the **ticket creation** step.

### Pseudocode

```javascript
// In jl-recon workflow, when user creates a prototype ticket:

const createPrototypeTicket = async (ticketContent, targetProvider, userOptions = {}) => {
  // Step 1: Import validator module
  const { validatePrototypeTicket } = require('./validators/validator-prototype.js');
  
  // Step 2: Validate ticket structure
  const validation = validatePrototypeTicket(ticketContent, targetProvider);
  
  if (validation.valid) {
    // Validation passed; create ticket
    const ticket = await targetProvider.createIssue({
      title: ticketContent.frontmatter.title,
      body: ticketContent.body,
      labels: ticketContent.labels,
    });
    return { success: true, ticket };
  } else {
    // Validation failed; report errors
    const errors = validation.errors.map(e => formatError(e)).join('\n\n');
    console.log(errors);
    
    if (userOptions.override) {
      // User approved override; add audit comment
      const ticketWithComment = await targetProvider.createIssue({
        title: ticketContent.frontmatter.title,
        body: ticketContent.body,
        labels: ticketContent.labels,
      });
      await targetProvider.addComment(ticketWithComment.id, {
        body: `Validation override approved by ${userOptions.approver} on ${new Date().toISOString()}: ${userOptions.reason || 'No reason provided'}`,
      });
      return { success: true, ticket: ticketWithComment, override: true };
    } else {
      // User declined override; return errors
      return { success: false, errors: validation.errors };
    }
  }
};

// Validator function contract:
const validatePrototypeTicket = (ticketContent, targetProvider) => {
  // Returns: { valid: bool, errors: Error[], warnings: Warning[] }
  // Each Error has: { title, issue, location, guidance, example }
};
```

### Validation call site in jl-recon

In the `jl-recon` SKILL.md, add this section to **Requirements**:

```markdown
Prototype tickets are validated before creation using the PROTOTYPE_VALIDATION_GUIDE.
See that document for validation contract, error messages, and user override workflow.
```

And add this to **When to Use** (prototype branch):

```markdown
Prototype tickets — time-boxed explorations that raise the fidelity of a
discussion with a throwaway artifact. Validation ensures research question
and throwaway scope are explicit. See prototype-ticket-template.md and
PROTOTYPE_VALIDATION_GUIDE.md.
```

## Testing the Validator

To test `validatePrototypeTicket()`, create test cases for:

1. **Valid prototype ticket** — all required fields and sections present
2. **Missing research question** — empty Research Question section
3. **Research question too broad** — multi-session question, not time-boxed
4. **Missing implementation approach** — no Will build or Will not build scope
5. **Verification criteria not measurable** — subjective success criteria
6. **Missing throwaway plan** — empty or vague Throwaway Plan section
7. **Insufficient acceptance criteria** — fewer than 3 criteria
8. **Non-checkable criteria** — criteria use vague verbs

Example test case:

```javascript
describe('validatePrototypeTicket', () => {
  it('accepts a valid prototype ticket', () => {
    const valid = {
      frontmatter: {
        type: 'prototype',
        status: 'Draft',
        date: '2026-08-30',
      },
      body: `
## Research Question
Can websockets reliably sync collaborative state?

## Implementation Approach
**Will build:**
- WebSocket server
- 2-user UI

**Will not build:**
- Database
- Conflict resolution

## Verification
- [ ] Latency <100ms
- [ ] Handles 10+ users

## Throwaway Plan
Prototype code will not be merged. Findings carry forward to production design.

## Findings
Websockets work well. Latency: 5-15ms.

## Acceptance Criteria
- [ ] Research question stated
- [ ] Scope boundaries clear
- [ ] Verification criteria measurable
      `,
    };
    const result = validatePrototypeTicket(valid);
    expect(result.valid).toBe(true);
  });
});
```
