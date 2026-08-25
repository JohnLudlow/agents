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

When a ticket is created as a child of a map, apply labels in three stages
(additive, not replacement):

1. **Configured type labels**: Use the resolved labels for the ticket's type
   (e.g., `labels.quiz` for a Quiz ticket). If not configured, use
   `labels.default`.
2. **Inherited map labels**: Copy every label the map carries. If this is the
   first ticket created for a map, the map's labels come from step 1 above
   (usually `labels.map` or `labels.default`).
3. **Ticket type label**: Add the ticket's own `recon:<type>` label
   (`recon:quiz`, `recon:research`, `recon:prototype`, `recon:task`).

**Result**: A ticket receives the union of (configured type labels +
inherited map labels + `recon:<type>` label). Labels do not duplicate if the
same label appears in multiple sets.

**User override**: If the user provides a label override during ticket
creation, use that set entirely; it replaces the configured labels (stages 1
and 3 above still apply with their full sets, but stage 2 — map inheritance —
is skipped when user override is active).

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

**Map creation**:
```bash
az boards work-item create \
  --title "<map title>" \
  --description "<map body>" \
  --type "Issue" \
  --org <org> --project <project> \
  --area-path "<area>" --iteration-path "<iteration>" \
  --tags "<tag1>;<tag2>;..."
```

Resolved labels from configuration become semicolon-separated tags. Tags in
Azure DevOps are free-form strings; they do not require pre-creation.

**Ticket creation** (as child work item):
```bash
az boards work-item create \
  --title "<ticket title>" \
  --description "<ticket body>" \
  --type "Task"  # or other work-item type \
  --org <org> --project <project> \
  --parent <map_work_item_id> \
  --tags "<resolved_tags>;<recon:type>"
```

Then link it to the parent using `--parent` flag or:
```bash
az boards work-item relation add \
  --id <ticket_id> \
  --relation-type "parent" \
  --target-id <map_work_item_id>
```

#### Markdown

**Map creation**:

Create a markdown file from the recon-map template (`.apm/skills/jl-recon/assets/recon-map-template.md`)
with frontmatter:

```yaml
---
title: "<map title>"
labels:
  - "<label1>"
  - "<label2>"
  - ...
---

<map body>
```

The `labels:` field is an array of strings representing the resolved label set.

**Ticket creation** (as separate markdown file, or inline if markdown does not
support sub-issues):

Create a markdown file with frontmatter:

```yaml
---
title: "<ticket title>"
labels:
  - "<resolved_label_1>"
  - "<resolved_label_2>"
  - ...
  - "recon:<type>"
parent: "<map file or identifier>"
---

<ticket body>
```

For readability, optionally include a body-level note:

```markdown
**Labels:** recon:quiz, planning, high-priority

**Blocked by:** [Title of blocking ticket](link)
```

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
