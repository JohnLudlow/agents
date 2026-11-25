---
description: "Publish-gate workflow for provider-native ticket creation and update, including override handling and audit logging"
---

# Ticket Validation

Publish-gate contract for provider-native tickets. When jl-issue-management
publishes issues to a native provider (GitHub, Linear, Azure DevOps, etc.), it
validates ticket structure against the jl-ticket-templates schema for the
ticket type (quiz, research, prototype, task, map). This is the final
validation gate before tickets reach the external tracker.

## Validation workflow

1. **Determine ticket type** from frontmatter `type` field
2. **Load the appropriate validator** from jl-ticket-templates
   (QUIZ_VALIDATION_GUIDE, RESEARCH_VALIDATION_GUIDE, etc.)
3. **Validate the ticket content** against the type-specific contract
   (frontmatter, required sections, SMC criteria)
4. **Report validation result**:
   - If valid: proceed to provider-native publish
   - If invalid: report errors with remediation guidance; offer user override
     option
5. **Log the outcome** — success, validation failure, or override acceptance
   for audit trail

## Validation applies to

- **All ticket types** — quiz, research, prototype, task, map
- **All destinations** — GitHub Issues, Azure DevOps work items, Linear
  issues, and other provider-native tickets
- **Both creation and update** — when publishing new or modified tickets

## Validation scope

When validating a ticket for provider-native publish:

1. **Frontmatter contract** — required fields per type (title, type, status,
   author, date from SHARED_BASE_SCHEMA)
2. **Type-specific sections** — Quiz uses Decision/Options/Reasoning;
   Research uses Investigation Goal/Scope/Findings/Recommendation;
   Task uses Work Scope/Criteria; Map uses Destination/Decisions/Fog/Frontier/Blocked
3. **Acceptance Criteria format** — every type must include 3+ Specific/
   Measurable/Checkable criteria
4. **Optional override flag** — if user has explicitly approved invalid
   content for publication, record the approval in provider-native comment
   or metadata

See jl-ticket-templates skill for type-specific validation details:

- `references/SHARED_BASE_SCHEMA.md` — shared frontmatter contract
- `references/QUIZ_VALIDATION_GUIDE.md` — quiz validation contract and errors
- `references/RESEARCH_VALIDATION_GUIDE.md` — research validation contract and errors
- `references/PROTOTYPE_VALIDATION_GUIDE.md` — prototype validation contract and errors
- `references/TASK_VALIDATION_GUIDE.md` — task validation contract and errors
- `references/MAP_VALIDATION_GUIDE.md` — map validation contract and errors

## User override workflow

If validation fails but the user wants to publish anyway:

1. **Report the error** — show the validation error message with location
   and remediation guidance
2. **Offer override** — ask "Override validation and publish anyway? [Yes] [No]"
3. **Record the override** — if user approves:
   - Publish the ticket as-is
   - Add a comment in provider-native tracker: "⚠️ Validation override by
     [user]: [error title]. Reason: [user input]"
   - Log override in session for audit trail
4. **Proceed only after explicit approval** — do not publish invalid content
   silently

## Integration points

When jl-issue-management publishes a ticket to a provider:

1. Call the appropriate type-specific validator from jl-ticket-templates
2. If validation fails, report the error with remediation guidance
3. If user approves override, record the approval in the provider-native
   ticket comment
4. Publish the ticket only after validation passes or override is explicitly
   approved
5. Log the validation outcome (valid, invalid-override-approved) for
   debugging and audit

## See Also

- [SKILL.md](../SKILL.md#ticket-template-validation) — Discoverable publish gate
