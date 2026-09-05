# Research Ticket Validation Guide

## Overview

When `jl-recon` creates a new research ticket, it should validate the ticket
structure against the research template schema before committing the ticket to
the target provider (GitHub, Azure DevOps, etc.).

This guide documents:

- **validation contract** — what a valid research ticket contains
- **error messages** — how to report validation failures with remediation
- **user overrides** — how to let users approve tickets that fail validation
- **integration points** — where in the jl-recon workflow validation runs

## Validation Contract

A research ticket is **valid** when it contains:

### Required frontmatter fields (from SHARED_BASE_SCHEMA)

```yaml
---
title: "Research: [Topic]"
description: "[One-line summary]"
type: "research"
status: "Draft" | "Ready" | "In Progress" | "Done" | "Blocked"
author: "[jl-recon or agent name]"
date: "[YYYY-MM-DD in ISO format]"
related_links: "[URLs or empty string]"
parent: "[URL or empty string]"
---
```

- `type` MUST be `"research"` (not `quiz`, `task`, etc.)
- `date` MUST be ISO 8601 format (YYYY-MM-DD)
- `status` MUST be one of the enum values
- All fields except `related_links` and `parent` MUST be present and non-empty

### Required sections (research-specific)

The ticket body MUST contain these markdown sections in order:

1. **Investigation Goal** — phrased as a neutral research question
   - MUST NOT be blank
   - MUST be phrased as a question ("What are..." or "How do..." is OK; "We should migrate" is not)
   - MUST NOT presuppose an answer

2. **Research Scope** — explicit in-scope and out-of-scope boundaries
   - MUST have heading `## Research Scope` or `### In Scope` / `### Out of Scope`
   - MUST list at least one item in each (in-scope and out-of-scope)
   - Items MUST be specific (not vague like "performance" without detail)

3. **Findings** — evidence and results from the investigation
   - MUST NOT be blank
   - MUST contain specific data, references, or observations (not generalizations)
   - SHOULD be organized by topic or question
   - MUST reference at least one external source or concrete observation

4. **Recommendation** — conclusion drawn from findings
   - MUST NOT be blank
   - MUST reference specific findings (not generic statements)
   - MUST acknowledge trade-offs or caveats (if any exist)

5. **Acceptance Criteria** — checklist of done conditions
   - MUST be a checklist (using `- [ ]` or `- [x]`)
   - MUST have at least 3 criteria
   - Criteria MUST be specific and checkable (see SHARED_BASE_SCHEMA for examples)

## Validation Workflow

When `jl-recon` is about to create a research ticket:

1. **Load the research content** from the user's filled template or created content
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
Location: [Frontmatter / Investigation Goal / Research Scope / Findings / Recommendation / Acceptance Criteria]
Guidance: [Specific remediation steps]

Example of correct format:
[Show a minimal fixed version]
```

### Example error: Blank investigation goal

```markdown
Validation Error: Missing or blank 'Investigation Goal' section

Issue: The 'Investigation Goal' section is blank or missing
Location: Investigation Goal
Guidance: Add or update the 'Investigation Goal' section with a research question.
The question should be neutral and not presuppose an answer.

Example of correct format:

## Investigation Goal

What are the operational costs of migrating to PostgreSQL versus staying on SQLite?
```

### Example error: Investigation goal presupposes answer

```markdown
Validation Error: Investigation goal presupposes an answer

Issue: The 'Investigation Goal' is phrased as an advocacy statement, not a neutral question
Location: Investigation Goal
Guidance: Rewrite the investigation goal as a neutral research question.
Instead of stating "We should migrate to PostgreSQL", ask "What are the costs
and benefits of migrating to PostgreSQL?"

Example of correct format:

## Investigation Goal

Should we migrate to PostgreSQL, and what would that cost versus staying on SQLite?
```

### Example error: Research scope missing out-of-scope items

```markdown
Validation Error: Research scope missing explicit boundaries

Issue: The 'Research Scope' section does not clearly define what is out of scope
Location: Research Scope
Guidance: Add an 'Out of Scope' subsection (or bullet points under 'Out of Scope')
listing what will NOT be investigated. This helps readers understand the limits
of the research and what decisions it does not inform.

Example of correct format:

## Research Scope

**In scope:**

- Database performance under load (1000+ concurrent users)
- Deployment and operational complexity

**Out of scope:**

- Cost of managed database services (not applicable to this architecture)
- NoSQL alternatives (team requires relational schema)
```

### Example error: Findings lack specific evidence

```markdown
Validation Error: Findings lack concrete evidence or references

Issue: The 'Findings' section contains generalizations without specific data,
references, or observations
Location: Findings
Guidance: Replace vague statements with specific findings.
Include data points, external references (documentation, benchmarks, team
feedback), or observations from prototyping. Each finding should be traceable
to an investigation activity.

Example of correct format:

## Findings

### PostgreSQL deployment

