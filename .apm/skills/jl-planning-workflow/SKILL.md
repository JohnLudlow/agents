---
name: jl-planning-workflow
description: "Single source of truth for planning workflow logic — BLOCKERs, preference resolution, and completion criteria shared by jl-planner and jl-feature-planner agents."
---

# jl-planning-workflow

Single source of truth for all planning workflow logic — consolidated BLOCKERs,
preference resolution, and completion criteria shared by jl-planner and
jl-feature-planner agents.

## Overview

This skill eliminates duplication of ~1000 lines of decision-gate logic across
two planning agents. Both agents reference this skill instead of duplicating
the workflow, ensuring consistency. Changes to workflow apply everywhere
automatically.

## The Five BLOCKERs

Every planning session must resolve these gates in order before proceeding to
Planning Steps. (Gates 0–4 are shared across all planning agents; additional
local gates may be defined by calling agents.)

### ✓ BLOCKER 0: Template Compliance

**Objective:** Verify that templates exist and are appropriate for this planning
session.

**Gate logic:**

1. Load `jl-plan-template` skill to access canonical template
   definitions
2. Determine the plan target (markdown document, GitHub issue, Azure DevOps
   work item, inline summary)
3. Verify that a canonical template exists for the target format
4. Confirm with the user that the template matches their expectations

**Completion criterion:** Template source is confirmed (canonical from skill,
or user-provided), and user is satisfied with template coverage.

---

### ✓ BLOCKER 1: Shared Understanding

**Objective:** Reach shared understanding of the planning objective before
proceeding.

**Gate logic:**

1. Invoke `jl-quiz` skill in Mode A (in-chat interview) or Mode B
   (questionnaire document) based on scope/complexity/shared understanding
2. Quiz resolves all open decisions about the planning target (scope,
   audience, acceptance criteria, constraints, etc.)
3. Quiz BLOCKER 0 (Preference Resolution) handles setup questions about
   output destination and file storage location — do not re-ask these
4. When quiz is complete, restate objective + resolved decisions for
   confirmation before proceeding

**Completion criterion:** Objective is stated, all open decisions are resolved
and confirmed by user, shared understanding is explicitly reached.

---

### ✓ BLOCKER 2: Plan Target Selection

**Objective:** Confirm where the plan will live (GitHub issue, local file,
Azure DevOps work item, inline message).

**Gate logic:**

1. Consult `jl-issue-management` skill for provider-specific guidance
   (GitHub, Azure DevOps, local files)
2. Verify that the selected provider matches repository guidance
   (CONTRIBUTING.md, AGENTS.md)
3. If no repository guidance: ask user and offer to record preference
4. Verify that user has approved any provider-native write actions (creating
   issues, work items, etc.)
5. If local file selected: carry forward file storage preference from quiz
   BLOCKER 0 (which may be documented or user-stated)

**Completion criterion:** Plan target is confirmed and provider-specific
approval (if needed) is documented.

---

### ✓ BLOCKER 3: Local File Path Confirmation (if applicable)

**Objective:** If the plan target is a local file, confirm the exact file path
and verify the directory exists or is creatable.

**Gate logic:**

1. If plan target is not a local file: skip this BLOCKER
2. If plan target is a local file:
   - Use file storage preference from quiz BLOCKER 0 as starting point
   - Confirm the concrete file path with user (e.g., "docs/plans/auth.md")
   - Verify that the directory exists or can be created
   - If user modifies path: offer to record new preference for future sessions

**Completion criterion:** Concrete file path is confirmed and directory is
accessible.

---

### ✓ BLOCKER 4: Issue Workflow

**Objective:** If the plan target is a provider-native artifact (GitHub issue,
Azure DevOps work item), confirm the workflow.

**Gate logic:**

1. Consult `jl-issue-management` skill for provider workflow
   guidance (labeling, linking, child-issue creation, etc.)
2. Verify that the workflow matches repository conventions
3. If repository guidance is missing or unclear: surface the gap and prepare
   content the top-level planner can use to resolve it
4. If user workflow preferences differ from repository guidance: pause for
   confirmation before proceeding with non-standard workflow

**Completion criterion:** Issue workflow is confirmed, and any deviations from
repository guidance are explicitly acknowledged.

---

## Preference Resolution (Applied During BLOCKER 1)

When the quiz skill invokes BLOCKER 0 (Preference Resolution), these
preferences MUST be resolved:

- **Output destination:** GitHub issue, Azure DevOps work item, local file,
  or inline message?
- **File storage location (if local file):** Which directory should files
  live in?

**Logic:** Check CONTRIBUTING.md and AGENTS.md first. If not found, ask
user. Always offer to record preferences for future sessions.

## Post-BLOCKER Validation

After all five BLOCKERs are resolved, validate:

1. Template matches selected plan target format
2. Shared understanding is complete (objective + all decisions)
3. Plan target is accessible (file paths exist, issue creation API available,
   etc.)
4. Provider workflow is approved

## Completion

All five BLOCKERs resolved and validated. Ready to proceed to Planning Steps
(which live in the calling agent, not in this skill).

## Related

- Both `jl-planner` and `jl-feature-planner` agents
  reference this skill
- This skill depends on `jl-quiz`, `jl-issue-management`,
  and `jl-plan-template` skills
- `jl-adversarial-review` skill is invoked after planning completes
  (in Planning Step 7 of calling agent)
