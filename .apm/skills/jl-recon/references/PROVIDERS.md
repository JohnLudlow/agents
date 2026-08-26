# Provider Mechanics

How the map, tickets, blocking, and assignee tracking are represented per
provider. Only the provider actually in use for a given map matters — read
the section for that provider, not all three.

## Checking for Existing Maps (Pre-Chart Detection)

Before Chart mode creates a map, check whether a map for this destination
already exists. A map may exist under its original name, or under a variant
name if the destination was rephrased or the map was renamed mid-session.

### What is a "variant"?

A **variant** is an existing map that may not exactly match the proposed
destination name but serves the same purpose. Variants arise when:

- User's destination name changed between sessions
- Map was renamed during prior work
- Multiple similar maps exist for related (but distinct) destinations
- Destination name was slug-ified, abbreviated, or rephrased in storage

### Detection strategy per provider

In all cases, the map is a child of its inciting issue. If an inciting issue
was provided by the user, check its children first. If an existing map or
plausible variant is found, surface it to the user with two options:

- "Link to the existing map and reuse it"
- "Create a new map for this destination" (if the user is confident it's a different scope)

Never silently duplicate a map.

See provider subsections below for check procedures.

## Ticket Hierarchy and Structure

Recon distinguishes between **map work** (exploration, planning, decisions)
and **implementation work** (actual changes). This distinction is structural:

### The Hierarchy

```plain
Inciting Issue (user's original request)
├── Map (recon planning artifact)                            # never try to implement or commit work here
│   ├── Research ticket (investigation)                      # never try to implement or commit work here
│   ├── Quiz ticket (decision clarification)                 # never try to implement or commit work here
│   ├── Prototype ticket (raise fidelity)                    # never try to implement or commit work here
│   └── Task ticket (unblock a decision)                     # never try to implement or commit work here
├── Implementation Ticket (actual change, sibling of map)
├── Implementation Ticket (another change, sibling of map)
└── ...
```

### Key Points

- **Map is a planning artifact, not an implementation artifact.** The map's job
  is to surface decisions and reduce fog before implementation begins. The map
  itself is not where code changes happen.
- **Map tickets (Research, Quiz, Prototype, Task) are children of the map.**
  They resolve the individual decisions blocking the map's destination.
- **Implementation tickets are siblings of the map, both under the inciting
  issue.** When the map is "ready for implementation" (all decisions resolved,
  fog cleared), implementation work proceeds in separate tickets that are
  **siblings of the map**, not children. This keeps implementation separate
  from planning.
- **Maps can outlive individual implementation cycles.** If implementation work
  surfaces new questions or splits into multiple phases, those work items link
  back to the same map (as cross-references, not as parent/child), rather than
  replacing or nesting under it.

### Practical Workflow

1. User opens an inciting issue ("Build the widgetizer")
2. Recon charts a map under that issue ("Plan: widgetizer design decisions")
3. Recon creates map tickets (research, quiz, etc.) as children of the map
4. When the map is ready, recon surfaces this to the user with guidance to
   create implementation tickets
5. Implementation tickets are created as **siblings of the map** (both children
   of the inciting issue), labeled `implementation:` or equivalent
6. Implementation work proceeds independently; if new questions surface, they
   thread back to the map (cross-reference), not into the map's child list

### Documentation Per Provider

See the provider-specific sections below for how to create the parent/child
and sibling relationships in each system (GitHub sub-issues, Azure DevOps
parent/child links, markdown files).

## GitHub

### Checking for Existing Maps (GitHub)

**The map is always a child of the inciting issue.** If the user provided an
inciting issue, check it first.

**Step 1: Inciting-issue check** (if provided)

- Query the inciting issue's sub-issues:

  ```bash
  gh issue view <inciting_issue_number> --json title,body,projectItems
  ```

- Look for sub-issues with the `recon:map` label.
- If found, confirm with the user whether to reuse it.

**Step 2: Label + Title search** (if inciting issue not provided, or no map found under it)

- Query all `recon:map` issues and search by destination name:

  ```bash
  gh issue list --repo <owner>/<repo> --label "recon:map" \
    --json title,number,state
  ```

- Filter for issues whose title contains destination keywords.

**Step 3: Variant search** (if Steps 1–2 found nothing)

- Case-insensitive search: replace spaces with hyphens, convert to lowercase
- Search for partial matches if the destination name is multi-word
- Show user recently-updated `recon:map` issues as possible variants

**If found:** Ask user whether to reuse the existing map or create a new one.

### Provider Implementation Details (GitHub)

- **Map**: an issue labelled `recon:map`.
- **Inciting issue link**: the map is always a native sub-issue of its inciting issue
  (GitHub's sub-issue feature), so it appears in that issue's task list and the map is
  discoverable from where the request started. If the inciting issue is
  itself already a sub-issue of something else, still link the map under it
  directly — do not skip a level. If native sub-issue linking is unavailable
  for any reason, fall back to a `Parent issue: [name](link)` line at the
  top of the map's Notes section — but prefer the native relationship.
- **Tickets**: native sub-issues of the map issue. Copy every label the map
  issue carries onto each new ticket, then add the ticket's own
  `recon:<type>` label on top — labels are additive, not a replacement
  for whatever the map already carries (area labels, priority, `bug`, and
  so on).
- **Decisions-so-far**: a single manually-maintained list in the map issue
  body. This is needed even though GitHub already renders the sub-issue list
  natively, because some decisions resolve trivially in-session with no
  child issue ever created — the manual list is the only place those show
  up. Do not add a second list, a prose summary, or a status table
  alongside it; one list carries all resolved decisions, whether or not each
  one has a sub-issue behind it.
- **Ticket type**: a label — `recon:research`, `recon:prototype`,
  `recon:quiz`, `recon:task`.
- **Blocking**: GitHub's native "blocked by" / "blocks" issue links. Also add
  a short note in the ticket body stating the reason, e.g. `BLOCKED:
  requires the widget widgetiser from [widgetising-widgets]` — the native
  link says *that* it's blocked; the note says *why*, in the same place a
  reader's eye already is.
- **Assignee tracking**: the issue's native assignee field.

## Label Formatting

Labels (and tags in Azure DevOps) are applied to maps and tickets based on
resolved configuration from `jl-config` (see SKILL.md Configuration section).

### Label Application on Map Creation

When a map is created, apply the resolved `labels.map` configuration (or
`labels.default` if `labels.map` is not configured):

1. **Resolve configuration**: Read `jl_recon.labels` from CONTRIBUTING.md and
   AGENTS.md using jl-config resolution. Start with defaults (`labels.default`
   = `["recon:map"]`), apply CONTRIBUTING.md overrides, then AGENTS.md
   overrides.
2. **Check for user session preference**: If the user provided a label override
   during this session (e.g., "use these labels instead"), use that set
   entirely; it replaces the configured labels (not additive).
3. **Determine map labels**: Use `labels.map` if configured, otherwise fall back
   to `labels.default`.
4. **Apply to map**: Create the map issue/work item/document with the resolved
   label set.

### Label Application on Ticket Creation

When a ticket is created as a child of a map, resolve its labels using the
same configuration pipeline described for map creation and the same additive
inheritance rule described in issue #153 (Map Label Application). The ticket
label formula is:

```text
Ticket Labels = Configured Type Labels + Inherited Map Labels + recon:<type>
```

Configuration resolution for `Configured Type Labels` follows the same
precedence described in issue #152 (Config Resolution): defaults first, then
CONTRIBUTING.md, then AGENTS.md, with any session-level user override applied
last.

#### Resolution Order

Apply ticket labels in this order:

1. **Start with configured labels for the ticket type**: Read
   `jl_recon.labels.<type>` for the ticket's type (`quiz`, `research`,
   `prototype`, or `task`). If that type-specific key is not configured, fall
   back to `labels.default`.
2. **Add inherited labels from the parent map**: Copy every label the map
   already carries. This is additive, not a replacement. If the map was
   created from configured labels, those created labels are what the ticket
   inherits.
3. **Add the ticket's required recon label**: Append the ticket's own
   `recon:<type>` label.
4. **De-duplicate**: Treat the final label set as a set union. If the same
   label appears in the type configuration, the map, and/or the required
   `recon:<type>` label, apply it once.
5. **Apply user override if present**: If the user provided a label override
   for this ticket during the current session, that override replaces the
   entire computed set. It is not additive.

#### Ticket Type Mapping

Each ticket type always receives its own dedicated `recon:<type>` label:

- **Quiz** → `recon:quiz`
- **Research** → `recon:research`
- **Prototype** → `recon:prototype`
- **Task** → `recon:task`

#### Inheritance Behavior

**Labels are inherited, not replaced.** Ticket labels are always additive
unless the user explicitly provides a session-level override for that specific
ticket creation action.

In practical terms:

- Keep the configured labels for the ticket type
- Keep the labels already present on the map
- Add the ticket's required `recon:<type>` label
- Remove duplicates

This means inheritance respects both configured and inherited sets. The map's
labels do not replace the type's labels, and the type's labels do not replace
the map's labels.

#### Type-by-Type Examples

##### Quiz Tickets

```text
Ticket Labels = jl_recon.labels.quiz + map labels + recon:quiz
```

Example:

- `jl_recon.labels.quiz = ["type:question", "needs-answer"]`
- Map labels = `["recon:map", "area:auth"]`
- Final set = `["area:auth", "needs-answer", "recon:map", "recon:quiz", "type:question"]`

##### Research Tickets

```text
Ticket Labels = jl_recon.labels.research + map labels + recon:research
```

Example:

- `jl_recon.labels.research = ["type:research", "recon-output"]`
- Map labels = `["recon:map", "area:billing"]`
- Final set = `["area:billing", "recon-output", "recon:map", "recon:research", "type:research"]`

##### Prototype Tickets

```text
Ticket Labels = jl_recon.labels.prototype + map labels + recon:prototype
```

Example:

- `jl_recon.labels.prototype = ["type:prototype", "spike"]`
- Map labels = `["recon:map", "area:editor"]`
- Final set = `["area:editor", "recon:map", "recon:prototype", "spike", "type:prototype"]`

##### Task Tickets

```text
Ticket Labels = jl_recon.labels.task + map labels + recon:task
```

Example:

- `jl_recon.labels.task = ["type:task", "decision-unblocker"]`
- Map labels = `["recon:map", "priority:high"]`
- Final set = `["decision-unblocker", "priority:high", "recon:map", "recon:task", "type:task"]`

#### Configuration Examples

Example `CONTRIBUTING.md` configuration:

```yaml
jl_recon:
  labels:
    default: ["recon:map"]
    map: ["recon:map", "planning"]
    quiz: ["type:question", "needs-answer"]
    research: ["type:research", "recon-output"]
    prototype: ["type:prototype", "spike"]
    task: ["type:task", "decision-unblocker"]
```

Example `AGENTS.md` override:

```yaml
jl_recon:
  labels:
    research: ["type:research", "recon-output", "team:platform"]
```

With the configuration above, a Research ticket under a map labeled
`["recon:map", "planning"]` resolves as:

```text
["planning", "recon:map", "recon-output", "recon:research", "team:platform", "type:research"]
```

#### Determinism and Consistency

- Treat label computation as a set union.
- If a label is duplicated across configured labels, inherited map labels, or
  `recon:<type>`, apply it once.
- Preserve deterministic behavior by resolving the same inputs to the same
  label set every time.
- When passed through the GitHub CLI, labels may appear sorted
  alphabetically in output and UI-adjacent tooling; document examples in
  alphabetical order for consistency.
- Azure DevOps and markdown providers should still use the same logical set,
  even if display order differs by provider.

#### Acceptance Criteria

- [x] Ticket labels = configured labels (for type) + inherited map labels +
      `recon:<type>` label
- [x] Label inheritance respects both configured and inherited sets
      (additive, not replacement)
- [x] Works for all four ticket types (quiz, research, prototype, task)

### Per-Provider Application Details

#### GitHub

**Map creation**:

```bash
gh issue create --repo <owner>/<repo> \
  --title "<map title>" \
  --body "<map body>" \
  --label <label1> --label <label2> ... \
  --web  # or use --assignee <user> to set assignee
```

Resolved labels from configuration become the `--label` arguments. All
configured labels must be created in the repository first; if a label does not
exist, `gh issue create` will fail. Handle missing labels gracefully (warn and
skip, or auto-create if the repository allows it).

**Ticket creation** (as sub-issue):

```bash
gh issue create --repo <owner>/<repo> \
  --title "<ticket title>" \
  --body "<ticket body>" \
  --label <resolved_label_1> --label <resolved_label_2> ... \
  --label "recon:<type>"
```

Where `<resolved_label_1>` etc. are the union of configured type labels +
inherited map labels.

#### Azure DevOps

Azure DevOps mirrors the same logical label-resolution rules as GitHub, but
serializes the final logical set as Azure DevOps tags.

##### Azure DevOps Tag Application

Azure DevOps uses the same `jl_recon.labels.*` configuration as GitHub. The
difference is only the provider-specific representation:

- GitHub stores the resolved values as labels
- Azure DevOps stores the same resolved values as tags

Tags in Azure DevOps are free-form strings; they do not require pre-creation.
When passing multiple tags to the CLI, Azure DevOps uses semicolon separation
(`;`), not commas.

##### Map Tag Application

**Tag resolution formula**:

```text
Map Tags = Configured Map Labels (from jl_recon.labels.map or jl_recon.labels.default)
```

As with GitHub labels, the map receives the configured map/default label set.
For determinism, sort the resolved tags alphabetically before serialization.

**Creation syntax**:

```powershell
az boards work-item create \
  --org <org> --project <project> \
  --title "<title>" --description "<desc>" \
  --type "Issue" \
  --tags "tag1;tag2;tag3"
```

**Configuration example**:

```yaml
jl_recon:
  labels:
    map:
      - "recon:map"
      - "planning"
```

Resolved map tags:

```text
["planning", "recon:map"] -> "planning;recon:map"
```

**Azure DevOps search example**:

```text
[System.Tags] Contains "recon:map"
```

##### Ticket Tag Application

**Tag resolution formula**:

```text
Ticket Tags = Configured Type Tags + Inherited Map Tags + recon:<type>
```

This matches the GitHub label logic exactly; only the final serialization
differs.

**Resolution order**:

1. Start with configured labels for the ticket type (from `jl_recon.labels.<type>`)
2. Add inherited tags from the parent map
3. Add the `recon:<type>` tag (`recon:quiz`, `recon:research`, `recon:prototype`, `recon:task`)
4. De-duplicate (set union)
5. Sort alphabetically for determinism
6. Apply user override if provided (replace the entire set)

**Tag serialization**:

Convert the final logical set into Azure DevOps's semicolon-separated tag
format.

```text
["area:auth", "recon:map", "recon:research", "type:research"]
-> "area:auth;recon:map;recon:research;type:research"
```

**Ticket creation syntax**:

```powershell
az boards work-item create \
  --org <org> --project <project> \
  --title "<title>" --description "<desc>" \
  --type "Task" \
  --parent <map_work_item_id> \
  --tags "resolved_tag1;resolved_tag2;recon:research"
```

Then link it to the parent using `--parent` flag or:

```powershell
az boards work-item relation add \
  --id <ticket_id> \
  --relation-type "parent" \
  --target-id <map_work_item_id>
```

**Type-by-type examples**:

- **Quiz**:

  ```text
  jl_recon.labels.quiz = ["type:question", "needs-answer"]
  map tags = ["recon:map"]
  resolved tags = "needs-answer;recon:map;recon:quiz;type:question"
  ```

- **Research**:

  ```text
  jl_recon.labels.research = ["type:research", "recon-output"]
  map tags = ["recon:map"]
  resolved tags = "recon-output;recon:map;recon:research;type:research"
  ```

- **Prototype**:

  ```text
  jl_recon.labels.prototype = ["type:prototype", "spike"]
  map tags = ["recon:map"]
  resolved tags = "recon:map;recon:prototype;spike;type:prototype"
  ```

- **Task**:

  ```text
  jl_recon.labels.task = ["type:task", "implementation"]
  map tags = ["recon:map"]
  resolved tags = "implementation;recon:map;recon:task;type:task"
  ```

##### Azure DevOps Tag Query Examples

Use Azure DevOps tag queries the same way you would search GitHub labels, but
against `[System.Tags]`.

- Find all recon maps:

  ```text
  [System.Tags] Contains "recon:map"
  ```

- Find all research tickets:

  ```text
  [System.Tags] Contains "recon:research"
  ```

- Find all tickets under planning maps:

  ```text
  [System.Tags] Contains "planning"
  AND (
    [System.Tags] Contains "recon:quiz"
    OR [System.Tags] Contains "recon:research"
    OR [System.Tags] Contains "recon:prototype"
    OR [System.Tags] Contains "recon:task"
  )
  ```

##### Important Notes

- **Tag sharing**: Azure DevOps uses the same `jl_recon.labels.*` configuration
  as GitHub. Tags are the provider-specific representation of labels.
- **Free-form tags**: unlike GitHub labels, Azure DevOps tags do not require
  pre-creation.
- **Semicolon separation**: Azure DevOps uses `;` rather than `,` for multiple
  tags.
- **Determinism**: sort tags alphabetically for consistent ordering.
- **Inheritance**: same additive inheritance as GitHub — map tags are added to
  ticket type tags, not replaced.

##### Acceptance Criteria

- [ ] Map work item receives resolved tag set
- [ ] Tickets receive configured tags + inherited map tags
- [ ] Tag inheritance works as documented in PROVIDERS.md

#### Markdown

Markdown uses the same label resolution logic as GitHub and Azure DevOps. The
provider difference is only how the resolved set is recorded: markdown stores
the final, deterministic label set in YAML frontmatter and may also repeat it
in the body for human readability.

##### Map label recording

Maps receive the resolved map label set:

```text
Map Labels = resolved jl_recon.labels.map
          or resolved jl_recon.labels.default when labels.map is not configured
```

Use the same configuration resolution pipeline described above:

1. Start with defaults
2. Apply `CONTRIBUTING.md` overrides
3. Apply `AGENTS.md` overrides
4. Apply any session-level user override last

Example configuration:

```yaml
jl_recon:
  labels:
    default: ["recon:map"]
    map: ["recon:map", "planning"]
```

Resolved map labels are recorded in the map frontmatter as a flat YAML list.
Keep examples sorted alphabetically for determinism.

Inline format:

```yaml
---
title: "Authentication Recon Map"
labels: ["planning", "recon:map"]
---
```

Multiline format:

```yaml
---
title: "Authentication Recon Map"
labels:
  - "planning"
  - "recon:map"
---
```

The map template includes a `labels:` field which is populated at map creation
time with this resolved set.

##### Ticket label recording

Tickets use the same additive inheritance formula as the GitHub and Azure
DevOps providers:

```text
Ticket Labels = Configured Type Labels + Inherited Map Labels + recon:<type>
```

Resolution order:

1. Start with `jl_recon.labels.<type>` for the ticket type (`quiz`,
   `research`, `prototype`, `task`), or `labels.default` if the type-specific
   key is not configured.
2. Add every label already present on the parent map.
3. Add the required `recon:<type>` label.
4. De-duplicate.
5. Sort alphabetically before writing YAML examples and generated markdown.

Example configuration:

```yaml
jl_recon:
  labels:
    default: ["recon:map"]
    map: ["recon:map", "planning"]
    quiz: ["needs-answer", "type:question"]
    research: ["recon-output", "type:research"]
    prototype: ["spike", "type:prototype"]
    task: ["decision-unblocker", "type:task"]
```

Expected ticket frontmatter format:

Inline format:

```yaml
---
title: "Verify auth refresh token rotation"
labels: ["needs-answer", "planning", "recon:map", "recon:quiz", "type:question"]
parent: "docs/plans/authentication-recon-map.md"
---
```

Multiline format:

```yaml
---
title: "Verify auth refresh token rotation"
labels:
  - "needs-answer"
  - "planning"
  - "recon:map"
  - "recon:quiz"
  - "type:question"
parent: "docs/plans/authentication-recon-map.md"
---
```

##### Type-by-type examples

Quiz ticket:

```text
Configured Type Labels = ["needs-answer", "type:question"]
Inherited Map Labels   = ["planning", "recon:map"]
Required Type Label    = ["recon:quiz"]
Final Labels           = ["needs-answer", "planning", "recon:map", "recon:quiz", "type:question"]
```

Research ticket:

```text
Configured Type Labels = ["recon-output", "type:research"]
Inherited Map Labels   = ["planning", "recon:map"]
Required Type Label    = ["recon:research"]
Final Labels           = ["planning", "recon-output", "recon:map", "recon:research", "type:research"]
```

Prototype ticket:

```text
Configured Type Labels = ["spike", "type:prototype"]
Inherited Map Labels   = ["planning", "recon:map"]
Required Type Label    = ["recon:prototype"]
Final Labels           = ["planning", "recon:map", "recon:prototype", "spike", "type:prototype"]
```

Task ticket:

```text
Configured Type Labels = ["decision-unblocker", "type:task"]
Inherited Map Labels   = ["planning", "recon:map"]
Required Type Label    = ["recon:task"]
Final Labels           = ["decision-unblocker", "planning", "recon:map", "recon:task", "type:task"]
```

##### Optional body note

For readability, optionally repeat the resolved labels near the top of the
ticket body. This is recommended, but not required, because the frontmatter is
the source of truth.

```markdown
**Labels:** needs-answer, planning, recon:map, recon:quiz, type:question

**Blocked by:** [Auth token storage decision](auth-token-storage-decision.md)
```

The `**Labels:**` line may appear before or alongside other metadata notes such
as `**Blocked by:**`.

##### Acceptance Criteria

- [ ] Map frontmatter includes `labels:` field with resolved label set
- [ ] Tickets include `labels:` frontmatter + optional body note
- [ ] Label format matches examples in PROVIDERS.md

## Azure DevOps

### Checking for Existing Maps (Azure DevOps)

**The map is always a child of the inciting issue.** If the user provided an
inciting issue, check it first. Note: Azure DevOps has no native "sub-issue"
concept like GitHub. Maps are parent work items with a parent/child link to
the inciting work item.

**Step 1: Inciting-issue check** (if provided)

- Query work items linked as children to the inciting issue:

  ```bash
  az boards query --wiql 'SELECT [System.Id], [System.Title] FROM WorkItems 
    WHERE [System.Parent] = "<inciting_issue_id>"' \
    --org <org> --project <project>
  ```

- Filter for work items with the `recon:map` tag.
- If found, confirm with the user whether to reuse it.

**Step 2: Title + tag search** (if inciting issue not provided, or no map found under it)

- Query work items by title and tag:

  ```bash
  az boards query --wiql 'SELECT [System.Id], [System.Title] FROM WorkItems 
    WHERE [System.Title] Contains "<destination>" 
    AND [System.Tags] Contains "recon:map"' \
    --org <org> --project <project>
  ```

**Step 3: Variant search** (if Steps 1–2 found nothing)

- Area path search: if maps are stored in a specific area path (e.g., "Project/Recon"),
  search there first
- Tag-based search: look for `recon:map` tag regardless of title
- Show user recently-updated recon:map work items as possible variants

**If found:** Ask user whether to reuse the existing map or create a new one.

### Provider Implementation Details (Azure DevOps)

- **Map**: a parent work item.
- **Inciting issue link**: the map is always a **child** of the inciting work item
  using Azure DevOps's native parent/child link type — the map becomes a
  child of the inciting work item even though the map itself is also a
  parent to its own tickets. This nesting is expected and is how Azure
  Boards' hierarchy is meant to be used. If the inciting work item cannot
  take a child link (e.g. it's already at the bottom of the configured
  hierarchy), use a "Related" link instead and say so in the map's
  description.
- **Tickets**: child work items, linked natively. Copy every tag the parent
  work item carries onto each new ticket. Once a ticket-type tag exists (see
  below), add it on top of the copied tags rather than replacing them.
- **Decisions-so-far**: same single-list rule as GitHub, in the parent work
  item's description.
- **Ticket type**: no dedicated field yet. A tag will be created once real
  usage surfaces the need — do not design this speculatively ahead of that.
- **Blocking**: Azure DevOps's native predecessor/successor or
  "blocked by" link type, plus the same short reason note in the work item
  description.
- **Assignee tracking**: the work item's native `Assigned To` field.

## Markdown-only

### Checking for Existing Maps (Markdown)

**The map is always a child of the inciting issue.** If the user provided an
inciting issue, check for maps referencing it in their frontmatter first.
Note: Markdown maps are not indexed centrally. This check requires scanning
the configured storage directory.

**Step 1: Inciting-issue check** (if provided)

- Scan the configured storage directory (from `file_storage_location` config)
- Parse frontmatter of all `.md` files
- Look for `inciting-issue: <id>` field matching the provided inciting issue
- If found, confirm with the user whether to reuse it.

**Step 2: Frontmatter + destination scan** (if inciting issue not provided, or no map found)

- Scan all `.md` files in storage directory
- Parse frontmatter and look for `type: recon-map` and matching `destination` field
- Filter for maps whose destination contains destination keywords

**Step 3: Filename pattern search** (if Steps 1–2 found nothing)

- Search for common filename patterns: `recon-*.md`, `map-*.md`, `*-map.md`
- Match against slug version of destination name (lowercase, hyphens instead of spaces)

**Performance note:** Markdown maps are not indexed centrally. For large
repositories with many plans/maps, the scan may take time. Consider indexing
strategies if performance becomes an issue.

**If found:** Ask user whether to reuse the existing map or create a new one.

### Provider Implementation Details (Markdown)

- **Map**: a markdown document built from
  [`assets/recon-map-template.md`](../assets/recon-map-template.md),
  which extends `jl-plan-template`'s base template.
- **Inciting issue link**: markdown has no native parent/child link, so
  record it explicitly — a `inciting-issue:` frontmatter field pointing at
  the issue/work item/document, plus a linked-by-name reference in the map's
  Notes section (e.g. "Charted because [Original issue name](link) turned
  out too big for one session"). Both the frontmatter field and the Notes
  line are needed: frontmatter for machine lookup, the Notes line for a
  human reading the rendered document.
- **Tickets**: individual markdown documents, one per ticket, alongside the
  map. No native label/tag concept to copy — the ticket type frontmatter
  field below is the only classification a markdown ticket carries.
- **Decisions-so-far**: same single-list rule, as a section in the map
  document.
- **Ticket type**: a YAML frontmatter field, e.g. `type: research`. Fixed at
  creation like every other provider — never rewritten because a quiz
  surfaced mid-ticket.
- **Blocking**: a frontmatter field, e.g. `blocked-by: [ticket-slug]`, plus
  the same short reason note in the document body.
- **Assignee tracking**: a frontmatter field, e.g. `assignee:`, or a short
  note in the body if no assignee concept fits the session.