- Deployment via Docker takes ~30 minutes (tested with nginx + PostgreSQL 15)
- Systemd integration documented in [PostgreSQL official guide](https://example.com)
- Team familiarity: 2 developers know PostgreSQL; 3 need ramp-up time (~2 weeks)
```

### Example error: Recommendation ignores findings

```markdown
Validation Error: Recommendation does not reference findings

Issue: The 'Recommendation' section does not cite or explain how it was derived
from the findings
Location: Recommendation
Guidance: Rewrite the recommendation to explicitly reference findings.
Acknowledge any trade-offs or caveats that temper the recommendation.

Example of correct format:

## Recommendation

PostgreSQL is recommended because:

- Deployment overhead is acceptable (30 minutes via Docker; one-time cost)
- Eliminates custom multi-server coordination logic (estimated 80 hours development)
- Our team can learn PostgreSQL in 2–3 weeks

Trade-off: Initial ramp-up time means productivity dip for 2–3 weeks.
Follow-up: Create migration task and training plan.
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

- [ ] Investigation goal clearly stated as a research question
- [ ] Scope explicitly lists at least 1 in-scope and 1 out-of-scope item
- [ ] Findings documented with specific evidence or external references
- [ ] Recommendation cites findings and acknowledges trade-offs
- [ ] Next steps or dependent decisions identified (if any)
```

### Example error: Non-checkable acceptance criteria

```markdown
Validation Error: Acceptance criteria are not measurable or checkable

Issue: Criteria use vague language ("good", "understand", "explore")
Location: Acceptance Criteria
Guidance: Rewrite each criterion using specific, actionable verbs.
Examples of checkable verbs: document, verify, test, validate, list, create,
measure. Avoid vague verbs: understand, explore, improve, consider.

Bad:

- [ ] Explore PostgreSQL ❌

Good:

- [ ] Document PostgreSQL deployment procedure (Docker + systemd) with examples
- [ ] Create test migration from SQLite with sample data
- [ ] Record ramp-up time estimate for each team member
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

```text
Validation Error: Acceptance criteria do not meet minimum requirements
(See error message above for remediation)

Validate again, or override and create ticket as-is?
[Fix]   [Override]

User selects [Override]
↓
Validation override recorded in ticket comment:
"Validation override approved by jane on 2026-08-30. Reason: Low-risk
exploration; will document findings as we progress."
↓
Ticket created with override note visible to reviewers
```

## Integration Points in jl-recon

Research validation integrates into jl-recon at the **ticket creation** step.

### Pseudocode

```javascript
// In jl-recon workflow, when user creates a research ticket:

const createResearchTicket = async (ticketContent, targetProvider, userOptions = {}) => {
  // Step 1: Import validator module
  const { validateResearchTicket } = require('./validators/validator-research.js');

  // Step 2: Validate ticket structure
  const validation = validateResearchTicket(ticketContent, targetProvider);

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
const validateResearchTicket = (ticketContent, targetProvider) => {
  // Returns: { valid: bool, errors: Error[], warnings: Warning[] }
  // Each Error has: { title, issue, location, guidance, example }
};
```

### Validation call site in jl-recon

In the `jl-recon` SKILL.md, add this section to **Requirements**:

```markdown
Research tickets are validated before creation using the RESEARCH_VALIDATION_GUIDE.
See that document for validation contract, error messages, and user override workflow.
```

And add this to **When to Use** (research branch):

```markdown
Research tickets — investigations that explore a question, gather evidence,
and report findings. Validation ensures investigation scope and methodology
are clear. See research-ticket-template.md and RESEARCH_VALIDATION_GUIDE.md.
```

## Testing the Validator

To test `validateResearchTicket()`, create test cases for:

1. **Valid research ticket** — all required fields and sections present
2. **Missing investigation goal** — empty Investigation Goal section
3. **Investigation goal presupposes answer** — phrased as advocacy, not question
4. **Missing research scope** — no In Scope or Out of Scope boundaries
5. **Blank findings** — Findings section empty
6. **Recommendation ignores findings** — Recommendation does not cite findings
7. **Insufficient acceptance criteria** — fewer than 3 criteria
8. **Non-checkable criteria** — criteria use vague verbs (understand, explore)

Example test case:

```javascript
describe('validateResearchTicket', () => {
  it('accepts a valid research ticket', () => {
    const valid = {
      frontmatter: {
        type: 'research',
        status: 'Draft',
        date: '2026-08-30',
      },
      body: `
## Investigation Goal
What are the costs of migrating to PostgreSQL?

## Research Scope
**In scope:**
- Deployment complexity
**Out of scope:**
- Cost of managed services

## Findings
PostgreSQL requires 30 minutes to deploy via Docker.

## Recommendation
Migrate to PostgreSQL because deployment is straightforward.

## Acceptance Criteria
- [ ] Goal clearly stated
- [ ] Scope boundaries defined
- [ ] Findings documented
      `,
    };
    const result = validateResearchTicket(valid);
    expect(result.valid).toBe(true);
  });
});
```
