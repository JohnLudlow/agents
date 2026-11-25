## Ticket Template Validation

Research tickets are validated before creation to ensure investigation scope
and methodology are clear. When `jl-recon` creates a new research ticket, it
validates the ticket structure against the research template schema before
committing to the target provider (GitHub Issues, Azure DevOps, etc.).

### Validation workflow

1. **Load the research content** from the user-filled template or created content
2. **Parse and validate** the frontmatter against required fields (type, status, author, date, etc.)
3. **Extract and validate** body sections (Investigation Goal, Research Scope, Findings, Recommendation, Acceptance Criteria)
4. **Report validation result**:
   - If valid: proceed to ticket creation
   - If invalid: report errors with remediation guidance; offer user override option

### Validation contract

A research ticket is **valid** when:

- Frontmatter contains all required fields with correct types and values
- Investigation Goal is stated as a neutral research question (not advocacy)
- Research Scope explicitly lists in-scope and out-of-scope boundaries
- Findings contain specific evidence or observations (not generalizations)
- Recommendation cites specific findings and acknowledges trade-offs
- Acceptance Criteria contains at least 3 checkable items

See `references/RESEARCH_VALIDATION_GUIDE.md` for:

- Complete validation contract and error messages
- User override workflow and audit trail
- Integration points and test cases

### Integration points

When `jl-recon` creates a research ticket:

1. Call the research validator with the filled template
2. If validation fails, report errors and ask user to fix or approve override
3. If override approved, record the approval in a ticket comment for audit trail
4. Create the ticket only after validation passes or override is approved

## Prototype Ticket Validation

Prototype tickets are validated before creation to ensure research question
and throwaway scope are explicit. When `jl-recon` creates a new prototype ticket,
it validates the ticket structure against the prototype template schema before
committing to the target provider (GitHub Issues, Azure DevOps, etc.).

### Validation workflow

1. **Load the prototype content** from the user-filled template or created content
2. **Parse and validate** the frontmatter against required fields (type, status, author, date, etc.)
3. **Extract and validate** body sections (Research Question, Implementation Approach, Verification, Throwaway Plan,
   Findings, Acceptance Criteria)
4. **Report validation result**:
   - If valid: proceed to ticket creation
   - If invalid: report errors with remediation guidance; offer user override option

### Validation contract

A prototype ticket is **valid** when:

- Frontmatter contains all required fields with correct types and values
- Research Question is stated as a single, clear exploration question (not too broad)
- Implementation Approach explicitly lists what will and will not be built
- Verification contains at least 3 specific, measurable success criteria
- Throwaway Plan explicitly states what code will be discarded and what findings carry forward
- Findings contain specific observations or data (not generalizations)
- Acceptance Criteria contains at least 3 checkable items

See `references/PROTOTYPE_VALIDATION_GUIDE.md` for:

- Complete validation contract and error messages
- User override workflow and audit trail
- Integration points and test cases

### Integration points

When `jl-recon` creates a prototype ticket:

1. Call the prototype validator with the filled template
2. If validation fails, report errors and ask user to fix or approve override
3. If override approved, record the approval in a ticket comment for audit trail
4. Create the ticket only after validation passes or override is approved

## Task Ticket Validation

Task tickets are validated before creation to ensure work scope and acceptance
criteria are explicit. When `jl-recon` creates a new task ticket, it validates
the ticket structure against the task template schema before committing to the
target provider (GitHub Issues, Azure DevOps, etc.).

### Validation workflow

1. **Load the task content** from the user-filled template or created content
2. **Parse and validate** the frontmatter against required fields (type, status, author, date, etc.)
3. **Extract and validate** body sections (Work Scope, Acceptance Criteria)
4. **Report validation result**:
   - If valid: proceed to ticket creation
   - If invalid: report errors with remediation guidance; offer user override option

### Validation contract

A task ticket is **valid** when:

- Frontmatter contains all required fields with correct types and values
- Type is set to "task"
- Work Scope explicitly lists "What will be done" and "What will NOT be done"
- Acceptance Criteria contains at least 3 items, each specific/measurable/checkable (SMC pattern)
- Each acceptance criterion includes or implies a way to verify (test command, build, code review)

See `references/TASK_VALIDATION_GUIDE.md` for:

- Complete validation contract and error messages (SMC pattern details)
- User override workflow and audit trail
- Integration points and test cases

### Integration points

When `jl-recon` creates a task ticket:

1. Call the task validator with the filled template
2. If validation fails, report errors and ask user to fix or approve override
3. If override approved, record the approval in a ticket comment for audit trail
4. Create the ticket only after validation passes or override is approved

## Map Ticket Validation

Validate new Maps with `jl-ticket-templates/validator.js` and the shipped
`jl-ticket-templates/references/MAP_VALIDATION_GUIDE.md`. New Maps use
`Draft`, `Ready`, `In Progress`, `Done`, or `Blocked`; read historical Maps
with `Charting`, `Walked`, `Completed`, or `Stale` without rewriting them.
New Maps list Research, Prototype, Requirements Quiz, Understanding Quiz,
Learn, and Prerequisite children; Map is the seventh new type. Historical
Quiz and Task tickets remain readable but are not new ticket types.

1. Load a filled Map template. For GitHub, use native issue metadata and a
   readable Details list; for local Markdown, parse YAML frontmatter.
2. Call `validateTicket(ticket, { provider, stage: "creation" })` before
   creating the Map. Report actionable errors with their locations.
3. If validation fails, correct the content. For a GitHub Map with **only**
   Map-content errors, the user may explicitly approve a limited override.
   Use `validateCreationOverride` for authorization; then create the issue,
   post the separate decision/reason comment, and verify its audit record.
   If the comment fails, keep the issue open and mark the audit pending.
   Structural, identity, status, and acceptance-criteria errors must be fixed.
4. At resolution, call `validateTicket(ticket, { provider, stage: "resolution" })`
   and complete the shared AC-before-close review before marking the Map Done.

The Map guide defines the exact columns, empty-section rules, error codes,
limited override sequence, and test cases. The Blocked Tickets table uses
`Ticket`, `Type`, `Blocked by`, and `Reason` columns; it does not require
`Status`.
