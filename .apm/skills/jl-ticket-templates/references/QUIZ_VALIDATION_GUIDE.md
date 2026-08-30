# Quiz Ticket Validation Guide

## Overview

When `jl-quiz` creates a new quiz ticket, it should validate the ticket
structure against the quiz template schema before committing the ticket to
the target provider (GitHub, Azure DevOps, etc.).

This guide documents:

- **validation contract** — what a valid quiz ticket contains
- **error messages** — how to report validation failures with remediation
- **user overrides** — how to let users approve tickets that fail validation
- **integration points** — where in the jl-quiz workflow validation runs

## Validation Contract

A quiz ticket is **valid** when it contains:

### Required frontmatter fields (from SHARED_BASE_SCHEMA)

```yaml
---
title: "Decision: [Decision name]"
description: "[One-line summary]"
type: "quiz"
status: "Draft" | "Ready" | "In Progress" | "Done" | "Blocked"
author: "[jl-quiz or agent name]"
date: "[YYYY-MM-DD in ISO format]"
related_links: "[URLs or empty string]"
parent: "[URL or empty string]"
---
```

- `type` MUST be `"quiz"` (not `research`, `task`, etc.)
- `date` MUST be ISO 8601 format (YYYY-MM-DD)
- `status` MUST be one of the enum values
- All fields except `related_links` and `parent` MUST be present and non-empty

### Required sections (quiz-specific)

The ticket body MUST contain these markdown sections in order:

1. **Decision Statement** — phrased as a neutral question
   - MUST NOT be blank
   - MUST NOT be phrased as advocacy ("Should we..." or "We need to..." is OK; "TypeScript is great" is not)

2. **Options** — at least 2 options, each with pros and cons
   - MUST have heading `## Options` or `### Option 1:`, `### Option 2:`, etc.
   - MUST contain at least 2 distinct options
   - Each option MUST have a **Pros** and **Cons** subsection
   - Pros MUST NOT be blank; cons MUST NOT be blank

3. **Reasoning** — explanation of which option was chosen and why
   - MUST NOT be blank
   - MUST reference the chosen option by name
   - MUST mention at least one trade-off considered

4. **Acceptance Criteria** — checklist of done conditions
   - MUST be a checklist (using `- [ ]` or `- [x]`)
   - MUST have at least 3 criteria
   - Criteria MUST be specific and checkable (see SHARED_BASE_SCHEMA for examples)

## Validation Workflow

When `jl-quiz` is about to create a quiz ticket:

1. **Load the quiz content** from the user's filled template or created content
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
Location: [Frontmatter / Decision Statement / Options / Reasoning / Acceptance Criteria]
Guidance: [Specific remediation steps]

Example of correct format:
[Show a minimal fixed version]
```

### Example error: Missing required frontmatter field

```markdown
Validation Error: Missing or empty 'date' field

Issue: The 'date' field in frontmatter is empty or missing
Location: Frontmatter
Guidance: Add or update the date field in YAML frontmatter using ISO 8601 format (YYYY-MM-DD)

Example of correct format:
---
date: "2026-08-30"
---
```

### Example error: Invalid date format

```markdown
Validation Error: Date format not ISO 8601

Issue: The 'date' field contains "Aug 30, 2026" but must be YYYY-MM-DD
Location: Frontmatter → date field
Guidance: Reformat to YYYY-MM-DD (e.g., "2026-08-30")

Example of correct format:
---
date: "2026-08-30"
---
```

### Example error: Decision statement missing

```markdown
Validation Error: Missing 'Decision Statement' section

Issue: The ticket body does not contain a '## Decision Statement' section
Location: Ticket body
Guidance: Add a section titled "## Decision Statement" with a neutral question phrased as "Should we..." or 
          "How should we...?"

Example of correct format:
## Decision Statement

Should we adopt TypeScript strict mode for this codebase?
```

### Example error: Only one option provided

```markdown
Validation Error: Not enough options

Issue: The Options section lists only 1 option, but a decision requires at least 2
Location: Options section
Guidance: Add at least one more option with its own pros and cons

Example of correct format:
### Option 1: Adopt strict mode immediately

**Pros:**
- Catch type errors sooner

**Cons:**
- Blocks all PRs during retrofit

### Option 2: Adopt strict mode gradually

**Pros:**
- Allows phased implementation

**Cons:**
- Mixed enforcement during transition
```

### Example error: Empty reasoning

```markdown
Validation Error: 'Reasoning' section is empty

Issue: The Reasoning section contains no text explaining which option was chosen
Location: Reasoning section
Guidance: Write 1–2 paragraphs explaining which option was selected and why, including trade-offs considered

Example of correct format:
## Reasoning

We chose gradual adoption because immediate adoption would block all PRs.
By adopting gradually, we can get safety benefits sooner while allowing
time to retrofit existing code without disrupting the team.
```

## User Override

When validation fails, jl-quiz MUST offer the user an explicit override option:

```markdown
Validation failed with [N] error(s):
[List errors]

You can:
1. Fix the ticket and resubmit
2. Override validation and create anyway (requires approval)

Which would you like to do?
[Fix] [Override]
```

If the user chooses **Override**, they are explicitly approving creation despite
validation failures. Record this approval in a comment on the created ticket:

```markdown
<!-- Validation Override -->
Created with validation override by [user] on [date].
Issues noted:
- [Error 1]
- [Error 2]
```

This allows future reviewers to understand that the ticket was knowingly created
despite structural deviations.

## Integration Points in jl-quiz

When jl-quiz calls `validateQuizTicket()`:

### Input

- `ticket_content` — the full markdown content (frontmatter + body)
- `target_provider` — `github` or `azure_devops` (used for provider-specific field checks)
- `user_options` — optional object with `allow_override: boolean` flag

### Output

```javascript
{
  valid: boolean,
  errors: [
    {
      code: string,          // e.g., "missing_field_date"
      title: string,          // e.g., "Missing required frontmatter field"
      location: string,       // e.g., "Frontmatter → date"
      guidance: string,       // Remediation steps
      example: string         // Example of correct format
    }
  ],
  warnings: [
    // Non-blocking guidance
  ]
}
```

### Validation decision logic

```text
if validation.valid is true:
  proceed to ticket creation

else if validation.valid is false:
  if user_options.allow_override is true:
    ask user: "Fix or override?"
    if user chooses "override":
      proceed to creation with override note
    else:
      return to ticket editing
  else:
    report all errors and block creation until fixed
```

## Importing in jl-quiz

jl-quiz should import and use the validator like this:

```javascript
const { validateQuizTicket } = require('.apm/skills/jl-ticket-templates/validator-quiz.js');

// When about to create a quiz ticket:
const result = validateQuizTicket(ticketContent, targetProvider);

if (!result.valid) {
  reportValidationErrors(result.errors);
  if (allowUserOverride) {
    askUserToFixOrOverride();
  } else {
    blockTicketCreation();
  }
}
```

## Testing the Validator

Test cases for `validateQuizTicket()`:

1. **Valid quiz with all fields** → `valid: true`
2. **Missing Decision Statement section** → error with remediation
3. **Only 1 option** → error with remediation
4. **Empty Reasoning** → error with remediation
5. **Invalid date format** → error with remediation
6. **Missing required frontmatter field** → error with remediation
7. **Valid quiz with 2 options** → `valid: true`
8. **Valid quiz with 3+ options** → `valid: true`
