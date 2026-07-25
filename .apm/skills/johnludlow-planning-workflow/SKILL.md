# johnludlow-planning-workflow

Single source of truth for all planning workflow logic — consolidated BLOCKERs,
preference resolution, and completion criteria shared by johnludlow-planner and
johnludlow-feature-planner agents.

## Overview

This skill eliminates duplication of ~1000 lines of decision-gate logic across
two planning agents. Both agents reference this skill instead of duplicating
the workflow, ensuring consistency. Changes to workflow apply everywhere
automatically.

## The Four BLOCKERs

Every planning session must resolve these gates in order before proceeding to
Planning Steps.

### ✓ BLOCKER 0: Template Compliance

**Objective:** Verify that templates exist and are appropriate for this planning
session.

**Gate logic:**

1. Load `johnludlow-plan-template` skill to access canonical template
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

1. Invoke `johnludlow-quiz` skill in Mode A (in-chat interview) or Mode B
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

1. Consult `johnludlow-issue-management` skill for provider-specific guidance
   (GitHub, Azure DevOps, local files)
2. Verify that the selected provider matches repository guidance
   (CONTRIBUTING.md, AGENTS.md)
3. If no repository guidance: ask user and offer to record preference
4. Verify that user has approved any provider-native write actions (creating
   issues, work items, etc.)

**Completion criterion:** Plan target is confirmed and provider-specific
approval (if needed) is documented.

---

### ✓ BLOCKER 3: Issue Workflow

**Objective:** If the plan target is a provider-native artifact (GitHub issue,
Azure DevOps work item), confirm the workflow.

**Gate logic:**

1. Consult `johnludlow-issue-management` skill for provider workflow
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

After all four BLOCKERs are resolved, validate:

1. Template matches selected plan target format
2. Shared understanding is complete (objective + all decisions)
3. Plan target is accessible (file paths exist, issue creation API available,
   etc.)
4. Provider workflow is approved

## Completion

All four BLOCKERs resolved and validated. Ready to proceed to Planning Steps
(which live in the calling agent, not in this skill).

## Related

- Both `johnludlow-planner` and `johnludlow-feature-planner` agents
  reference this skill
- This skill depends on `johnludlow-quiz`, `johnludlow-issue-management`,
  and `johnludlow-plan-template` skills
- `johnludlow-adversarial-review` skill is invoked after planning completes
  (in Planning Step 7 of calling agent)
